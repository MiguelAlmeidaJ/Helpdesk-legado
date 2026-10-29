-- Additive provisioning: existing holidays and indexes are preserved.
IF OBJECT_ID('dbo.business_regional_holidays', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.business_regional_holidays (
    id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_business_regional_holidays PRIMARY KEY,
    holiday_month smallint NOT NULL,
    holiday_day smallint NOT NULL,
    name nvarchar(120) NOT NULL,
    scope varchar(10) NOT NULL,
    state char(2) NOT NULL,
    municipality_id int NOT NULL CONSTRAINT DF_regional_municipality DEFAULT (0),
    municipality_name nvarchar(120) NULL,
    created_at datetime2 NOT NULL CONSTRAINT DF_regional_created DEFAULT (SYSDATETIME()),
    CONSTRAINT CK_regional_day CHECK (
      holiday_month BETWEEN 1 AND 12 AND holiday_day BETWEEN 1 AND
      CASE WHEN holiday_month = 2 THEN 29 WHEN holiday_month IN (4,6,9,11) THEN 30 ELSE 31 END),
    CONSTRAINT CK_regional_scope CHECK (
      (scope = 'state' AND municipality_id = 0 AND municipality_name IS NULL) OR
      (scope = 'municipal' AND municipality_id > 0 AND municipality_name IS NOT NULL)),
    CONSTRAINT UQ_regional_date_location UNIQUE (holiday_month, holiday_day, scope, state, municipality_id)
  );
END;
