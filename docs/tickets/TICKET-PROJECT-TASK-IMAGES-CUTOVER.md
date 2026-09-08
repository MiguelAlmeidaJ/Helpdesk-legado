# 0044c4 — imagens de tarefas de projeto

O `0044c4` migra o boundary de `imagens_tarefa` para a API Nest sem alterar nem
apagar os endpoints PHP ainda usados pela UI legada.

## Endpoints nativos

| Comportamento legado | API nativa |
| --- | --- |
| leitura embutida em `atd_projeto/tarefa.php` | `GET /tickets/projects/tasks/:taskId/images` |
| `data:image/jpeg;base64,...` na tela PHP | `GET /tickets/projects/tasks/:taskId/images/:imageId/content` |
| `add_image_tarefa.php` | `POST /tickets/projects/tasks/:taskId/images` |
| `edit_image_tarefa.php` | `PUT /tickets/projects/tasks/:taskId/images/:imageId` |
| `delete_image_tarefa.php` | `DELETE /tickets/projects/tasks/:taskId/images/:imageId` |

Upload e substituição usam `multipart/form-data` no campo `file`.

## Formato preservado

A tabela histórica `imagens_tarefa` não possui coluna de MIME type. A própria UI
legada sempre lê o blob como `image/jpeg`, portanto este boundary aceita somente
JPEG real e serve o conteúdo como `image/jpeg`.

Não é criada nova tabela, armazenamento paralelo ou datasource. O blob continua
em `nivel3.imagens_tarefa` até uma eventual decisão explícita de storage.

## Identidade e autorização

Os endpoints PHP recebem `user_id` no POST e o usam diretamente em
`imagens_tarefa.user_id`. A API nativa não aceita identidade do ator no payload:
`user_id` é sempre derivado da sessão autenticada.

Listagem e conteúdo usam o mesmo escopo de leitura das tarefas de projeto.
Adicionar, substituir e excluir exigem `TicketsExecute` e reaplicam no
repositório:

- escopo de cliente para parceiros;
- escopo `Own` quando aplicável;
- restrição histórica do usuário `134`;
- vínculo obrigatório entre `imageId` e `taskId`.

As mutações bloqueiam a tarefa com `FOR UPDATE`; substituição e exclusão também
bloqueiam a imagem antes do write.

## Diferença intencional em relação ao PHP

`edit_image_tarefa.php` permite uma chamada sem novo arquivo e apenas regrava o
blob existente, alterando usuário/data. O endpoint nativo de substituição exige
um JPEG real. Uma atualização sem alteração de conteúdo não é tratada como
comando de domínio.

## O que ainda permanece no 0044c

Este corte não encerra o estágio de escrita da família Tickets. Continuam
pendentes antes do `0044d`:

- ativação automática de projetos/tarefas agendados ainda executada por PHP;
- writes restantes em `atd_facility`;
- writes restantes em `atd_mkt` (dados continuam em `nivel3`);
- writes restantes em `melhorias`;
- parity/cutover dos consumidores PHP destes endpoints.

## Invariantes

1. Nenhum endpoint novo chama PHP.
2. Nenhum código novo depende de `legacy/bridge/`.
3. Nenhum datasource `mkt` é criado.
4. Nenhum `user_id` de ator é aceito do cliente.
5. Nenhum PHP é removido neste patch.

## Validação

```bash
git apply --check 0044c4-ticket-project-task-images.patch
git apply 0044c4-ticket-project-task-images.patch

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```
