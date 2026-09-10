# API — Meu Studio

Documentação para integração do frontend com a API do Meu Studio.

## Informações gerais

| Ambiente | URL base |
|---|---|
| Desenvolvimento | `http://localhost:9000` |
| Produção | Definida pela infraestrutura de deploy |

Todas as requisições e respostas com corpo utilizam JSON:

```http
Content-Type: application/json
Accept: application/json
```

As datas seguem o formato ISO `YYYY-MM-DD`, por exemplo `2026-09-10`.

## Autenticação, sessão e CSRF

A API usa autenticação baseada em sessão, armazenada no cookie `JSESSIONID`. Não existe token JWT.

O frontend deve usar `credentials: "include"` em **todas** as chamadas para enviar e receber os cookies da API:

```ts
fetch("http://localhost:9000/clientes", {
  credentials: "include",
});
```

### Proteção CSRF

As chamadas que alteram dados (`POST`, `PUT` e `DELETE`) precisam enviar um token CSRF no header `X-XSRF-TOKEN`.

O fluxo recomendado é:

1. Chamar `GET /auth/csrf` antes do login.
2. Enviar o token no `POST /auth/login`.
3. Buscar um novo token após o login.
4. Enviar o token em todas as chamadas `POST`, `PUT` e `DELETE` seguintes.

> Em produção, frontend e API devem usar HTTPS. O CORS da API permite somente a origem configurada em `CORS_ALLOWED_ORIGIN` e aceita credenciais.

## Exemplo de cliente HTTP em TypeScript

```ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:9000";

type CsrfToken = {
  token: string;
  headerName: string;
  parameterName: string;
};

let csrf: CsrfToken | null = null;

export async function atualizarCsrf(): Promise<CsrfToken> {
  const response = await fetch(`${API_URL}/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Não foi possível obter o CSRF: ${response.status}`);
  }

  csrf = await response.json();
  return csrf;
}

export async function chamarApi<T>(
  caminho: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const alteraDados = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (alteraDados && !csrf) {
    await atualizarCsrf();
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (alteraDados && csrf) {
    headers.set(csrf.headerName, csrf.token);
  }

  const response = await fetch(`${API_URL}${caminho}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => null);
    throw new Error(erro?.mensagem ?? `Erro HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

Exemplo de login:

```ts
type LoginRequest = {
  username: string;
  password: string;
};

export async function login(dados: LoginRequest): Promise<void> {
  await atualizarCsrf();

  await chamarApi<Record<string, never>>("/auth/login", {
    method: "POST",
    body: JSON.stringify(dados),
  });

  await atualizarCsrf();
}
```

---

# Endpoints

## Resumo de acesso

| Método | Endpoint | Acesso |
|---|---|---|
| `GET` | `/auth/csrf` | Público |
| `POST` | `/auth/login` | Público, com CSRF |
| `POST` | `/auth/CreateUser` | Somente `ADMIN` |
| `GET` | `/clientes` | `ADMIN` ou `USER` |
| `GET` | `/clientes/{id}` | `ADMIN` ou `USER` |
| `POST` | `/clientes` | `ADMIN` ou `USER` |
| `PUT` | `/clientes/{id}` | `ADMIN` ou `USER` |
| `DELETE` | `/clientes/{id}` | `ADMIN` ou `USER` |
| `POST` | `/financeiro/lancar` | `ADMIN` ou `USER` |

## Autenticação

### Obter token CSRF

```http
GET /auth/csrf
```

**Acesso:** público.

**Resposta `200 OK`:**

```json
{
  "token": "valor-do-token",
  "parameterName": "_csrf",
  "headerName": "X-XSRF-TOKEN"
}
```

Além do JSON, a API envia o cookie `XSRF-TOKEN`. O navegador precisa armazenar esse cookie, portanto a chamada deve usar `credentials: "include"`.

### Realizar login

```http
POST /auth/login
X-XSRF-TOKEN: valor-do-token
```

**Acesso:** público, mas exige CSRF.

**Corpo:**

```json
{
  "username": "usuario",
  "password": "senha"
}
```

| Campo | Tipo | Regras |
|---|---|---|
| `username` | `string` | Obrigatório e não pode estar em branco |
| `password` | `string` | Obrigatório e não pode estar em branco |

**Resposta `200 OK`:**

```json
{}
```

A autenticação é confirmada pela criação do cookie de sessão `JSESSIONID`. A resposta atual não devolve os dados do usuário.

**Possíveis erros:**

- `400 Bad Request`: campos inválidos.
- `401 Unauthorized`: usuário ou senha inválidos.

### Criar usuário

```http
POST /auth/CreateUser
X-XSRF-TOKEN: valor-do-token
```

**Acesso:** somente usuário autenticado com perfil `ADMIN`.

**Corpo:**

```json
{
  "username": "atendente",
  "password": "senha",
  "email": "atendente@studio.com",
  "telefone": "11999999999"
}
```

| Campo | Tipo | Regras |
|---|---|---|
| `username` | `string` | Obrigatório; máximo de 14 caracteres |
| `password` | `string` | Obrigatório; máximo de 20 caracteres |
| `email` | `string` | Obrigatório; deve ser um e-mail válido |
| `telefone` | `string` | Obrigatório |

Novos usuários recebem o perfil `USER` por padrão.

**Resposta `201 Created`:**

```json
{
  "username": "atendente",
  "email": "atendente@studio.com"
}
```

---

## Clientes

Todos os endpoints de clientes exigem uma sessão autenticada com perfil `ADMIN` ou `USER`.

### Estrutura de cliente

```ts
type Cliente = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

type ClienteRequest = {
  nome: string;
  email?: string | null;
  telefone?: string | null;
};
```

Os campos `criadoEm` e `atualizadoEm` são timestamps ISO, por exemplo `2026-09-10T14:30:00`.

### Listar clientes

```http
GET /clientes
```

**Resposta `200 OK`:**

```json
[
  {
    "id": 1,
    "nome": "Maria da Silva",
    "email": "maria@email.com",
    "telefone": "11999999999",
    "criadoEm": "2026-09-10T14:30:00",
    "atualizadoEm": "2026-09-10T14:30:00"
  }
]
```

A listagem atual não possui paginação nem filtros.

### Buscar cliente por ID

```http
GET /clientes/{id}
```

Exemplo:

```http
GET /clientes/1
```

**Resposta `200 OK`:**

```json
{
  "id": 1,
  "nome": "Maria da Silva",
  "email": "maria@email.com",
  "telefone": "11999999999",
  "criadoEm": "2026-09-10T14:30:00",
  "atualizadoEm": "2026-09-10T14:30:00"
}
```

**Possível erro:** `404 Not Found` quando o cliente não existe.

### Criar cliente

```http
POST /clientes
X-XSRF-TOKEN: valor-do-token
```

**Corpo:**

```json
{
  "nome": "Maria da Silva",
  "email": "maria@email.com",
  "telefone": "11999999999"
}
```

| Campo | Tipo | Regras |
|---|---|---|
| `nome` | `string` | Obrigatório; máximo de 120 caracteres |
| `email` | `string` ou `null` | Opcional; se informado, deve ser um e-mail válido com no máximo 160 caracteres |
| `telefone` | `string` ou `null` | Opcional; máximo de 20 caracteres |

**Resposta:** `201 Created` com o cliente criado.

### Atualizar cliente

```http
PUT /clientes/{id}
X-XSRF-TOKEN: valor-do-token
```

O corpo e as validações são os mesmos da criação:

```json
{
  "nome": "Maria Souza",
  "email": "maria.souza@email.com",
  "telefone": "11988888888"
}
```

**Resposta:** `200 OK` com o cliente atualizado.

**Possível erro:** `404 Not Found` quando o cliente não existe.

### Excluir cliente

```http
DELETE /clientes/{id}
X-XSRF-TOKEN: valor-do-token
```

**Resposta:** `204 No Content`, sem corpo.

**Possível erro:** `404 Not Found` quando o cliente não existe.

---

## Financeiro

Os endpoints financeiros exigem uma sessão autenticada com perfil `ADMIN` ou `USER`.

### Realizar lançamento de faturamento

```http
POST /financeiro/lancar
X-XSRF-TOKEN: valor-do-token
```

Registra uma receita já realizada pelo studio.

**Corpo:**

```json
{
  "data": "2026-09-10",
  "cliente": "Maria da Silva",
  "procedimento": "Design de sobrancelhas",
  "valor": 150.00,
  "meioDePagamento": "PIX"
}
```

| Campo | Tipo | Regras |
|---|---|---|
| `data` | `string` | Obrigatória; formato `YYYY-MM-DD`; não pode ser futura |
| `cliente` | `string` | Obrigatório; máximo de 120 caracteres |
| `procedimento` | `string` | Obrigatório; máximo de 160 caracteres |
| `valor` | `number` | Obrigatório; maior que zero; até 10 inteiros e 2 casas decimais |
| `meioDePagamento` | `string` | Obrigatório; máximo de 30 caracteres |

**Resposta `201 Created`:**

```json
{
  "id": "2e942f54-471c-4c62-a5c6-1e877aed0373",
  "data": "2026-09-10",
  "cliente": "Maria da Silva",
  "procedimento": "Design de sobrancelhas",
  "valor": 150.00,
  "meioDePagamento": "PIX"
}
```

Exemplo usando o cliente TypeScript desta documentação:

```ts
type FaturamentoRequest = {
  data: string;
  cliente: string;
  procedimento: string;
  valor: number;
  meioDePagamento: string;
};

type FaturamentoResponse = FaturamentoRequest & {
  id: string;
};

const faturamento = await chamarApi<FaturamentoResponse>(
  "/financeiro/lancar",
  {
    method: "POST",
    body: JSON.stringify({
      data: "2026-09-10",
      cliente: "Maria da Silva",
      procedimento: "Design de sobrancelhas",
      valor: 150.0,
      meioDePagamento: "PIX",
    } satisfies FaturamentoRequest),
  },
);
```

---

# Respostas de erro

## Erro de validação

Quando um DTO possui campos inválidos, a API responde com `400 Bad Request`:

```json
{
  "status": 400,
  "mensagem": "Dados inválidos",
  "erros": {
    "valor": "O valor deve ser maior que zero",
    "cliente": "O campo cliente é obrigatório"
  }
}
```

A propriedade `erros` relaciona o nome do campo à mensagem de validação.

## Regra de negócio

```json
{
  "status": "400",
  "mensagem": "Já existe cliente cadastrado com esse email"
}
```

## Recurso não encontrado

```json
{
  "status": "404",
  "mensagem": "Cliente não encontrado para o id 999"
}
```

## Autenticação e autorização

| Status | Significado comum |
|---|---|
| `401 Unauthorized` | As credenciais enviadas ao endpoint de login estão incorretas |
| `403 Forbidden` | Não existe sessão válida, o perfil não possui acesso ou o token CSRF está ausente/inválido |

O formato do corpo dessas respostas não deve ser usado pelo frontend como contrato de negócio. Use principalmente o status HTTP.

# Observações para o frontend

- Sempre use `credentials: "include"`.
- Obtenha o CSRF antes do login e novamente após autenticar.
- Envie o header CSRF também em requisições `DELETE`, mesmo que elas não tenham corpo.
- Não armazene `JSESSIONID` no `localStorage`; o navegador gerencia esse cookie automaticamente.
- Ao receber `401` no login, informe que o usuário ou a senha são inválidos.
- Ao receber `403`, verifique a sessão, a permissão do usuário e a presença do CSRF. Se a sessão não for mais válida, redirecione para o login.
- O backend ainda não possui endpoint de logout nem endpoint para consultar a sessão/usuário atual.
- O backend ainda não possui endpoint para listar, editar ou excluir faturamentos; atualmente somente o lançamento está disponível.
