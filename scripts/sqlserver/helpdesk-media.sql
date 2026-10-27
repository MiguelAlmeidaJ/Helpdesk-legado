-- Executar como DBA em instância SQL Server, antes de configurar a API.
-- Banco separado: metadados apenas; binários permanecem no provedor configurado.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
IF DB_ID(N'helpdesk_media') IS NULL CREATE DATABASE helpdesk_media;
GO
USE helpdesk_media;
GO
IF OBJECT_ID(N'dbo.media_objects', N'U') IS NULL
CREATE TABLE dbo.media_objects (
 id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_media_objects PRIMARY KEY DEFAULT NEWID(),
 provider VARCHAR(20) NOT NULL,
 provider_key NVARCHAR(600) NOT NULL,
 original_name NVARCHAR(255) NOT NULL,
 mime_type VARCHAR(120) NOT NULL,
 size_bytes BIGINT NOT NULL,
 sha256 CHAR(64) NULL,
 width INT NULL, height INT NULL,
 metadata_json NVARCHAR(MAX) NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'active',
 created_by INT NULL,
 created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT CK_media_provider CHECK (provider IN ('local','nextcloud','cloudinary')),
 CONSTRAINT CK_media_status CHECK (status IN ('active','missing','quarantined','deleted')),
 CONSTRAINT CK_media_size CHECK (size_bytes >= 0),
 CONSTRAINT CK_media_metadata CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1),
 CONSTRAINT UQ_media_provider_key UNIQUE(provider, provider_key)
);
GO
IF OBJECT_ID(N'dbo.media_links', N'U') IS NULL
CREATE TABLE dbo.media_links (
 id BIGINT IDENTITY(1,1) PRIMARY KEY,
 media_id UNIQUEIDENTIFIER NOT NULL,
 context_type VARCHAR(30) NOT NULL,
 context_id NVARCHAR(100) NOT NULL,
 purpose VARCHAR(60) NOT NULL DEFAULT 'attachment',
 sort_order INT NOT NULL DEFAULT 0,
 metadata_json NVARCHAR(MAX) NULL,
 created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_media_links_object FOREIGN KEY(media_id) REFERENCES dbo.media_objects(id),
 CONSTRAINT CK_media_context CHECK(context_type IN ('system','catalog','ticket','project','task')),
 CONSTRAINT CK_media_links_metadata CHECK(metadata_json IS NULL OR ISJSON(metadata_json)=1),
 CONSTRAINT UQ_media_link UNIQUE(media_id,context_type,context_id,purpose)
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_media_links_context' AND object_id=OBJECT_ID('dbo.media_links'))
 CREATE INDEX IX_media_links_context ON dbo.media_links(context_type,context_id,purpose,sort_order);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_media_objects_sha' AND object_id=OBJECT_ID('dbo.media_objects'))
 CREATE INDEX IX_media_objects_sha ON dbo.media_objects(sha256) WHERE sha256 IS NOT NULL;
GO
IF OBJECT_ID(N'dbo.media_legacy_references',N'U') IS NULL
CREATE TABLE dbo.media_legacy_references (
 id BIGINT IDENTITY(1,1) PRIMARY KEY,
 source_type VARCHAR(50) NOT NULL,
 source_id NVARCHAR(100) NOT NULL,
 original_reference NVARCHAR(MAX) NOT NULL,
 media_id UNIQUEIDENTIFIER NULL,
 verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
 checked_at DATETIME2(3) NULL,
 CONSTRAINT FK_media_legacy_media FOREIGN KEY(media_id) REFERENCES dbo.media_objects(id),
 CONSTRAINT CK_media_verification CHECK(verification_status IN ('pending','located','missing','external','duplicate'))
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_media_legacy_source' AND object_id=OBJECT_ID('dbo.media_legacy_references'))
 CREATE INDEX IX_media_legacy_source ON dbo.media_legacy_references(source_type,source_id);
GO
IF OBJECT_ID(N'dbo.media_settings',N'U') IS NULL
CREATE TABLE dbo.media_settings (
 id INT NOT NULL PRIMARY KEY CHECK(id=1), default_provider VARCHAR(20) NOT NULL,
 updated_by INT NULL, updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT CK_media_default_provider CHECK(default_provider IN ('local','nextcloud','cloudinary'))
);
GO
IF OBJECT_ID(N'dbo.media_audit',N'U') IS NULL
CREATE TABLE dbo.media_audit (
 id BIGINT IDENTITY(1,1) PRIMARY KEY, media_id UNIQUEIDENTIFIER NULL,
 actor_id INT NULL, action VARCHAR(60) NOT NULL, result VARCHAR(30) NOT NULL,
 detail NVARCHAR(2000) NULL, created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
-- The runtime principal cannot create schemas, delete original files, or remove metadata rows.
IF DATABASE_PRINCIPAL_ID(N'helpdesk_media_runtime') IS NULL CREATE ROLE helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE ON dbo.media_objects TO helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON dbo.media_links TO helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE ON dbo.media_legacy_references TO helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE ON dbo.media_settings TO helpdesk_media_runtime;
GRANT SELECT,INSERT ON dbo.media_audit TO helpdesk_media_runtime;
GO
IF COL_LENGTH('dbo.media_legacy_references','source_fingerprint') IS NULL
 ALTER TABLE dbo.media_legacy_references ADD source_fingerprint CHAR(64) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_media_legacy_fingerprint' AND object_id=OBJECT_ID('dbo.media_legacy_references'))
 CREATE UNIQUE INDEX UX_media_legacy_fingerprint ON dbo.media_legacy_references(source_type,source_id,source_fingerprint) WHERE source_fingerprint IS NOT NULL;
