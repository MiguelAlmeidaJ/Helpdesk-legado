# Backup nativo SQL Server

A aba Backups executa um backup completo do banco da conexão da API (DB_NAME), com COPY_ONLY e CHECKSUM, seguido de RESTORE VERIFYONLY WITH CHECKSUM, STOP_ON_ERROR. Não restaura nem modifica as tabelas do banco. COPY_ONLY preserva a base de backups diferenciais já existente.

Configure MAINTENANCE_SQLSERVER_BACKUP_DIR no .env com uma pasta absoluta fora do checkout. A API e o serviço SQL Server precisam acessar a mesma pasta pelo mesmo caminho. Para servidores separados, use um compartilhamento acessível às duas contas. Não use um caminho que exista somente no servidor da API.

Neste ambiente a pasta configurada é C:\ProgramData\Helpdesk\Backups\nivel3_hml e a instância é NIVEL3HML. A configuração protege o banco conectado nivel3_hml; isso não configura outro banco de produção.

Pré-crie a pasta. Conceda leitura e gravação à conta da API e à conta do serviço SQL Server, sem acesso público. O usuário SQL precisa de BACKUP DATABASE. Não é necessário habilitar xp_cmdshell ou SQL Server Agent. DB_REQUEST_TIMEOUT_MS controla o limite das consultas; ajuste-o ao tamanho do banco se a duração ultrapassar o limite atual.

VERIFYONLY exige CREATE DATABASE em master. Neste ambiente, essa permissão não foi concedida ao login da aplicação: foi instalada a procedure master.dbo.helpdesk_verify_native_backup, com EXECUTE AS OWNER, restrita à pasta configurada e aos nomes nativos permitidos. A aplicação recebe somente EXECUTE nessa procedure e usa MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE=true. A procedure não contém restauração de banco nem SQL dinâmico na verificação.

Para instalar em outra instância, um administrador deve executar scripts/setup-native-backup-verification.sql com sqlcmd. Defina as variáveis de ambiente BackupDirectory e AppLogin na sessão do sqlcmd (sem alterar credenciais da aplicação). Esses valores são literais SQL: duplique eventuais apóstrofos antes da substituição. Use `sqlcmd -S servidor,porta -E -C -b -i scripts/setup-native-backup-verification.sql`. Depois configure MAINTENANCE_SQLSERVER_VERIFY_PROCEDURE=true no .env da API. Reinstale a procedure ao mudar o diretório permitido. Sem essa opção, a aplicação executa VERIFYONLY diretamente com suas próprias permissões.

Os arquivos recebem UUID e nunca usam sobrescrita. A API só publica arquivos nativos após verificação bem-sucedida e gravação do marcador .verified.json, que registra tamanho, data de modificação e horário da verificação. Alterações posteriores de tamanho ou data invalidam o marcador. A verificação não substitui um teste periódico de restauração em uma instância isolada.

Falhas ficam na auditoria; arquivos incompletos ou sem verificação não aparecem como backups válidos e ficam na pasta para diagnóstico. A exclusão de um backup pela interface remove também seu marcador. Os .sql antigos continuam históricos. Não mova apenas o .bak se quiser preservar sua identificação pela interface: copie também o marcador, preservando a data de modificação do .bak.

Após compilar a API, execute `node --test scripts/backup-native.test.cjs` para os testes isolados. `node scripts/backup-native-smoke.cjs` cria e verifica um backup real no banco configurado e registra a operação com ator nulo. Reinicie a API após alterar o .env para carregar a nova configuração.

Nesta etapa o backup é manual. Agendamento, retenção automática, restauração e adequações continuam bloqueados. Mantenha também uma cópia externa ao servidor e valide a edição/licenciamento do SQL Server antes do uso em produção.

Referências: [BACKUP](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17), [RESTORE VERIFYONLY](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17).
