# Catálogo de procedimentos

## Fluxo implementado

Rota `/procedimentos`, protegida pela autenticação existente, com acesso no menu e página inicial. Lista ativos inicialmente; busca por nome, filtro por categoria e situação, paginação de 20 itens. Cadastro e edição na própria página. Desativação/reativação exigem confirmação explícita; cancelar não envia alteração.

Campos: nome, descrição, preço em reais, duração em minutos, categoria. Nome/preço/duração obrigatórios; categoria livre com sugestões existentes, descrição/categoria opcionais. Erros preservam o formulário. Nome único e limites são validados também pelo backend.

O seletor do financeiro busca procedimentos ativos por nome com paginação. Seleção sugere preço, troca aplica a nova sugestão e o usuário pode alterar o valor cobrado. Envio contém `procedimentoId`, não texto livre. Sem seleção não há envio. Erro 400/404 limpa a seleção e atualiza o catálogo; sucesso limpa o formulário. Os relatórios continuam usando nome e valor históricos.

`useProcedimentos` controla consultas e descarta respostas de consultas canceladas para que filtros antigos não sobrescrevam novos resultados.

## Testes

Vitest + Testing Library, com jsdom e interações do usuário. A API é simulada nos testes de interface; contratos reais e migração são testados no backend.

| Cenário | Resultado esperado |
|---|---|
| Cadastro válido com categoria nova | Envia POST, mostra sucesso e atualiza lista |
| Obrigatórios ausentes, preço negativo, duração fracionária | Navegador bloqueia envio |
| Edição com nome duplicado | Mostra erro e preserva valores; permite corrigir |
| Desativar/cancelar/confirmar e reativar | Só envia PUT após confirmação e atualiza situação |
| Filtros e paginação | Mantém filtros na URL da API e mostra página/lista vazia corretamente |
| Falha de rede | Mostra erro com opção de nova tentativa |
| Selecionar/trocar procedimento | Preenche/substitui sugestão de preço |
| Ajustar preço e lançar | Envia ID e valor escolhido; sucesso limpa seleção |
| Catálogo vazio ou falha inicial | Orienta gerenciar/tentar novamente e bloqueia lançamento |
| Procedimento desativado antes do envio | Erro limpa seleção e mantém outros dados |
| Procedimento em outra página | Pode ser selecionado e sugere preço normalmente |

Comandos no diretório do frontend:

```bash
npm test
npm run lint
npm run build
```

`npm test` executa toda a suíte de interface uma vez. `npm run lint` verifica problemas estáticos sem corrigir arquivos. `npm run build` gera a compilação de produção em `dist`. Para desenvolvimento de testes, `npm run test:watch` reexecuta os testes conforme os arquivos mudam.

## Contratos e entrega

A documentação completa está em `Documentação Backend/API.md`; regras de banco/transações e teste de migração estão em `Meu-Studio-Server/docs/catalogo-procedimentos.md`. Publicar frontend e backend de forma coordenada e atualizar sessões abertas: o backend passa a exigir `procedimentoId` em novos lançamentos. Não houve publicação nesta implementação.

## Resultado da validação — 12/09/2026

- 13 testes de interface aprovados em dois arquivos, sem falhas.
- Lint e build de produção aprovados.
- Backend: 37 testes aprovados, incluindo autenticação/CSRF, integração financeira e migração com dados anteriores.
- Ambiente verificado com Node 24. As dependências de testes requerem Node 22.14+ ou 24+; usar Node 24 para reproduzir a execução desta sessão.
- Inspeção visual pendente: a ferramenta de navegação não encontrou navegador disponível. Os testes de interface usam jsdom e não substituem uma inspeção visual em navegador.
- Instalação npm precisou de seleção temporária de um endereço IPv4 do registro devido a timeouts. O ajuste ficou em `/tmp`, preservou TLS e não alterou configurações do sistema ou do projeto.
