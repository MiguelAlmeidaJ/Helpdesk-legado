-- Run as an instance administrator using sqlcmd -v BackupDirectory=... AppLogin=...
-- Both sqlcmd values must be escaped as SQL string literals by the caller.
USE master;
GO
CREATE OR ALTER PROCEDURE dbo.helpdesk_verify_native_backup
  @file nvarchar(4000)
WITH EXECUTE AS OWNER
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @root nvarchar(4000) = N'$(BackupDirectory)';
  IF RIGHT(@root, 1) NOT IN (N'\', N'/') SET @root += N'\';
  IF LEFT(@file, LEN(@root)) <> @root
    THROW 50001, 'Arquivo fora do diretório de backup autorizado.', 1;
  DECLARE @name nvarchar(4000) = SUBSTRING(@file, LEN(@root) + 1, 4000);
  IF LEN(@name) NOT BETWEEN 45 AND 100
     OR RIGHT(@name, 4) <> N'.bak'
     OR REPLACE(REPLACE(LEFT(@name, LEN(@name) - 4), N'-', N''), N'_', N'') COLLATE Latin1_General_100_BIN2 LIKE N'%[^a-z0-9]%'
     OR NOT (@name LIKE N'manual[_]nivel3[_]%' OR @name LIKE N'auto[_]nivel3[_]%' OR @name LIKE N'preimport[_]nivel3[_]%')
    THROW 50002, 'Nome de backup nativo inválido.', 1;
  RESTORE VERIFYONLY FROM DISK = @file WITH CHECKSUM, STOP_ON_ERROR;
END;
GO
DECLARE @login sysname = N'$(AppLogin)';
IF SUSER_ID(@login) IS NULL THROW 50003, 'Login da aplicação não encontrado.', 1;
DECLARE @sql nvarchar(max);
IF USER_ID(@login) IS NULL
BEGIN
  SET @sql = N'CREATE USER ' + QUOTENAME(@login) + N' FOR LOGIN ' + QUOTENAME(@login);
  EXEC(@sql);
END;
SET @sql = N'GRANT EXECUTE ON dbo.helpdesk_verify_native_backup TO ' + QUOTENAME(@login);
EXEC(@sql);
GO
