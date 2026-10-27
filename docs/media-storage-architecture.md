# Central de Mídias — implantação e operação

A Central usa **helpdesk_media** exclusivamente para metadados, associações, referências legadas, configuração e auditoria. Os arquivos ficam no provedor original de cada objeto. A conexão possui pool e credenciais próprios e não utiliza a camada de compatibilidade MySQL do banco principal.

## Implantação sob revisão

1. Revisar a branch e o relatório de entrega. Compilar com `pnpm build` e executar os testes abaixo no checkout de implantação. A implementação não precisa de novos pacotes.
2. Preparar o banco com o script aditivo e idempotente `scripts/sqlserver/helpdesk-media.sql`, como DBA. Não há DROP, TRUNCATE, limpeza de tabelas, carga de binários ou migração automática.
3. Opcionalmente executar `node scripts/provision-media.cjs` para simular o provisionamento. `node scripts/provision-media.cjs --apply` cria o esquema, provisiona um login dedicado e grava a configuração **somente no .env do checkout onde o comando foi executado**. Usa autenticação integrada do Windows para o DBA, gera uma senha aleatória sem exibi-la e não coloca a senha na linha de comando. Não rotaciona logins existentes: nesse caso exige a senha já configurada. O administrador precisa proteger o .env e guardar a credencial no cofre usado pela equipe.
4. Para local, revisar `scripts/setup-media-local.ps1 -WhatIf`, depois executar com o usuário de serviço correto: `scripts/setup-media-local.ps1 -ServiceAccount 'DOMINIO\conta-api'`. A pasta padrão é **C:\HelpdeskMedia**, fora do projeto e da raiz pública. O script recusa caminhos de sistema/publicação e links simbólicos e restringe a ACL a administradores, SYSTEM e à conta indicada. Não modifica arquivos legados.
5. Configurar as variáveis abaixo. Para certificados válidos de produção, manter `MEDIA_SQLSERVER_TRUST_CERTIFICATE=false`. A opção true é somente para certificado autoassinado no desenvolvimento local. O tráfego SQL permanece criptografado.
6. Após aprovação de implantação, atualizar os processos da API e da web com o procedimento habitual. Nenhum processo foi reiniciado por esta implementação. A sincronização de navegação deve ser executada no procedimento de implantação aprovado para adicionar o item Central de Mídias; a rota direta é `/administracao/midias`.

Não publicar o .env, a pasta local de mídias ou credenciais no Git, logs, frontend ou pasta pública. O provedor padrão pode ser alterado pela tela, mas seus segredos e destinos são configurados exclusivamente no servidor. Alterar o padrão afeta somente uploads futuros; não move objetos existentes.

## Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| MEDIA_ENABLED | true habilita a conexão/operações; false é o padrão de distribuição |
| MEDIA_SQLSERVER_HOST / MEDIA_SQLSERVER_PORT | Endereço e porta independentes do servidor de metadados |
| MEDIA_SQLSERVER_DATABASE | helpdesk_media; o cliente recusa o banco de negócio |
| MEDIA_SQLSERVER_USER / MEDIA_SQLSERVER_PASSWORD | Login próprio, diferente do login do nivel3 |
| MEDIA_SQLSERVER_TRUST_CERTIFICATE | false em produção com certificado válido |
| MEDIA_DEFAULT_PROVIDER | local, nextcloud ou cloudinary; fallback enquanto não existir preferência administrativa persistida |
| MEDIA_LOCAL_ROOT | Caminho absoluto privado; padrão Windows C:\HelpdeskMedia |
| MEDIA_MAX_UPLOAD_MB | Limite por arquivo; padrão 25 MiB, faixa de 1 a 100 MiB |
| MEDIA_NEXTCLOUD_WEBDAV_URL | Pasta WebDAV exclusiva, pré-criada, em HTTPS, sem usuário/senha/query na URL |
| MEDIA_NEXTCLOUD_USER / MEDIA_NEXTCLOUD_APP_PASSWORD | Conta e senha de aplicativo Nextcloud |
| MEDIA_CLOUDINARY_CLOUD_NAME / MEDIA_CLOUDINARY_API_KEY / MEDIA_CLOUDINARY_API_SECRET | Conta e credenciais do servidor Cloudinary |

Não usar prefixo NEXT_PUBLIC_ em qualquer credencial. Os provedores históricos precisam continuar configurados para permitir a leitura dos objetos que já estão neles. Trocar o diretório local, a conta/pasta WebDAV ou a conta Cloudinary exige uma operação planejada: não basta alterar a variável e apontar objetos antigos a outro armazenamento.

O login de execução tem permissões SELECT/INSERT/UPDATE nas tabelas de objetos, referências e preferências; DELETE somente em vínculos; SELECT/INSERT na auditoria. Não tem sysadmin, db_owner, CREATE TABLE ou criação de bancos. A estrutura não é aplicada no startup.

## Operações e acesso

| Endpoint autenticado | Operação |
| --- | --- |
| GET /api/media/status | Administrador: configuração disponível, consumo registrado e auditoria |
| PATCH /api/media/settings | Administrador: provedor padrão para novos uploads |
| GET /api/media?contextType=...&contextId=... | Listagem paginada e pesquisa por nome, com autorização do contexto |
| GET /api/media | Listagem geral, somente administrador |
| POST /api/media | Multipart file, contextType, contextId; upload e leitura de confirmação |
| GET /api/media/:id | Metadados públicos para usuários autorizados, sem locator/segredos |
| GET /api/media/:id/content | Download privado, com checksum e no-store |
| GET /api/media/:id/content?inline=true | Visualização de imagens autorizadas; PDFs continuam como download |
| POST /api/media/:id/links | Associação a outro registro autorizado |
| DELETE /api/media/:id/links?contextType=...&contextId=... | Desassociação, preservando o objeto |
| DELETE /api/media/:id | Exclusão lógica, preservando o binário e o histórico |
| POST /api/media/:id/verify | Administrador: leitura e conferência SHA-256 |

Contextos: `system/global`, `catalog/<id>`, `ticket/<id>`, `project/<id>` e `task/<id>`. Todos os registros são validados contra o banco de negócio; usuários externos ficam restritos aos seus clientes; escopo próprio exige o responsável correto. Projetos e tarefas exigem acesso DevOps e permissões específicas. Conteúdo de sistema e configuração são administrativos. A exclusão e a associação de mídias compartilhadas exigem autorização em todos os vínculos existentes; a leitura exige pelo menos um vínculo autorizado e não revela vínculos fora do escopo.

Há painéis da Central nas telas de catálogo, anexos de atendimento, projeto DevOps e tarefa DevOps. Os componentes de mídia legada continuam disponíveis, sem reescrita de HTML nem exclusão de binários antigos. No catálogo, o botão Copiar referência permite inserir o endereço **privado da API** no HTML autorizado; a migração não substitui o conteúdo existente automaticamente. A tela administrativa cobre o contexto de sistema e a consulta geral.

## Validação, falhas e integridade

São aceitos PNG, JPEG, WebP, GIF e PDF, identificados pelo conteúdo, e não pela extensão fornecida. HTML, SVG executável e formatos desconhecidos são recusados. O limite é aplicado no multipart, na aplicação e nas leituras do provedor. Nomes são saneados; chaves têm formato fechado com UUID; caminhos relativos, junctions e symlinks são verificados. O diretório local deve permanecer sob ACL exclusiva da conta de serviço e administradores para impedir alterações concorrentes por usuários do sistema operacional.

Um objeto começa em quarentena. Só fica ativo e recebe o primeiro vínculo depois de o upload retornar e a leitura no provedor confirmar tamanho, MIME e SHA-256. Uploads interrompidos ficam em quarentena para diagnóstico. Localizadores retornados são persistidos antes da leitura de confirmação. Se o banco falhar imediatamente após o provedor criar o objeto, pode haver um arquivo sem localizador persistido: deve ser reconciliado pelo operador; o sistema não tenta remover arquivos sem confirmação de propriedade. Não há endpoint de purge ou coletor automático de órfãos.

Falhas transitórias de download/verificação não alteram o checksum ou declaram o objeto excluído. O download recusa conteúdo divergente. A auditoria de integridade registra sucesso/falha. Objetos em quarentena não são publicados nem associados automaticamente por uma verificação; exigem análise operacional antes de recuperação. O dashboard mostra bytes registrados por provedor e estado, incluindo arquivos retidos por exclusão lógica; não mede a cota total da conta remota. Entradas pending sem localizador não somam bytes. Não equivale a uma varredura física de todos os arquivos do provedor.

Nextcloud usa autenticação Basic com senha de aplicativo, HTTPS, MKCOL e PUT com If-None-Match: *. Redirecionamentos são recusados para não encaminhar credenciais a outro destino. Cloudinary usa upload assinado SHA-256 com `type=authenticated` e `overwrite=false`, e recupera o original pela API assinada asset/download com expiração curta. A assinatura e a URL do provedor nunca são fornecidas ao navegador. Falhas de configuração e respostas dos provedores não são retransmitidas com segredos.

## Migração explícita, sem alterar originais

Simulação completa, sem DML ou uploads:

```powershell
node scripts/media-migrate.cjs --dry-run --source-root 'C:\Users\Administrator\Desktop\helpdesk' --batch-size 25
```

`--source-root` deve apontar à instalação que contém as mídias. No checkout isolado de desenvolvimento, o acervo original continua na pasta helpdesk. Configurações explícitas de diretórios de upload têm precedência. `--limit` restringe o número de referências examinadas; `--report` define um novo arquivo JSONL, sem sobrescrever relatórios anteriores.

Após **autorização expressa para migrar o acervo real**, um operador pode definir MEDIA_MIGRATION_ALLOW_APPLY=true **somente na sessão daquele comando** e usar `--apply`. O comando exige ambas as condições; não há worker, agenda ou chamada automática. Execute uma migração por instalação/provedor de cada vez. A associação ocorre depois da leitura de confirmação; referências ao mesmo SHA-256/tamanho/provedor reutilizam um objeto ativo após verificar sua integridade. Reexecuções reconhecem referências já migradas e verificam novamente o conteúdo. Objetos e vínculos são preservados quando uma referência muda; não há remoção de versões anteriores.

O processo lê binários de imagens/imagens_tarefa, arquivos catalog_images, referências de imagem em documentos, imagens Base64 em catálogo e RD, e referências externas/locais do HTML de catálogo. RD é associado a system/global porque não há contexto expense nesta versão. URLs externas são registradas para revisão e **não são baixadas automaticamente**. Campos HTML, BLOBs e arquivos originais permanecem intactos. Arquivos que mudarem durante a leitura são recusados. Uma referência previamente migrada cujo objeto foi excluído logicamente recebe skipped-deleted na reexecução; não é recriada. Falhas por item não interrompem o restante do lote; falhas de conexão/geração de fontes encerram o comando com um registro de interrupção.

O JSONL contém IDs de origem, hash da referência, resultado, SHA-256 e bytes quando disponíveis. Não contém Base64 nem URLs privadas/tokens. O banco preserva o locator histórico em media_legacy_references. Ausências e referências externas também são auditadas ao aplicar. Conteúdos não aceitos ficam pendentes e aparecem no relatório; não se enfraquece a validação para copiá-los. O código de saída 2 indica falhas por item, 1 indica interrupção/configuração, 0 indica término sem erros operacionais; ausências/formatos não aceitos são resultados de inventário, não exclusões.

## Testes

```text
pnpm test:media
pnpm test:media:sql
pnpm test:navigation
pnpm test:security
pnpm build
node scripts/media-ui-smoke.cjs
```

O teste SQL/Nest usa apenas fixtures sintéticas numa transação externa com rollback e um servidor HTTP isolado em porta efêmera. O guard substituto existe somente no processo de teste, nunca no módulo publicado. Arquivos sintéticos ficam em pasta temporária; não utiliza as imagens reais. O teste cobre upload, listagem, download privado, acesso negado, associação, MIME falso, alteração de checksum, falha de provedor, auditoria e exclusão lógica. Confere que o banco retorna à contagem inicial. O smoke de UI usa Edge headless instalado no Windows (ou MEDIA_TEST_BROWSER), inicia Next em porta efêmera e intercepta todas as chamadas /api com fixtures; não acessa o backend real. Gera a captura docs/reports/media-admin-ui.png.

Teste real de um provedor, quando houver credenciais:

```text
node scripts/media-provider-smoke.cjs --provider local --run
node scripts/media-provider-smoke.cjs --provider nextcloud --run
node scripts/media-provider-smoke.cjs --provider cloudinary --run
```

O comando sem --run apenas informa se as variáveis estão configuradas. Com --run, cria uma imagem sintética, lê e compara SHA-256 e remove **somente esse objeto recém-criado**. Uma falha de limpeza exige revisão da conta/pasta de teste. Os testes unitários simulam os protocolos Nextcloud/Cloudinary; não substituem o roundtrip com a conta real.

Referências primárias: [Nextcloud WebDAV](https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/basic.html), [Cloudinary: assinaturas](https://cloudinary.com/documentation/authentication_signatures), [Cloudinary: entrega autenticada](https://cloudinary.com/documentation/control_access_to_media), [Cloudinary: API de upload e download](https://cloudinary.com/documentation/image_upload_api_reference).
