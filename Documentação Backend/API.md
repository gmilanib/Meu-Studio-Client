# API — Meu Studio

Documentação para integração do frontend com a API do Meu Studio.

Este arquivo, na raiz do projeto, é a referência principal dos contratos HTTP. Sempre que um endpoint for criado ou alterado, atualize aqui método, rota, acesso, parâmetros, validações, exemplos de requisição e resposta e códigos de erro, para permitir a continuidade da implementação do frontend.

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
| `GET` | `/financeiro/faturamentos` | `ADMIN` ou `USER` |

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
| `username` | `string` | Obrigatório e não pode estar em branco; espaços nas extremidades são removidos |
| `password` | `string` | Obrigatório e não pode estar em branco; espaços não são removidos |

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

No cadastro e na atualização, `email` pode ser omitido ou enviado como `null`/texto em branco. Textos em branco são armazenados como `null`.

Os campos `criadoEm` e `atualizadoEm` são timestamps ISO, por exemplo `2026-09-10T14:30:00`.

### Listar clientes

```http
GET /clientes
```

Os filtros abaixo são opcionais e combinados com **E**. Envie-os na URL, sem corpo. A chamada exige sessão (`credentials: "include"`) e não exige header CSRF.

| Parâmetro | Tipo | Regra |
|---|---|---|
| `nome` | `string` | Trecho literal, sem distinguir maiúsculas e minúsculas |
| `email` | `string` | Trecho literal, sem distinguir maiúsculas e minúsculas |
| `telefone` | `string` | Trecho literal, sem distinguir maiúsculas e minúsculas; não remove a máscara do telefone |
| `criadoEm` | Data ISO | Dia exato de criação, `YYYY-MM-DD` |
| `criadoEmInicio` | Data ISO | Primeiro dia de criação, inclusivo |
| `criadoEmFim` | Data ISO | Último dia de criação, inclusivo |
| `atualizadoEm` | Data ISO | Dia exato da última atualização, `YYYY-MM-DD` |
| `atualizadoEmInicio` | Data ISO | Primeiro dia de atualização, inclusivo |
| `atualizadoEmFim` | Data ISO | Último dia de atualização, inclusivo |
| `page` | Inteiro | Índice iniciado em zero; padrão `0`; mínimo `0` |
| `size` | Inteiro | De `1` a `50`; padrão `50`; valores maiores são rejeitados |

Para cada campo de data, escolha dia único ou intervalo. Os filtros de criação e atualização podem ser combinados entre si. Os intervalos aceitam apenas um limite e incluem todos os horários do último dia. Não envie timestamps nos filtros: embora a resposta contenha horários, os parâmetros aceitam dias `YYYY-MM-DD`, sem conversão de fuso.

Textos em branco são ignorados e espaços nas extremidades são removidos. `%` e `_` são texto literal. Campos nulos de e-mail/telefone não correspondem a um filtro preenchido desses campos.

A consulta é paginada no banco e ordenada por `criadoEm` decrescente, com `id` decrescente como desempate. Sem filtros, lista todos os clientes de forma paginada.

```http
GET /clientes?nome=maria&email=mail&criadoEmInicio=2026-09-01&criadoEmFim=2026-09-11&page=0&size=50
GET /clientes?atualizadoEm=2026-09-11&page=0&size=20
```

**Resposta `200 OK`:**

```json
{
  "content": [
    {
      "id": 1,
      "nome": "Maria da Silva",
      "email": "maria@email.com",
      "telefone": "11999999999",
      "criadoEm": "2026-09-10T14:30:00",
      "atualizadoEm": "2026-09-10T14:30:00"
    }
  ],
  "page": 0,
  "size": 50,
  "totalElements": 1,
  "totalPages": 1
}
```

**Mudança de contrato:** a resposta deixou de ser `Cliente[]`. O frontend deve ler `resposta.content` e usar os metadados para navegar. `size` é o tamanho solicitado; `totalElements` e `totalPages` consideram os filtros. Sem resultados, retorna `content: []` e totais zero. Uma página além da última também retorna `200 OK` com `content: []`.

```ts
type ClientePaginaResponse = {
  content: Cliente[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const filtros = new URLSearchParams({ nome: "maria", page: "0", size: "50" });
const paginaClientes = await chamarApi<ClientePaginaResponse>(`/clientes?${filtros}`);
const clientes = paginaClientes.content;
const temProximaPagina = paginaClientes.page + 1 < paginaClientes.totalPages;
```

Use `URLSearchParams` para codificar os valores, omita filtros não preenchidos e retorne para `page=0` ao alterar a pesquisa.

**Possíveis erros:** `400 Bad Request` para paginação inválida, datas malformadas, intervalo invertido ou dia único combinado com intervalo do mesmo campo; `403 Forbidden` para sessão ausente/inválida ou perfil sem acesso. Conflitos de datas e paginação seguem o formato de regra de negócio, por exemplo:

```json
{
  "status": "400",
  "mensagem": "Informe criadoEm ou seu intervalo, nunca ambos"
}
```

Erros de conversão de parâmetros podem ter corpo diferente; trate também o status HTTP. `GET /clientes/{id}` mantém seu contrato de resposta individual.

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
| `email` | `string` ou `null` | Opcional; quando informado, deve ser um e-mail válido com no máximo 160 caracteres |
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

### Consultar faturamentos

```http
GET /financeiro/faturamentos
```

Retorna `200 OK` com JSON paginado. Exige sessão (`credentials: "include"`); por ser uma leitura `GET`, não exige header CSRF. Os parâmetros são enviados na URL, sem corpo.

Todos os filtros são opcionais e combinados com **E**: cada registro retornado deve atender a todos os filtros informados.

| Parâmetro | Tipo | Regra |
|---|---|---|
| `cliente` | `string` | Busca por trecho, sem distinguir maiúsculas e minúsculas |
| `procedimento` | `string` | Busca por trecho, sem distinguir maiúsculas e minúsculas |
| `valor` | Decimal | Igualdade exata; usar ponto decimal, por exemplo `150.00` |
| `meioDePagamento` | `string` | Igualdade exata, diferenciando maiúsculas e minúsculas |
| `data` | Data ISO | Dia exato, no formato `YYYY-MM-DD` |
| `dataInicio` | Data ISO | Limite inicial inclusivo, no formato `YYYY-MM-DD` |
| `dataFim` | Data ISO | Limite final inclusivo, no formato `YYYY-MM-DD` |
| `page` | Inteiro | Índice iniciado em zero; padrão `0`; deve ser maior ou igual a zero |
| `size` | Inteiro | De `1` a `50`; padrão `50`; valores acima de 50 são rejeitados |

Regras de consulta:

- Use `data` ou o intervalo (`dataInicio`/`dataFim`), nunca ambos.
- O intervalo inclui os dois dias limites. É possível informar somente o início ou somente o fim.
- `dataInicio` não pode ser posterior a `dataFim`.
- Filtros textuais em branco são ignorados; espaços nas extremidades são removidos. `%` e `_` são tratados como texto literal na busca por trechos.
- Sem filtros, retorna os registros paginados. A ordenação é fixa: data decrescente e identificador decrescente como desempate.
- Uma consulta sem resultados ou uma página além da última retorna `200 OK` com `content: []`.
- O filtro `cliente` pesquisa o nome armazenado no lançamento, não um identificador de cliente.

Exemplos de requisição:

```http
GET /financeiro/faturamentos?data=2026-09-10&page=0&size=50
GET /financeiro/faturamentos?cliente=maria&procedimento=design&valor=150.00&meioDePagamento=PIX&dataInicio=2026-09-01&dataFim=2026-09-10&page=0&size=20
```

**Resposta `200 OK`:**

```json
{
  "content": [
    {
      "id": "2e942f54-471c-4c62-a5c6-1e877aed0373",
      "data": "2026-09-10",
      "cliente": "Maria da Silva",
      "procedimento": "Design de sobrancelhas",
      "valor": 150.00,
      "meioDePagamento": "PIX"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

`content` contém os registros da página; `size` é o tamanho solicitado, não a quantidade efetivamente retornada. `totalElements` e `totalPages` consideram os filtros aplicados. Sem nenhum resultado, ambos são zero.

Exemplo usando `chamarApi` e `FaturamentoResponse` definidos acima:

```ts
type FaturamentoPaginaResponse = {
  content: FaturamentoResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const parametros = new URLSearchParams({
  cliente: "maria",
  dataInicio: "2026-09-01",
  dataFim: "2026-09-10",
  page: "0",
  size: "50",
});

const pagina = await chamarApi<FaturamentoPaginaResponse>(
  `/financeiro/faturamentos?${parametros.toString()}`,
);

const temProximaPagina = pagina.page + 1 < pagina.totalPages;
```

No frontend, use `URLSearchParams` para codificar os valores, omita filtros não preenchidos e volte para `page=0` ao mudar os filtros. Trate datas como strings `YYYY-MM-DD`, sem conversão de fuso horário.

**Possíveis erros:**

- `400 Bad Request`: conflito entre data única e intervalo, intervalo invertido, paginação inválida ou parâmetro com formato incompatível (por exemplo, data inválida ou `size=abc`).
- `403 Forbidden`: sessão ausente/inválida ou perfil sem acesso.

Erros das regras de intervalo e paginação seguem o formato de regra de negócio, por exemplo:

```json
{
  "status": "400",
  "mensagem": "Informe data ou intervalo de datas, nunca ambos"
}
```

O corpo de erros de conversão de parâmetros pode diferir desse formato; trate também o status HTTP.

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
- O backend permite lançar e consultar faturamentos; ainda não possui endpoints para editar ou excluir faturamentos.
