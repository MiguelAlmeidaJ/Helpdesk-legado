-- Additive deployment by a DBA. No binary data, destructive DDL or legacy writes.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
USE helpdesk_media;
GO
IF OBJECT_ID('dbo.media_sync_origins','U') IS NULL
CREATE TABLE dbo.media_sync_origins (
 origin VARCHAR(100) NOT NULL PRIMARY KEY, revision INT NOT NULL DEFAULT 0,
 active_run UNIQUEIDENTIFIER NULL
);
IF OBJECT_ID('dbo.media_sync_runs','U') IS NULL
CREATE TABLE dbo.media_sync_runs (
 id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY, origin VARCHAR(100) NOT NULL,
 dump VARCHAR(100) NOT NULL, provider VARCHAR(20) NOT NULL,
 manifest_hash CHAR(64) NOT NULL, manifest_json NVARCHAR(MAX) NOT NULL CHECK(ISJSON(manifest_json)=1),
 base_revision INT NOT NULL, status VARCHAR(30) NOT NULL,
 created_by INT NOT NULL, approved_by INT NULL, backup_receipt UNIQUEIDENTIFIER NULL,
 [checkpoint] INT NOT NULL DEFAULT 0, total INT NOT NULL,
 created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_sync_run_origin FOREIGN KEY(origin) REFERENCES dbo.media_sync_origins(origin)
);
IF OBJECT_ID('dbo.media_sync_items','U') IS NULL
CREATE TABLE dbo.media_sync_items (
 run_id UNIQUEIDENTIFIER NOT NULL, sequence INT NOT NULL,
 reference_key CHAR(64) NOT NULL, descriptor NVARCHAR(MAX) NOT NULL CHECK(ISJSON(descriptor)=1),
 action VARCHAR(30) NOT NULL, state VARCHAR(20) NOT NULL DEFAULT 'pending',
 media_id UNIQUEIDENTIFIER NULL, error_code VARCHAR(60) NULL,
 bytes BIGINT NOT NULL DEFAULT 0, saved_bytes BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY(run_id,sequence), UNIQUE(run_id,reference_key),
 FOREIGN KEY(run_id) REFERENCES dbo.media_sync_runs(id),
 FOREIGN KEY(media_id) REFERENCES dbo.media_objects(id)
);
IF OBJECT_ID('dbo.media_sync_batches','U') IS NULL
CREATE TABLE dbo.media_sync_batches (
 id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY, run_id UNIQUEIDENTIFIER NOT NULL,
 status VARCHAR(20) NOT NULL, from_sequence INT NOT NULL, to_sequence INT NULL,
 processed INT NOT NULL DEFAULT 0, failed INT NOT NULL DEFAULT 0,
 started_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), completed_at DATETIME2 NULL,
 FOREIGN KEY(run_id) REFERENCES dbo.media_sync_runs(id)
);
IF OBJECT_ID('dbo.media_sync_references','U') IS NULL
CREATE TABLE dbo.media_sync_references (
 origin VARCHAR(100) NOT NULL, reference_key CHAR(64) NOT NULL,
 descriptor NVARCHAR(MAX) NOT NULL CHECK(ISJSON(descriptor)=1),
 media_id UNIQUEIDENTIFIER NOT NULL, version INT NOT NULL,
 last_seen_run UNIQUEIDENTIFIER NOT NULL,
 PRIMARY KEY(origin,reference_key),
 FOREIGN KEY(media_id) REFERENCES dbo.media_objects(id),
 FOREIGN KEY(last_seen_run) REFERENCES dbo.media_sync_runs(id)
);
IF OBJECT_ID('dbo.media_sync_versions','U') IS NULL
CREATE TABLE dbo.media_sync_versions (
 origin VARCHAR(100) NOT NULL, reference_key CHAR(64) NOT NULL, version INT NOT NULL,
 run_id UNIQUEIDENTIFIER NOT NULL, media_id UNIQUEIDENTIFIER NOT NULL,
 descriptor NVARCHAR(MAX) NOT NULL CHECK(ISJSON(descriptor)=1),
 created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
 PRIMARY KEY(origin,reference_key,version),
 FOREIGN KEY(media_id) REFERENCES dbo.media_objects(id),
 FOREIGN KEY(run_id) REFERENCES dbo.media_sync_runs(id)
);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_media_sync_batches_run' AND object_id=OBJECT_ID('dbo.media_sync_batches'))
 CREATE INDEX IX_media_sync_batches_run ON dbo.media_sync_batches(run_id,started_at DESC,id);
GO
GRANT SELECT,INSERT,UPDATE ON dbo.media_sync_origins TO helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE ON dbo.media_sync_runs TO helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE ON dbo.media_sync_items TO helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE ON dbo.media_sync_batches TO helpdesk_media_runtime;
GRANT SELECT,INSERT,UPDATE ON dbo.media_sync_references TO helpdesk_media_runtime;
GRANT SELECT,INSERT ON dbo.media_sync_versions TO helpdesk_media_runtime;
GO
