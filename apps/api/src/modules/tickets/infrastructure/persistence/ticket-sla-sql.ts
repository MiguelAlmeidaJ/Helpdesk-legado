function ruleThresholdSql(column: 'quality_minutes' | 'clerio_minutes', fallback: string): string {
  return `COALESCE(
    (
      SELECT r.${column}
      FROM ticket_sla_rules r
      WHERE r.active = 1
        AND (r.client_id IS NULL OR r.client_id = a.cliente)
        AND (r.category_id IS NULL OR r.category_id = a.categoria)
        AND (r.priority IS NULL OR r.priority = a.prioridade)
      ORDER BY
        (
          (r.client_id IS NOT NULL) +
          (r.category_id IS NOT NULL) +
          (r.priority IS NOT NULL)
        ) DESC,
        r.sort_order ASC,
        r.id ASC
      LIMIT 1
    ),
    ${fallback}
  )`;
}

export function waitSecondsSql(): string {
  return `COALESCE((
    SELECT SUM(
      GREATEST(
        0,
        TIMESTAMPDIFF(
          SECOND,
          e.espera_start,
          COALESCE(e.espera_end, NOW())
        )
      )
    )
    FROM espera e
    WHERE e.espera_atd = a.id
  ), 0)`;
}

export function waitSecondsSinceSql(startExpression: string): string {
  return `COALESCE((
    SELECT SUM(
      GREATEST(
        0,
        TIMESTAMPDIFF(
          SECOND,
          GREATEST(e.espera_start, ${startExpression}),
          LEAST(COALESCE(e.espera_end, NOW()), NOW())
        )
      )
    )
    FROM espera e
    WHERE e.espera_atd = a.id
      AND e.espera_start < NOW()
      AND COALESCE(e.espera_end, NOW()) > ${startExpression}
  ), 0)`;
}

export function qualityLastInteractionSql(): string {
  return 'COALESCE(ia.last_interaction_at, a.abertura)';
}

export function qualityThresholdMinutesSql(): string {
  return ruleThresholdSql(
    'quality_minutes',
    'COALESCE(NULLIF(cfg.tempo_alerta, 0), 40)',
  );
}

export function clerioThresholdMinutesSql(): string {
  return ruleThresholdSql(
    'clerio_minutes',
    'COALESCE(NULLIF(cfg.sla_n1, 0), 60)',
  );
}

export function qualityElapsedSecondsSql(): string {
  const start = qualityLastInteractionSql();
  return `GREATEST(
    0,
    COALESCE(TIMESTAMPDIFF(SECOND, ${start}, NOW()), 0)
      - (${waitSecondsSinceSql(start)})
  )`;
}

export function clerioElapsedSecondsSql(): string {
  return `GREATEST(
    0,
    COALESCE(TIMESTAMPDIFF(SECOND, a.abertura, NOW()), 0)
      - (${waitSecondsSinceSql('a.abertura')})
  )`;
}

export function qualityBreachedSql(): string {
  return `CASE
    WHEN a.status IN (1, 2, 3)
      AND (${qualityElapsedSecondsSql()}) >= ((${qualityThresholdMinutesSql()}) * 60)
    THEN 1
    ELSE 0
  END`;
}

export function clerioBreachedSql(): string {
  return `CASE
    WHEN a.status IN (1, 2, 3)
      AND (${clerioElapsedSecondsSql()}) >= ((${clerioThresholdMinutesSql()}) * 60)
    THEN 1
    ELSE 0
  END`;
}

export function slaOrderSql(): string {
  return `CASE
    WHEN (${qualityBreachedSql()}) = 1 THEN 0
    WHEN (${clerioBreachedSql()}) = 1 THEN 1
    WHEN a.status = 1 THEN 2
    WHEN a.status = 2 THEN 3
    WHEN a.status = 3 THEN 4
    WHEN a.status = 5 THEN 10
    WHEN a.status = 4 THEN 12
    WHEN a.status = 0 THEN 13
    ELSE 14
  END`;
}
