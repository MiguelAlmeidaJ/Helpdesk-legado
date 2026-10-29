// SQL Server integration against disposable temp tables; no real holiday writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
const { createNivel3Client } = require('../packages/database/dist');
const { QualityCalendarService } = require('../apps/api/dist/modules/quality/application/quality-calendar.service');
const { OnCallManagementService } = require('../apps/api/dist/modules/on-call/application/on-call-management.service');
const { RbacAccessRepository } = require('../apps/api/dist/modules/access/infrastructure/rbac-access.repository');
const input = { date: '28/09', name: 'Aniversário de Além Paraíba', scope: 'municipal', state: 'MG', municipalityId: 3101508 };

test('validates month/day, scope, state and municipality association before accessing SQL', async () => {
  const service = new QualityCalendarService({ $queryRawUnsafe: () => { throw Error('Unexpected SQL'); } });
  for (const change of [{ date: '2026-09-28' }, { date: '31/04' }, { date: '00/01' }, { name: ' ' }, { scope: 'national' }, { state: 'ZZ' }, { state: 'RJ' }, { municipalityId: 1 }, { scope: 'state' }]) {
    await assert.rejects(service.create({ ...input, ...change }), e => e.getStatus() === 400);
  }
  const mg = service.locations('MG');
  assert.equal(mg.states.length, 27);
  assert.ok(mg.municipalities.some(city => city.id === input.municipalityId));
  assert.ok(!service.locations('RJ').municipalities.some(city => city.id === input.municipalityId));
  assert.throws(() => service.locations('ZZ'), e => e.getStatus() === 400);
  await assert.rejects(service.list(NaN), e => e.getStatus() === 400);
});

test('SQL Server saves annually, preserves localities, handles concurrent duplicates, projects leap years and activates on-call', async () => {
  const db = createNivel3Client();
  const suffix = randomBytes(8).toString('hex');
  const regional = '##calendar_regional_' + suffix, legacy = '##calendar_legacy_' + suffix;
  const replace = sql => sql.replace(/\bbusiness_regional_holidays\b/g, regional).replace(/\bbusiness_holidays\b/g, legacy);
  const fixture = {
    $queryRawUnsafe: (sql, ...params) => db.$queryRawUnsafe(replace(sql), ...params),
    $executeRawUnsafe: (sql, ...params) => db.$executeRawUnsafe(replace(sql), ...params),
  };
  try {
    await db.$executeRawUnsafe(`CREATE TABLE ${regional} (
      id bigint IDENTITY PRIMARY KEY, holiday_month smallint NOT NULL, holiday_day smallint NOT NULL,
      name nvarchar(120) NOT NULL, scope varchar(10) NOT NULL, state char(2) NOT NULL,
      municipality_id int NOT NULL, municipality_name nvarchar(120) NULL,
      UNIQUE (holiday_month, holiday_day, scope, state, municipality_id))`);
    await db.$executeRawUnsafe(`CREATE TABLE ${legacy} (id bigint IDENTITY PRIMARY KEY, holiday_date date NOT NULL, name nvarchar(120), is_national smallint)`);
    await db.$executeRawUnsafe(`INSERT INTO ${legacy} (holiday_date,name,is_national) VALUES ('2026-01-01',N'Nacional existente',1),('2026-10-30',N'Data legada',0)`);
    const service = new QualityCalendarService(fixture);
    const attempts = await Promise.allSettled([service.create(input), service.create(input)]);
    assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 1);
    assert.equal(attempts.find(a => a.status === 'rejected').reason.getStatus(), 409);
    const first = attempts.find(a => a.status === 'fulfilled').value;
    assert.equal(first.municipalityName, 'Além Paraíba');
    assert.equal(first.state, 'MG');
    await service.create({ ...input, name: 'Estadual', scope: 'state', municipalityId: undefined });
    await service.create({ ...input, name: 'Outro município', state: 'RJ', municipalityId: 3300407 });
    const leap = await service.create({ ...input, date: '29/02', scope: 'state', municipalityId: undefined });
    const future = await service.list(2032);
    assert.equal(future.items.filter(item => item.origin === 'regional' && item.date === '2032-09-28').length, 3);
    assert.ok(future.items.some(item => item.id === leap.id && item.origin === 'regional' && item.date === '2032-02-29'));
    assert.ok(!(await service.list(2031)).items.some(item => item.date === '2031-02-29'));
    assert.equal(future.items.filter(item => item.national && item.date.startsWith('2032')).length, 10);
    assert.ok(future.items.some(item => item.name === 'Data legada' && item.date === '2032-10-30'));
    await assert.rejects(service.delete(1), e => e.getStatus() === 409);
    const onCall = new OnCallManagementService({ $queryRawUnsafe: async (sql, ...params) => {
      if (sql.includes('FROM business_calendar_settings')) return [{ business_start: '07:00', business_end: '19:00' }];
      if (sql.includes('AS now_value')) return [{ now_value: '2032-09-28T12:00:00', today_value: '2032-09-28', weekday_value: 1, time_value: '12:00' }];
      if (sql.includes('FROM business_holidays')) return fixture.$queryRawUnsafe(sql.replaceAll("CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')", "CAST('2032-09-28T12:00:00' AS datetime2)"), ...params);
      return [];
    } });
    const current = await onCall.currentState();
    assert.equal(current.active, true);
    assert.equal(current.reason, 'holiday');
    assert.ok(current.holidayName);
    const rbac = new RbacAccessRepository({ $queryRawUnsafe: (sql, ...params) => {
      const tables = /\b(on_call_schedules|business_calendar_settings|roles|role_permissions|permissions)\b/g;
      const ctes = `WITH fixture_on_call_schedules AS (SELECT 42 AS user_id, CAST('2032-09-27' AS date) AS week_start, 'ti' AS area),
        fixture_business_calendar_settings AS (SELECT 1 AS id, CAST('07:00' AS time) AS business_start, CAST('19:00' AS time) AS business_end),
        fixture_roles AS (SELECT 1 AS id, 'plantonista' AS slug),
        fixture_role_permissions AS (SELECT 1 AS role_id, 1 AS permission_id),
        fixture_permissions AS (SELECT 1 AS id, 'tickets.read' AS slug) `;
      return fixture.$queryRawUnsafe(ctes + sql.replace(tables, table => 'fixture_' + table)
        .replaceAll("CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')", "CAST('2032-09-28T12:00:00' AS datetime2)"), ...params);
    } });
    const access = await rbac.activeOnCallAccess(42);
    assert.equal(access.active, true);
    assert.deepEqual(access.areas, ['ti']);
    assert.deepEqual(access.permissionSlugs, ['tickets.read']);
    await service.delete(first.id, true);
    assert.ok(!(await service.list(2032)).items.some(item => item.origin === 'regional' && item.id === first.id));
    assert.equal((await db.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM ${legacy}`))[0].total, 2);
    await fixture.$executeRawUnsafe('DELETE FROM business_regional_holidays WHERE holiday_month = 9 AND holiday_day = 28');
    assert.equal((await rbac.activeOnCallAccess(42)).active, false, 'Weekday permissions expire when no holiday matches');
  } finally {
    await db.$executeRawUnsafe(`IF OBJECT_ID('tempdb..${regional}') IS NOT NULL DROP TABLE ${regional}`);
    await db.$executeRawUnsafe(`IF OBJECT_ID('tempdb..${legacy}') IS NOT NULL DROP TABLE ${legacy}`);
    await db.$disconnect();
  }
});
