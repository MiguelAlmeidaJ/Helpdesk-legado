<?php

if (!function_exists('atd_home_h')) {
  function atd_home_h($value)
  {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
  }
}

function atd_home_page_size()
{
  return 50;
}

function atd_home_status_cards_definitions()
{
  return [
    1 => ['label' => 'Aguardando', 'status' => [1], 'border' => '#6c757d'],
    2 => ['label' => 'Em execucao', 'status' => [2], 'border' => '#0d6efd'],
    3 => ['label' => 'Em espera', 'status' => [3], 'border' => '#fd7e14'],
    5 => ['label' => 'Concluido', 'status' => [5], 'border' => '#20c997'],
    4 => ['label' => 'Finalizado', 'status' => [4], 'border' => '#15b33a'],
    0 => ['label' => 'Agendados', 'status' => [0], 'border' => '#6f42c1'],
    10 => ['label' => 'Todos', 'status' => [0, 1, 2, 3, 4], 'border' => '#e9ecef'],
  ];
}

function atd_home_sort_columns()
{
  return [
    'id' => 'atendimentos.id',
    'cliente' => 'clientes.clt_nomef',
    'abertura' => 'atendimentos.abertura',
    'nivel' => 'atendimentos.nivel',
    'Prioridade' => 'atendimentos.prioridade',
    'prioridade' => 'atendimentos.prioridade',
    'forma' => 'atendimentos.forma',
    'tecnico' => 'usuarios.user_nome',
    'status' => 'atendimentos.`status`',
    'sla' => 'sla_ordem',
  ];
}

function atd_home_default_filters()
{
  return [
    'f_date_1' => '',
    'f_date_2' => '',
    'f_sts' => 11,
    'f_sol' => 0,
    'f_clt' => 0,
    'f_id' => '',
    'f_palavra' => '',
    'f_tipo' => [],
    'f_tec' => [],
    'ord' => 'sla',
    'order_dir' => 'ASC',
  ];
}

function atd_home_clear_filters()
{
  if (!isset($_SESSION) || !is_array($_SESSION)) {
    $_SESSION = [];
  }

  foreach (array_keys(atd_home_default_filters()) as $key) {
    unset($_SESSION[$key]);
  }
  unset($_SESSION['tecnicos_selecionados']);
}

function atd_home_sanitize_int_array($value)
{
  if (!is_array($value)) {
    $value = ($value === '' || $value === null) ? [] : explode(',', (string)$value);
  }

  $items = [];
  foreach ($value as $item) {
    if ($item === '' || $item === null) {
      continue;
    }
    $items[] = (int)$item;
  }

  return array_values(array_unique($items));
}

function atd_home_sanitize_date($value)
{
  $value = trim((string)$value);
  return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : '';
}

function atd_home_normalize_filters($input = null, $persist = false)
{
  if (!isset($_SESSION) || !is_array($_SESSION)) {
    $_SESSION = [];
  }

  $defaults = atd_home_default_filters();
  $hasInput = is_array($input);

  if ($hasInput && $persist) {
    foreach (['f_date_1', 'f_date_2', 'f_sts', 'f_sol', 'f_clt', 'f_id', 'f_palavra', 'ord', 'order_dir'] as $key) {
      if (array_key_exists($key, $input)) {
        $_SESSION[$key] = $input[$key];
      }
    }

    foreach (['f_tipo', 'f_tec'] as $key) {
      if (array_key_exists($key, $input)) {
        $_SESSION[$key] = $input[$key];
      } else {
        unset($_SESSION[$key]);
      }
    }
  }

  $source = $defaults;
  foreach ($defaults as $key => $defaultValue) {
    if (array_key_exists($key, $_SESSION)) {
      $source[$key] = $_SESSION[$key];
    }
  }

  if ($hasInput && !$persist) {
    foreach ($defaults as $key => $defaultValue) {
      if (array_key_exists($key, $input)) {
        $source[$key] = $input[$key];
      }
    }
  }

  $filters = [];
  $filters['f_date_1'] = atd_home_sanitize_date($source['f_date_1']);
  $filters['f_date_2'] = atd_home_sanitize_date($source['f_date_2']);
  $filters['f_sts'] = (int)$source['f_sts'];
  $filters['f_sol'] = (int)$source['f_sol'];
  $filters['f_clt'] = (int)$source['f_clt'];
  $filters['f_palavra_raw'] = trim((string)$source['f_palavra']);
  $filters['f_tipo'] = atd_home_sanitize_int_array($source['f_tipo']);
  $filters['f_tec'] = atd_home_sanitize_int_array($source['f_tec']);

  $rawId = trim((string)$source['f_id']);
  $digitsId = preg_replace('/\D+/', '', $rawId);
  $filters['f_id'] = $digitsId === '' ? '' : (ltrim($digitsId, '0') === '' ? '0' : ltrim($digitsId, '0'));

  if ($filters['f_clt'] === 0) {
    $filters['f_sol'] = 0;
  }

  if (isset($_SESSION['allterusN3Id']) && (int)$_SESSION['allterusN3Id'] === 134) {
    $filters['f_palavra_raw'] = 'NET DO BRASIL';
  }
  $filters['f_palavra_like'] = $filters['f_palavra_raw'] !== '' ? '%' . $filters['f_palavra_raw'] . '%' : '';

  $sortColumns = atd_home_sort_columns();
  $filters['ord'] = array_key_exists((string)$source['ord'], $sortColumns) ? (string)$source['ord'] : 'status';
  $filters['order_dir'] = strtoupper((string)$source['order_dir']) === 'DESC' ? 'DESC' : 'ASC';

  if ($filters['f_id'] !== '') {
    $filters['status_ids'] = [0, 1, 2, 3, 4, 5];
  } elseif ($filters['f_sts'] === 10) {
    $filters['status_ids'] = [0, 1, 2, 3, 4];
  } elseif ($filters['f_sts'] === 11) {
    $filters['status_ids'] = [1, 2, 3, 5];
  } else {
    $filters['status_ids'] = [(int)$filters['f_sts']];
  }

  return $filters;
}

function atd_home_add_in_filter(&$where, &$params, $column, $values, $prefix)
{
  $values = atd_home_sanitize_int_array($values);
  if (empty($values)) {
    return;
  }

  $placeholders = [];
  foreach ($values as $index => $value) {
    $name = ':' . $prefix . $index;
    $placeholders[] = $name;
    $params[$name] = (int)$value;
  }

  $where[] = $column . ' IN (' . implode(', ', $placeholders) . ')';
}

function atd_home_build_where($filters, $statusIds = null)
{
  $where = [];
  $params = [];

  atd_home_add_in_filter($where, $params, 'atendimentos.`status`', $statusIds === null ? $filters['status_ids'] : $statusIds, 'sts');

  if ($filters['f_clt'] > 0) {
    $where[] = 'atendimentos.cliente = :cliente';
    $params[':cliente'] = (int)$filters['f_clt'];
  }

  if ($filters['f_sol'] > 0) {
    $where[] = 'atendimentos.pessoa = :solicitante';
    $params[':solicitante'] = (int)$filters['f_sol'];
  }

  if ($filters['f_id'] !== '') {
    $where[] = 'atendimentos.id = :atendimento_id';
    $params[':atendimento_id'] = (int)$filters['f_id'];
  }

  if ($filters['f_palavra_like'] !== '') {
    $where[] = '(LOWER(atendimentos.desc_abertura) LIKE LOWER(:palavra) OR LOWER(atendimentos.desc_fechamento) LIKE LOWER(:palavra))';
    $params[':palavra'] = $filters['f_palavra_like'];
  }

  $tipoFiltro = !empty($filters['f_tipo']) ? $filters['f_tipo'] : [0, 1, 2, 3, 4, 5, 6];
  atd_home_add_in_filter($where, $params, 'atendimentos.tipo', $tipoFiltro, 'tipo');

  if (!empty($filters['f_tec'])) {
    atd_home_add_in_filter($where, $params, 'atendimentos.tecnico', $filters['f_tec'], 'tec');
  }

  if ($filters['f_date_1'] !== '' && $filters['f_date_2'] !== '') {
    $where[] = 'atendimentos.abertura BETWEEN :data_1 AND :data_2';
    $params[':data_1'] = $filters['f_date_1'] . ' 00:00:00';
    $params[':data_2'] = $filters['f_date_2'] . ' 23:59:59';
  } elseif ($filters['f_date_1'] !== '') {
    $where[] = 'atendimentos.abertura >= :data_1';
    $params[':data_1'] = $filters['f_date_1'] . ' 00:00:00';
  } elseif ($filters['f_date_2'] !== '') {
    $where[] = 'atendimentos.abertura <= :data_2';
    $params[':data_2'] = $filters['f_date_2'] . ' 23:59:59';
  }

  if (isset($_SESSION['tipo']) && (int)$_SESSION['tipo'] === 2 && !empty($_SESSION['empresas']) && is_array($_SESSION['empresas'])) {
    atd_home_add_in_filter($where, $params, 'atendimentos.cliente', $_SESSION['empresas'], 'empresa');
  }

  return [
    'sql' => empty($where) ? '' : ' WHERE ' . implode(' AND ', $where),
    'params' => $params,
  ];
}

function atd_home_bind_params($stmt, $params)
{
  foreach ($params as $name => $value) {
    $stmt->bindValue($name, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
  }
}

function atd_home_base_from_sql()
{
  return "
    FROM atendimentos
  ";
}

function atd_home_rows_from_sql()
{
  return "
    FROM atendimentos
    INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
    LEFT JOIN pessoas ON pessoas.pessoa_id = atendimentos.pessoa
    LEFT JOIN locais ON locais.local_id = atendimentos.`local`
    LEFT JOIN categorias ON categorias.cat_id = atendimentos.categoria
    LEFT JOIN subcategorias ON subcategorias.scat_id = atendimentos.subcategoria
    LEFT JOIN itens ON itens.itens_id = atendimentos.item
    LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
  ";
}

function atd_home_get_config($pdo)
{
  $stmt = $pdo->prepare("SELECT * FROM configuracao LIMIT 1");
  $stmt->execute();
  $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

  return [
    'tempo_alerta' => (int)($row['tempo_alerta'] ?? 0),
    'sla_n1' => (int)($row['sla_n1'] ?? 0),
    'sla_n2' => (int)($row['sla_n2'] ?? 0),
    'sla_n3' => (int)($row['sla_n3'] ?? 0),
    'sla_n4' => (int)($row['sla_n4'] ?? 0),
    'sla_n5' => (int)($row['sla_n5'] ?? 0),
    'sla_n6' => (int)($row['sla_n12'] ?? ($row['sla_n6'] ?? 0)),
  ];
}

function atd_home_sla_level_minutes_sql()
{
  return "CASE
    WHEN atendimentos.nivel <= 1 THEN (SELECT COALESCE(sla_n1, 0) FROM configuracao LIMIT 1)
    WHEN atendimentos.nivel = 2 THEN (SELECT COALESCE(sla_n2, 0) FROM configuracao LIMIT 1)
    WHEN atendimentos.nivel = 3 THEN (SELECT COALESCE(sla_n3, 0) FROM configuracao LIMIT 1)
    WHEN atendimentos.nivel = 4 THEN (SELECT COALESCE(sla_n4, 0) FROM configuracao LIMIT 1)
    WHEN atendimentos.nivel = 5 THEN (SELECT COALESCE(sla_n5, 0) FROM configuracao LIMIT 1)
    WHEN atendimentos.nivel = 6 THEN (SELECT COALESCE(sla_n12, sla_n6, 0) FROM configuracao LIMIT 1)
    ELSE (SELECT COALESCE(sla_n1, 0) FROM configuracao LIMIT 1)
  END";
}

function atd_home_sla_wait_seconds_sql()
{
  return "COALESCE((
    SELECT SUM(CASE WHEN espera.espera_end IS NOT NULL THEN TIMESTAMPDIFF(SECOND, espera.espera_start, espera.espera_end) ELSE 0 END)
    FROM espera
    WHERE espera.espera_atd = atendimentos.id
  ), 0)";
}

function atd_home_sla_remaining_seconds_sql()
{
  $levelMinutesSql = atd_home_sla_level_minutes_sql();
  $waitSecondsSql = atd_home_sla_wait_seconds_sql();
  $nowSql = atd_home_sql_now();

  return "TIMESTAMPDIFF(SECOND, $nowSql, DATE_ADD(atendimentos.abertura, INTERVAL (($levelMinutesSql * 60) + $waitSecondsSql) SECOND))";
}

function atd_home_sql_now()
{
  return "'" . date('Y-m-d H:i:s') . "'";
}

function atd_home_sla_order_sql()
{
  $bellOrderSql = atd_home_sla_bell_order_sql();

  return "CASE
    WHEN atendimentos.`status` = 1 THEN 0
    WHEN atendimentos.`status` = 2 THEN 1 + $bellOrderSql
    WHEN atendimentos.`status` = 5 THEN 10
    WHEN atendimentos.`status` = 3 THEN 11
    WHEN atendimentos.`status` = 4 THEN 12
    WHEN atendimentos.`status` = 0 THEN 13
    ELSE 14
  END";
}

function atd_home_sla_bell_minutes_sql()
{
  $nowSql = atd_home_sql_now();

  return "COALESCE(TIMESTAMPDIFF(MINUTE,
    CASE
      WHEN atendimentos.subcategoria = 97 THEN (
        SELECT MAX(inter_any.inter_data)
        FROM interatividade inter_any
        WHERE inter_any.inter_tipo > 0
          AND inter_any.inter_atd = atendimentos.id
      )
      ELSE (
        SELECT MAX(inter_start.inter_data)
        FROM interatividade inter_start
        WHERE inter_start.inter_tipo IN (1, 6)
          AND inter_start.inter_atd = atendimentos.id
      )
    END,
    $nowSql
  ), 0)";
}

function atd_home_sla_bell_order_sql()
{
  $minutesSql = atd_home_sla_bell_minutes_sql();

  return "CASE
    WHEN $minutesSql >= (SELECT COALESCE(sla_n3, 0) FROM configuracao LIMIT 1) THEN 0
    WHEN $minutesSql >= (SELECT COALESCE(sla_n2, 0) FROM configuracao LIMIT 1) THEN 1
    WHEN $minutesSql >= (SELECT COALESCE(sla_n1, 0) FROM configuracao LIMIT 1) THEN 2
    ELSE 3
  END";
}

function atd_home_fetch_total($pdo, $filters)
{
  $where = atd_home_build_where($filters);
  $sql = 'SELECT COUNT(*) AS total ' . atd_home_base_from_sql() . $where['sql'];
  $stmt = $pdo->prepare($sql);
  atd_home_bind_params($stmt, $where['params']);
  $stmt->execute();
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  return (int)($row['total'] ?? 0);
}

function atd_home_fetch_status_cards($pdo, $filters)
{
  $cards = atd_home_status_cards_definitions();
  foreach ($cards as $key => $card) {
    $cards[$key]['total'] = 0;
  }

  $selects = [];
  foreach ($cards as $key => $card) {
    $statusIds = array_map('intval', $card['status']);
    if (empty($statusIds)) {
      continue;
    }
    $selects[] = 'COALESCE(SUM(CASE WHEN atendimentos.`status` IN (' . implode(', ', $statusIds) . ') THEN 1 ELSE 0 END), 0) AS card_' . (int)$key;
  }

  if (empty($selects)) {
    return $cards;
  }

  $where = atd_home_build_where($filters, [0, 1, 2, 3, 4, 5]);
  $sql = 'SELECT ' . implode(', ', $selects) . ' ' . atd_home_base_from_sql() . $where['sql'];
  $stmt = $pdo->prepare($sql);
  atd_home_bind_params($stmt, $where['params']);
  $stmt->execute();
  $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

  foreach ($cards as $key => $card) {
    $cards[$key]['total'] = (int)($row['card_' . (int)$key] ?? 0);
  }

  return $cards;
}

function atd_home_ids_placeholders($ids, $prefix = 'id')
{
  $params = [];
  $placeholders = [];
  foreach (array_values(array_unique(array_map('intval', $ids))) as $index => $id) {
    if ($id <= 0) {
      continue;
    }
    $name = ':' . $prefix . $index;
    $placeholders[] = $name;
    $params[$name] = $id;
  }

  return [
    'sql' => implode(', ', $placeholders),
    'params' => $params,
  ];
}

function atd_home_hydrate_rows_activity($pdo, $rows)
{
  if (empty($rows)) {
    return $rows;
  }

  $ids = [];
  $interAnyIds = [];
  $interStartIds = [];
  foreach ($rows as $row) {
    $id = (int)$row['id'];
    $ids[] = $id;

    $status = (int)$row['status'];
    if ($status >= 1 && $status < 3) {
      if ((int)$row['subcategoria'] === 97) {
        $interAnyIds[] = $id;
      } else {
        $interStartIds[] = $id;
      }
    }
  }

  $in = atd_home_ids_placeholders($ids, 'atd');
  if ($in['sql'] === '') {
    return $rows;
  }

  $activity = [];
  foreach ($ids as $id) {
    $activity[(int)$id] = [
      'espera_segundos' => 0,
      'espera_ultima_id' => null,
      'espera_ultima_start' => null,
      'espera_ultima_prev' => null,
      'ultima_inter_data' => null,
      'ultima_inter_inicio_data' => null,
    ];
  }

  $stmt = $pdo->prepare('
    SELECT espera_atd, SUM(CASE WHEN espera_end IS NOT NULL THEN TIMESTAMPDIFF(SECOND, espera_start, espera_end) ELSE 0 END) AS espera_segundos
    FROM espera
    WHERE espera_atd IN (' . $in['sql'] . ')
    GROUP BY espera_atd
  ');
  atd_home_bind_params($stmt, $in['params']);
  $stmt->execute();
  while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $id = (int)$row['espera_atd'];
    if (isset($activity[$id])) {
      $activity[$id]['espera_segundos'] = (int)$row['espera_segundos'];
    }
  }

  $stmt = $pdo->prepare('
    SELECT e.espera_atd, e.espera_id, e.espera_start, e.espera_prev
    FROM espera e
    INNER JOIN (
      SELECT espera_atd, MAX(espera_id) AS espera_id
      FROM espera
      WHERE espera_atd IN (' . $in['sql'] . ')
      GROUP BY espera_atd
    ) ult ON ult.espera_atd = e.espera_atd AND ult.espera_id = e.espera_id
  ');
  atd_home_bind_params($stmt, $in['params']);
  $stmt->execute();
  while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $id = (int)$row['espera_atd'];
    if (isset($activity[$id])) {
      $activity[$id]['espera_ultima_id'] = $row['espera_id'];
      $activity[$id]['espera_ultima_start'] = $row['espera_start'];
      $activity[$id]['espera_ultima_prev'] = $row['espera_prev'];
    }
  }

  if (!empty($interAnyIds)) {
    $interIn = atd_home_ids_placeholders($interAnyIds, 'inter_any');
    $stmt = $pdo->prepare('
      SELECT inter_atd, MAX(inter_data) AS ultima_inter_data
      FROM interatividade
      WHERE inter_tipo > 0
        AND inter_atd IN (' . $interIn['sql'] . ')
      GROUP BY inter_atd
    ');
    atd_home_bind_params($stmt, $interIn['params']);
    $stmt->execute();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $id = (int)$row['inter_atd'];
      if (isset($activity[$id])) {
        $activity[$id]['ultima_inter_data'] = $row['ultima_inter_data'];
      }
    }
  }

  if (!empty($interStartIds)) {
    $interIn = atd_home_ids_placeholders($interStartIds, 'inter_start');
    $stmt = $pdo->prepare('
      SELECT inter_atd, MAX(inter_data) AS ultima_inter_inicio_data
      FROM interatividade
      WHERE inter_tipo IN (1, 6)
        AND inter_atd IN (' . $interIn['sql'] . ')
      GROUP BY inter_atd
    ');
    atd_home_bind_params($stmt, $interIn['params']);
    $stmt->execute();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $id = (int)$row['inter_atd'];
      if (isset($activity[$id])) {
        $activity[$id]['ultima_inter_inicio_data'] = $row['ultima_inter_inicio_data'];
      }
    }
  }

  foreach ($rows as $index => $row) {
    $id = (int)$row['id'];
    if (isset($activity[$id])) {
      $rows[$index] = array_merge($row, $activity[$id]);
    }
  }

  return $rows;
}

function atd_home_fetch_rows($pdo, $filters, $page, $pageSize)
{
  $page = max(1, (int)$page);
  $offset = ($page - 1) * $pageSize;
  $where = atd_home_build_where($filters);
  $sortColumns = atd_home_sort_columns();
  $orderSql = $sortColumns[$filters['ord']] ?? $sortColumns['status'];
  $orderDir = $filters['order_dir'] === 'DESC' ? 'DESC' : 'ASC';
  $slaRemainingSql = atd_home_sla_remaining_seconds_sql();
  $slaOrderSql = atd_home_sla_order_sql();
  $slaBellOrderSql = atd_home_sla_bell_order_sql();
  $orderBySql = $filters['ord'] === 'sla'
    ? "sla_ordem ASC, sla_restante_segundos ASC, atendimentos.id ASC"
    : "$orderSql $orderDir, atendimentos.id ASC";

  $sql = "
    SELECT atendimentos.id, atendimentos.cliente, atendimentos.`area`, atendimentos.`tipo`, atendimentos.`local`,
           atendimentos.nivel, atendimentos.prioridade, atendimentos.forma, atendimentos.desc_abertura,
           atendimentos.desc_fechamento, atendimentos.abertura, atendimentos.fechamento, atendimentos.tecnico,
           atendimentos.reincidente, atendimentos.`status`, atendimentos.subcategoria,
           clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
           pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
           locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
           categorias.cat_nome, subcategorias.scat_nome, itens.itens_nome,
           usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail,
           $slaRemainingSql AS sla_restante_segundos,
           $slaOrderSql AS sla_ordem,
           $slaBellOrderSql AS sla_bell_ordem,
           0 AS espera_segundos,
           NULL AS espera_ultima_id,
           NULL AS espera_ultima_start,
           NULL AS espera_ultima_prev,
           NULL AS ultima_inter_data,
           NULL AS ultima_inter_inicio_data
    " . atd_home_rows_from_sql() . "
    " . $where['sql'] . "
    ORDER BY $orderBySql
    LIMIT :limit OFFSET :offset
  ";

  $stmt = $pdo->prepare($sql);
  atd_home_bind_params($stmt, $where['params']);
  $stmt->bindValue(':limit', (int)$pageSize, PDO::PARAM_INT);
  $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
  $stmt->execute();

  return atd_home_hydrate_rows_activity($pdo, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

function atd_home_fetch_clients($pdo)
{
  $params = [];
  $where = ["clientes.clt_sts = '1'"];

  if (isset($_SESSION['tipo']) && (int)$_SESSION['tipo'] === 2 && !empty($_SESSION['empresas']) && is_array($_SESSION['empresas'])) {
    atd_home_add_in_filter($where, $params, 'clientes.clt_id', $_SESSION['empresas'], 'clt_empresa');
  }

  $sql = 'SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE ' . implode(' AND ', $where) . ' ORDER BY clientes.clt_nomef ASC';
  $stmt = $pdo->prepare($sql);
  atd_home_bind_params($stmt, $params);
  $stmt->execute();
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function atd_home_fetch_solicitantes($pdo, $clienteId)
{
  if ((int)$clienteId <= 0) {
    return [];
  }

  $stmt = $pdo->prepare('SELECT pessoa_id, pessoa_nom FROM pessoas WHERE pessoa_clt = :cliente ORDER BY pessoa_nom ASC');
  $stmt->bindValue(':cliente', (int)$clienteId, PDO::PARAM_INT);
  $stmt->execute();
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function atd_home_fetch_tecnicos($pdo)
{
  $stmt = $pdo->prepare("SELECT user_id, user_nome FROM usuarios WHERE user_sts = '1' AND user_id > '1' AND user_funcao IN (2,3,4,5,6,7,9,10,11,12,13,14) ORDER BY user_nome ASC");
  $stmt->execute();
  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function atd_home_fetch_filter_options($pdo, $filters)
{
  return [
    'clientes' => atd_home_fetch_clients($pdo),
    'solicitantes' => atd_home_fetch_solicitantes($pdo, $filters['f_clt']),
    'tecnicos' => atd_home_fetch_tecnicos($pdo),
  ];
}

function atd_home_load_state($pdo, $filters, $page = 1)
{
  $pageSize = atd_home_page_size();
  $rows = atd_home_fetch_rows($pdo, $filters, $page, $pageSize);
  $total = atd_home_fetch_total($pdo, $filters);
  $loaded = min(max(0, ((int)$page - 1) * $pageSize) + count($rows), $total);

  return [
    'filters' => $filters,
    'config' => atd_home_get_config($pdo),
    'options' => atd_home_fetch_filter_options($pdo, $filters),
    'statusCards' => atd_home_fetch_status_cards($pdo, $filters),
    'rows' => $rows,
    'total' => $total,
    'loaded' => $loaded,
    'page' => max(1, (int)$page),
    'pageSize' => $pageSize,
    'nextPage' => max(1, (int)$page) + 1,
    'hasMore' => $loaded < $total,
  ];
}
