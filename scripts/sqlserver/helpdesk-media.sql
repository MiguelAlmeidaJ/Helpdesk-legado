-- Executar como DBA em instância SQL Server, antes de configurar a API.
-- Banco separado: metadados apenas; binários permanecem no provedor configurado.
IF DB_ID(N'helpdesk_media') IS NULL CREATE DATABASE helpdesk_media;
GO
USE helpdesk_media;
GO
IF OBJECT_ID(N'dbo.media_objects', N'U') IS NULL
CREATE TABLE dbo.media_objects (
 id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_media_objects PRIMARY KEY DEFAULT NEWID(),
 provider VARCHAR(20) NOT NULL,
 provider_key NVARCHAR(900) NOT NULL,
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
CREATE INDEX IX_media_links_context ON dbo.media_links(context_type,context_id,purpose,sort_order);
CREATE INDEX IX_media_objects_sha ON dbo.media_objects(sha256) WHERE sha256 IS NOT NULL;
GO
IF OBJECT_ID(N'dbo.media_legacy_references',N'U') IS NULL
CREATE TABLE dbo.media_legacy_references (
 id BIGINT IDENTITY(1,1) PRIMARY KEY,
 source_type VARCHAR(50) NOT NULL,
 source_id NVARCHAR(100) NOT NULL,
 original_reference NVARCHAR(2048) NOT NULL,
 media_id UNIQUEIDENTIFIER NULL,
 verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
 checked_at DATETIME2(3) NULL,
 CONSTRAINT FK_media_legacy_media FOREIGN KEY(media_id) REFERENCES dbo.media_objects(id),
 CONSTRAINT CK_media_verification CHECK(verification_status IN ('pending','located','missing','external','duplicate'))
);
GO
CREATE INDEX IX_media_legacy_source ON dbo.media_legacy_references(source_type,source_id);
