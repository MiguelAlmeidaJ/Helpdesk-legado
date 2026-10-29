# Imagens e navegação dos catálogos

## Correções

O 404 de upload e de leitura era causado pela checagem de schema: `TABLE_SCHEMA = DATABASE()` comparava o schema `dbo` com o nome do banco. O serviço agora consulta o objeto `dbo.catalogos` no SQL Server e usa DDL nativo, somente quando `catalog_images` não existe. A tabela existente não é recriada nem alterada.

O ID de um upload é obtido com `INSERT ... OUTPUT INSERTED.id`, na mesma instrução. A consulta separada com `LAST_INSERT_ID()`/`@@IDENTITY` podia usar outra conexão do pool. Uploads concorrentes agora recebem o ID da própria imagem. Os arquivos são gravados com criação exclusiva; falhas nos metadados removem apenas o arquivo recém-criado, preservando os antigos.

As rotas de imagem continuam autenticadas, com autorização por setor ou pelo criador do rascunho ainda sem catálogo. Respostas são privadas, sem cache compartilhado, e usam `nosniff`. A leitura verifica SHA-256. O editor apresenta erros de upload no próprio formulário, com a mensagem da API, mantendo o conteúdo editado.

“Catálogos disponíveis” pode ser recolhido e reaberto por botão com `aria-expanded` e `aria-controls`. A lista recolhe ao visualizar, editar ou criar, e a área do catálogo ocupa toda a largura. Reabrir a lista preserva os campos do editor. Aplicar/limpar filtros reabre a lista; cancelar um cadastro novo também. Conteúdo recolhido fica fora da navegação por teclado.

## Conferência somente leitura — 29/10/2026

- 432 catálogos e 656 imagens registradas.
- 655 arquivos locais encontrados: todos com tamanho e SHA-256 corretos; nenhum arquivo corrompido.
- Um arquivo ausente: imagem ID 2, vinculada ao catálogo ID 1.
- 999 referências HTML: 661 gerenciadas, 23 embutidas, 314 externas e uma relativa.
- Uma referência sem metadados no catálogo ID 1: `/catalog-images/434555`.
- Uma referência relativa no catálogo ID 61: o arquivo não foi localizado no workspace nem nos diretórios de uploads conferidos.

Os arquivos existentes foram preservados. O erro geral de exibição era de acesso, e não uma perda generalizada na migração. As pendências acima exigem localizar os originais ou revisar as referências; não foram substituídas por imagens presumidas nem tiveram seus IDs alterados. URLs externas não foram requisitadas ou exportadas: podem depender da disponibilidade e das permissões do serviço de origem. Não foi executada migração real para a Central de Mídias.

Repetir a conferência: `pnpm catalog:images:audit`. O relatório local fica em `.tmp/catalog-images-audit.json`, sem URLs privadas, conteúdo de imagens ou credenciais. Esse comando não altera arquivos de mídia nem registros.

## Validação

- `pnpm build`: contratos, banco, NestJS e Next.js.
- `pnpm test:catalog:images`: servidor Nest isolado com upload multipart real, leitura, IDs concorrentes, vínculo ao catálogo, permissões 401/403, validação de formato, SHA-256, caminhos e limpeza em falhas. Usa identidades simuladas, tabelas temporárias do SQL Server e um diretório temporário; não escreve em catálogos reais.
- `pnpm test:catalog:ui`: imagem antiga pela rota autenticada do Next, upload otimizado pelo navegador, inserção e salvamento no HTML, erro inline, recolhimento nas três ações, preservação de rascunho e celular. API e registros simulados.

A leitura da imagem real ID 1 também foi conferida pelo serviço corrigido, sem alterar seu arquivo ou registro.

Capturas com dados simulados: [computador](catalog-desktop.png) e [celular](catalog-mobile.png).
