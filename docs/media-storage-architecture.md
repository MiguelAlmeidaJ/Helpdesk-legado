# Central de mídias — implantação em fases

## Arquitetura
Banco separado **helpdesk_media** (SQL Server) para metadados e associações; arquivos binários **fora do banco**, por provedor:
- **local**: diretório exclusivo no servidor, por exemplo `D:\\HelpdeskMedia`, fora do Git e da pasta publicada pelo Next.js.
- **nextcloud**: WebDAV autenticado com senha de aplicativo, pasta isolada por projeto/instância.
- **cloudinary**: API autenticada via assinatura (nunca disponibilizar o API secret ao frontend), `resource_type=image` ou `raw` conforme mídia.

Esquema SQL: `scripts/sqlserver/helpdesk-media.sql`. A implantação é explícita, não automática. Não configurar o usuário SQL da API com permissão de criar banco.

## Modelo
`media_objects` armazena id UUID, provedor, identificador/caminho relativo, nome, MIME, bytes, SHA-256, dimensões, estado, metadados JSON e auditoria.
`media_links` vincula o mesmo objeto a múltiplos contextos: `system`, `catalog`, `ticket`, `project`, `task`, com ID do registro, propósito e ordem. Evita armazenar cópias só porque uma imagem é usada em vários lugares.
`media_legacy_references` preserva referências históricas, inclusive ausentes/externas, para migração auditável.

## Variáveis propostas (não inserir segredos no Git)
```ini
MEDIA_SQLSERVER_DATABASE=helpdesk_media
MEDIA_DEFAULT_PROVIDER=local
MEDIA_LOCAL_ROOT=D:\\HelpdeskMedia
MEDIA_NEXTCLOUD_WEBDAV_URL=https://cloud.example.com/remote.php/dav/files/conta/Helpdesk
MEDIA_NEXTCLOUD_USER=
MEDIA_NEXTCLOUD_APP_PASSWORD=
MEDIA_CLOUDINARY_CLOUD_NAME=
MEDIA_CLOUDINARY_API_KEY=
MEDIA_CLOUDINARY_API_SECRET=
```
O banco separado deve ter login SQL próprio com permissões mínimas sobre as tabelas da central. Aplicar TLS e proteger a pasta local com ACL do serviço da API. Nunca registrar tokens/credenciais em logs.

## Migração (sem exclusão da origem)
1. Inventariar mídias com SHA-256, tamanho, MIME real e contexto de uso.
2. Inserir as referências em `media_legacy_references`, inclusive as 2.165 ausências e 237 URLs externas detectadas no levantamento.
3. Transferir arquivos disponíveis em lotes com verificação de checksum; inserir objeto e vínculos somente após upload verificado.
4. Manter endereços legados em modo leitura durante transição; atualizar consumidores módulo por módulo.
5. Auditoria de integridade e restore testado antes de considerar remoção de qualquer binário antigo.

## Estado desta etapa
Este commit entrega **o esquema SQL e contrato da arquitetura**. Ainda **não** redireciona uploads, não provisiona credenciais de Nextcloud/Cloudinary, nem move/exclui arquivos. Os provedores e rotas de upload precisam ser ligados à API e validados antes de ativação em produção. Isso evita introduzir perdas no acervo atual.
