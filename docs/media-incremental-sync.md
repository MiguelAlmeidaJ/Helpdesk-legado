# Sincronização incremental de mídias

O fluxo importa somente conteúdos novos ou alterados e conserva arquivos, versões e referências ausentes. Não altera MySQL, HTML, BLOBs ou registros de negócio. A comparação grava somente o plano e o relatório no banco de metadados; `--dry-run` apenas lê e pode exportar um manifesto local. Não há agendamento nem aplicação iniciada pela interface.

## Implantação após revisão do PR

1. Fazer backup e validar o dump em uma instância isolada. Conferir contagens, integridade referencial e o mapa de IDs antes de atualizar o ambiente. Não substituir o banco `helpdesk_media` ao importar novamente o banco de negócio.
2. Como DBA, aplicar primeiro `scripts/sqlserver/helpdesk-media.sql` e depois `scripts/sqlserver/helpdesk-media-sync.sql`. Ambos são aditivos/idempotentes. Não são executados no startup nem pelo build. O segundo script cria origens, execuções, itens/checkpoints, referências e versões; a conta runtime não ganha permissão de DDL.
3. Configurar `MEDIA_SYNC_APPROVAL_KEY` com pelo menos 32 caracteres aleatórios, guardados no cofre e no `.env` privado da API. Configurar `MEDIA_SYNC_BACKUP_EVIDENCE_DIR` com caminho absoluto fora do webroot. Criar essa pasta com ACL restrita ao DBA e à conta da API. As variáveis são exclusivamente de servidor. Não persistir `MEDIA_MIGRATION_ALLOW_APPLY`.
4. Compilar e reiniciar API/web somente após a revisão e autorização de implantação. A Central mostra **Migração e Sincronização** para `system.admin`; todos os endpoints também exigem sessão e permissão administrativa.

## Origem, dump, identidade e remapeamentos

`origin` é o identificador estável da instalação MySQL (por exemplo `helpdesk-mysql-producao`). Nunca mudar a origem entre dumps da mesma instalação. `dump` identifica uma captura imutável (por exemplo `dump-2026-11-01`). Manifestos são limitados a 50 mil referências e 20 MiB no upload HTTP. Nenhuma URL, senha, conteúdo Base64 ou binário é armazenado no manifesto.

O manifesto versão 1 contém `origin`, `dump`, `complete`, `provider` e `entries`. Cada referência contém `key`, `sourceType`, `sourceId`, `name`, `context`, `identitySha256`, `sha256`, `size` e `availability` (`file`, `missing`, `external`, `unsupported`). `key` permanece estável mesmo que o ID no dump seja remapeado. `sourceId` aponta para a linha no SQL Server atual, usada apenas para ler a origem. A identidade da entidade é SHA-256 da tupla JSON `[tipo, título/texto de abertura, data de abertura/criação ISO ou null, CNPJ e nomes do cliente]`; IDs numéricos não entram no hash. A identidade deve ser única entre entidades do mesmo tipo no destino; duplicidades ambíguas bloqueiam o vínculo até revisão. Para sistema, a identidade é SHA-256 de `system:global`.

O coletor usa IDs preservados por padrão (`catalog_images:12`, por exemplo). Se houver remapeamento, fornecer `--map mapa.json`, produzido e revisado junto com a importação do dump. A chave do mapa é `sourceType:sourceId` **no novo banco**; seu valor fornece a chave estável anterior, o contexto de destino e a identidade esperada obtida da captura isolada. Exemplo:

```json
{
  "catalog_images:912": {
    "key": "catalog_images:12",
    "context": { "type": "catalog", "id": "704" },
    "identitySha256": "<SHA-256 calculado no inventário isolado>"
  }
}
```

Não deduzir remapeamentos apenas por posição, nome de arquivo ou igualdade de IDs. A API confere existência, acesso e identidade na comparação e novamente antes de cada aplicação. Uma identidade divergente impede a aprovação. Se título/texto/data de uma entidade mudar legitimamente, o vínculo exige revisão do mapa e da origem; não há opção de ignorar essa validação. Referências inline usam a posição no texto como parte da chave; se forem reordenadas, o mapa deve manter as chaves estáveis e evitar associar silenciosamente conteúdos diferentes.

Links criados pela sincronização recebem a identidade esperada. Um ID antigo reutilizado por outra entidade não libera o arquivo histórico a usuários comuns. Administradores mantêm acesso para revisão. Vínculos legados anteriores à sincronização não possuem essa prova: revisar o acervo e os vínculos anteriores antes de liberar um dump com IDs remapeados. Como o migrador antigo não registrava origem, sua adoção exige configurar `MEDIA_SYNC_LEGACY_ORIGIN` com a única origem revisada correspondente; fica desativada por padrão. Adoção de `media_legacy_references` usa a chave original `sourceType:sourceId`, retém o objeto anterior como versão inicial e compara SHA-256/tamanho; aliases arbitrários sem essa chave não adotam automaticamente esse histórico.

## Simulação e comparação

Executar o inventário contra a cópia validada, com as variáveis de conexão apropriadas a esse ambiente:

```powershell
node scripts/media-migrate.cjs --dry-run --origin helpdesk-mysql-producao --dump dump-2026-11-01 --source-root 'C:\SnapshotHelpdesk' --manifest inventario.json --map mapa.json
```

Arquivos de saída são criados com exclusividade (`wx`), sem sobrescrever um inventário anterior. URLs externas são contabilizadas sem download. Caminhos devem permanecer sob os diretórios de origem autorizados; `..`, junctions e symlinks que escapam desses diretórios não são aceitos. Uma interrupção na geração impede a criação de um inventário completo. O comando não aceita `--limit`, evitando tratar uma leitura parcial como ausência no dump.

Na Central, enviar `inventario.json` em **Comparar sem transferir arquivos**. Alternativamente, no servidor, usar `--compare --admin-id ID` junto com os argumentos do inventário; esse ID precisa corresponder a administrador RBAC ativo. Esse comando só persiste o plano, nunca aplica. O relatório separa novos, duplicatas, alterados, inalterados, arquivos ausentes, referências ausentes no dump, externos, inválidos e excluídos aguardando revisão. A economia em bytes é confirmada após verificação/reutilização do objeto, não apenas pela existência de um hash no banco.

Um manifesto `complete:false` pode ser comparado, mas não marca ausências e não pode ser aprovado. Manter a origem congelada durante a validação e aplicação: o coletor não cria uma transação snapshot sobre todo o dump; conteúdo e identidade são revalidados no momento de copiar cada item.

## Backups verificados e aprovação

Exigir backups FULL com CHECKSUM tanto do banco de negócio quanto de `helpdesk_media`. Não há criação automática de backups por este fluxo. O DBA deve conferir também a recuperabilidade do provedor e os arquivos físicos originais.

```powershell
node scripts/media-sync-verify-backups.cjs --verify --business 'C:\Backups\nivel3_hml.bak' --metadata 'C:\Backups\helpdesk_media.bak'
```

O comando usa `sqlcmd` com autenticação integrada, verifica o nome do banco e o tipo FULL na posição 1 com `RESTORE HEADERONLY`, executa `RESTORE VERIFYONLY ... WITH CHECKSUM` e calcula SHA-256 dos dois arquivos. Não restaura, sobrescreve ou exclui bancos/arquivos. Os dois bancos devem estar na instância configurada por `MEDIA_SQLSERVER_HOST/PORT`. O comprovante privado tem UUID, nome dos bancos, tamanho, mtime, SHA-256 e assinatura HMAC. A API recusa comprovantes adulterados, arquivos modificados, outro banco ou verificações com mais de 24 horas; relê os hashes na aprovação e em cada lote. `VERIFYONLY` não substitui o ensaio de restauração em ambiente isolado.

Revisar o relatório completo e, na Central, informar o UUID do comprovante e digitar `APROVAR <runId>`. Isso registra o administrador real e aprova aquele manifesto específico. A aprovação não inicia transferências. Somente uma execução por origem pode permanecer aprovada; planos cuja revisão da origem ficou desatualizada são recusados. Cancelar uma execução libera a origem e preserva tudo já importado.

## Aplicação manual em lotes e retomada

Somente depois da autorização administrativa e operacional explícita, definir `MEDIA_MIGRATION_ALLOW_APPLY=true` **apenas no processo invocado**, e executar:

```text
node scripts/media-sync.cjs --apply --run <runId> --confirm <mesmo-runId> --source-root C:\SnapshotHelpdesk --map mapa.json --batch-size 10 --report lote-001.json
```

O comando executa um lote de 1 a 10 itens e termina. Repetir com o mesmo UUID e nomes de relatório novos até concluir. Cada lote recebe UUID próprio e recibo persistente com intervalo de itens, horários e falhas. Uma interrupção antes do checkpoint deixa um recibo iniciado, marcado como interrompido na retomada ou no cancelamento. O checkpoint é persistido por lote; itens concluídos não se repetem. Falhas ficam no relatório e exigem **Preparar retomada dos itens com falha** na Central. Cada lote confere se o administrador que aprovou continua ativo. Após 24 horas, cancelar a execução e gerar nova comparação/aprovação com comprovantes renovados.

A trava global SQL Server usa `sp_getapplock` com proprietário Transaction e liberação automática ao término/rollback da transação ([referência Microsoft](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql?view=sql-server-ver17)). Uma segunda comparação/aprovação/aplicação concorrente recebe conflito, mesmo de outro processo. Chaves únicas reforçam itens, referências e versões. A deduplicação usa SHA-256 **e tamanho**, verifica o objeto no provedor e reutiliza objetos ativos de qualquer provedor, sem retransferir binários. O provedor do manifesto só define o destino de conteúdos novos.

Versões e checkpoint são confirmados juntos. Cada item tem savepoint, e o lote conserva resultados válidos quando outro item falha. Objetos no provedor não participam de transações SQL: após upload bem-sucedido e interrupção antes do checkpoint, a reserva de ID determinístico e a busca pelo hash permitem reutilizar o objeto ativo. Reservas incompletas/quarentenadas nunca são retransferidas automaticamente: ficam para revisão administrativa. Isso evita criar novos registros/arquivos em uma situação cujo resultado remoto é desconhecido. Um objeto remoto cujo locator não chegou a ser persistido também requer inspeção do provedor. Não há purga nem recuperação destrutiva automática.

Conteúdo alterado gera uma nova versão e preserva a anterior. Referência ausente no dump fica no relatório e não é removida. Arquivo desaparecido, objeto excluído logicamente ou formato inválido não é recriado automaticamente. A conclusão significa que os itens processáveis foram conferidos; revisar também ausências e formatos não suportados antes de liberar o ambiente.

## Reconciliação e testes

Histórico e relatórios paginados: `GET /api/media/sync` e `GET /api/media/sync/:id?offset=0`, ambos administrativos. Relatórios trazem itens, status, checksum do manifesto, economia de bytes e checkpoint. O CLI exporta todas as páginas de itens e lotes. A API pagina 100 itens e o histórico 30 execuções; o relatório mostra os 30 lotes mais recentes. `GET /api/media/sync/:id/batches?offset=30` consulta lotes anteriores. Os arquivos são relidos/verificados antes de cada associação. A liberação de produção continua sendo uma decisão operacional depois de validar relatório, arquivos, vínculos, ausências e entidades.

```powershell
pnpm build
pnpm test:media
pnpm test:media:sync
node scripts/media-sync-test-db.cjs --create
pnpm test:media:sync:sql
```

O teste SQL usa exclusivamente `helpdesk_media_test_sync`, dados sintéticos e pasta temporária. O provisionador só cria esse banco de testes e concede o papel ao login runtime; nunca altera registros reais e não executa DROP/TRUNCATE. Backups do teste são comprovantes sintéticos assinados com chave efêmera, não backups reais. Exercita idempotência, deduplicação, versionamento, remapeamento, ausência, checkpoints parciais, concorrência entre conexões e falha após upload antes do checkpoint. O protocolo real dos provedores continua coberto pelos testes da Central; Nextcloud/Cloudinary reais exigem credenciais e autorização separadas.
