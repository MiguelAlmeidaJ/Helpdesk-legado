<?php

function atd_projeto_h($value)
{
  return htmlspecialchars((string)($value ?? ''), ENT_QUOTES, 'UTF-8');
}

function atd_projeto_int($value, $default = 0)
{
  if ($value === null || $value === '') {
    return $default;
  }
  return filter_var($value, FILTER_VALIDATE_INT) !== false ? (int)$value : $default;
}

function atd_projeto_statuses($statusFilter)
{
  $statusFilter = (string)$statusFilter;
  if ($statusFilter === '10') {
    return [0, 1, 2, 3, 4];
  }
  if ($statusFilter === '11' || $statusFilter === '') {
    return [1, 2, 3];
  }
  $status = atd_projeto_int($statusFilter, 11);
  if (in_array($status, [0, 1, 2, 3, 4], true)) {
    return [$status];
  }
  return [1, 2, 3];
}

function atd_projeto_collect_filters(array $source, $type = 'projects')
{
  $status = $source['f_sts'] ?? 11;
  $page = max(1, atd_projeto_int($source['page'] ?? 1, 1));
  $perPage = atd_projeto_int($source['per_page'] ?? 30, 30);
  $perPage = min(max($perPage, 10), 100);

  $filters = [
    'type' => $type,
    'f_sts' => (string)$status,
    'statuses' => atd_projeto_statuses($status),
    'f_clt' => atd_projeto_int($source['f_clt'] ?? 0),
    'f_sol' => atd_projeto_int($source['f_sol'] ?? 0),
    'f_tec' => (string)($source['f_tec'] ?? 'all'),
    'f_id' => trim((string)($source['f_id'] ?? '')),
    'f_palavra' => trim((string)($source['f_palavra'] ?? '')),
    'data_1' => trim((string)($source['data_1'] ?? '')),
    'data_2' => trim((string)($source['data_2'] ?? '')),
    'page' => $page,
    'per_page' => $perPage,
    'offset' => ($page - 1) * $perPage,
  ];

  if ($filters['f_tec'] !== 'all' && filter_var($filters['f_tec'], FILTER_VALIDATE_INT) === false) {
    $filters['f_tec'] = 'all';
  }

  $order = atd_projeto_normalize_order($source['ord'] ?? 'status', $source['order_dir'] ?? 'ASC', $type);
  $filters['ord'] = $order['key'];
  $filters['order_dir'] = $order['dir'];
  $filters['order_sql'] = $order['sql'];

  return $filters;
}

function atd_projeto_normalize_order($order, $direction, $type = 'projects')
{
  $direction = strtoupper((string)$direction) === 'DESC' ? 'DESC' : 'ASC';
  $maps = [
    'projects' => [
      'id' => 'projetos.id',
      'cliente' => 'clientes.clt_nomef',
      'abertura' => 'projetos.abertura',
      'tecnico' => 'tecnico_nome',
      'status' => 'projetos.status',
      'nivel' => 'projetos.nivel',
      'forma' => 'projetos.forma',
    ],
    'tasks' => [
      'id' => 'tarefas.id',
      'cliente' => 'clientes.clt_nomef',
      'abertura' => 'tarefas.abertura',
      'tecnico' => 'tecnico_nome',
      'status' => 'tarefas.status',
      'nivel' => 'tarefas.nivel',
      'forma' => 'tarefas.forma',
      'projeto' => 'tarefas.id_projeto',
    ],
  ];

  $map = $maps[$type] ?? $maps['projects'];
  $key = array_key_exists((string)$order, $map) ? (string)$order : 'status';

  return [
    'key' => $key,
    'dir' => $direction,
    'sql' => $map[$key] . ' ' . $direction,
  ];
}

function atd_projeto_company_filter($column, array &$params)
{
  if (!isset($_SESSION['tipo'], $_SESSION['empresas']) || (int)$_SESSION['tipo'] !== 2 || !is_array($_SESSION['empresas'])) {
    return '';
  }

  $ids = array_values(array_filter(array_map('intval', $_SESSION['empresas']), function ($id) {
    return $id > 0;
  }));

  if (!$ids) {
    return ' AND 1 = 0';
  }

  $holders = [];
  foreach ($ids as $idx => $id) {
    $key = ':empresa_' . $idx;
    $holders[] = $key;
    $params[$key] = $id;
  }

  return ' AND ' . $column . ' IN (' . implode(',', $holders) . ')';
}

function atd_projeto_build_where($alias, array $filters, array &$params, $isTask = false)
{
  $where = [];
  $statusHolders = [];
  foreach ($filters['statuses'] as $idx => $status) {
    $key = ':status_' . $idx;
    $statusHolders[] = $key;
    $params[$key] = $status;
  }
  $where[] = $alias . '.status IN (' . implode(',', $statusHolders) . ')';

  if ($filters['f_clt'] > 0) {
    $where[] = $alias . '.cliente = :f_clt';
    $params[':f_clt'] = $filters['f_clt'];
  }

  if ($filters['f_sol'] > 0 && $filters['f_clt'] > 0) {
    $where[] = $alias . '.pessoa = :f_sol';
    $params[':f_sol'] = $filters['f_sol'];
  }

  if ($filters['f_tec'] !== 'all') {
    $where[] = $alias . '.tecnico = :f_tec';
    $params[':f_tec'] = (int)$filters['f_tec'];
  }

  if ($filters['f_id'] !== '' && ctype_digit($filters['f_id'])) {
    $where[] = $alias . '.id = :f_id';
    $params[':f_id'] = (int)$filters['f_id'];
  }

  if ($isTask && $filters['f_palavra'] !== '') {
    $where[] = '(LOWER(tarefas.nome_tarefa) LIKE LOWER(:f_palavra)
      OR LOWER(tarefas.desc_abertura) LIKE LOWER(:f_palavra)
      OR LOWER(tarefas.desc_fechamento) LIKE LOWER(:f_palavra)
      OR LOWER(clientes.clt_nomef) LIKE LOWER(:f_palavra))';
    $params[':f_palavra'] = '%' . $filters['f_palavra'] . '%';
  }

  if ($isTask && $filters['data_1'] !== '' && $filters['data_2'] !== '') {
    $where[] = 'tarefas.abertura BETWEEN :data_1 AND :data_2';
    $params[':data_1'] = $filters['data_1'] . ' 00:00:00';
    $params[':data_2'] = $filters['data_2'] . ' 23:59:59';
  }

  return ' WHERE ' . implode(' AND ', $where);
}

function atd_projeto_bind_params(PDOStatement $stmt, array $params)
{
  foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
  }
}

function atd_projeto_fetch_projects(PDO $pdo, array $filters)
{
  $params = [];
  $where = atd_projeto_build_where('projetos', $filters, $params, false);
  $where .= atd_projeto_company_filter('clientes.clt_id', $params);

  $baseJoins = "
    FROM projetos
    INNER JOIN clientes ON projetos.cliente = clientes.clt_id
    LEFT JOIN pessoas ON projetos.pessoa = pessoas.pessoa_id
    LEFT JOIN locais ON projetos.local = locais.local_id
    LEFT JOIN categorias ON projetos.categoria = categorias.cat_id
    LEFT JOIN subcategorias ON projetos.subcategoria = subcategorias.scat_id
    LEFT JOIN itens ON projetos.item = itens.itens_id
    LEFT JOIN usuarios AS tecnico ON projetos.tecnico = tecnico.user_id
  ";

  $dataJoins = $baseJoins . "
    LEFT JOIN (
      SELECT espera_projeto, SUM(TIMESTAMPDIFF(SECOND, espera_start, COALESCE(espera_end, NOW()))) AS espera_segundos
      FROM espera_projeto
      GROUP BY espera_projeto
    ) espera_total ON espera_total.espera_projeto = projetos.id
    LEFT JOIN (
      SELECT inter_projeto, MAX(inter_data) AS ultima_interacao
      FROM inter_projeto
      WHERE inter_tipo > 0
      GROUP BY inter_projeto
    ) inter_total ON inter_total.inter_projeto = projetos.id
  ";

  $countSql = "SELECT COUNT(*) " . $baseJoins . $where;
  $count = $pdo->prepare($countSql);
  atd_projeto_bind_params($count, $params);
  $count->execute();
  $total = (int)$count->fetchColumn();

  $sql = "SELECT
      projetos.*,
      clientes.clt_nomef, clientes.clt_nomer,
      pessoas.pessoa_nom,
      locais.local_nom,
      categorias.cat_nome,
      subcategorias.scat_nome,
      itens.itens_nome,
      tecnico.user_nome AS tecnico_nome,
      COALESCE(espera_total.espera_segundos, 0) AS espera_segundos,
      inter_total.ultima_interacao
    " . $dataJoins . $where . "
    ORDER BY " . $filters['order_sql'] . ", projetos.id DESC
    LIMIT :limit OFFSET :offset";

  $stmt = $pdo->prepare($sql);
  atd_projeto_bind_params($stmt, $params);
  $stmt->bindValue(':limit', $filters['per_page'], PDO::PARAM_INT);
  $stmt->bindValue(':offset', $filters['offset'], PDO::PARAM_INT);
  $stmt->execute();

  return [
    'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    'pagination' => atd_projeto_pagination($total, $filters),
  ];
}

function atd_projeto_fetch_tasks(PDO $pdo, array $filters)
{
  $params = [];
  $where = atd_projeto_build_where('tarefas', $filters, $params, true);
  $where .= atd_projeto_company_filter('clientes.clt_id', $params);

  $baseJoins = "
    FROM tarefas
    INNER JOIN clientes ON tarefas.cliente = clientes.clt_id
    LEFT JOIN pessoas ON tarefas.pessoa = pessoas.pessoa_id
    LEFT JOIN locais ON tarefas.local = locais.local_id
    LEFT JOIN categorias ON tarefas.categoria = categorias.cat_id
    LEFT JOIN subcategorias ON tarefas.subcategoria = subcategorias.scat_id
    LEFT JOIN itens ON tarefas.item = itens.itens_id
    LEFT JOIN usuarios AS tecnico ON tarefas.tecnico = tecnico.user_id
    LEFT JOIN projetos ON tarefas.id_projeto = projetos.id
  ";

  $dataJoins = $baseJoins . "
    LEFT JOIN (
      SELECT espera_tarefa, SUM(TIMESTAMPDIFF(SECOND, espera_start, COALESCE(espera_end, NOW()))) AS espera_segundos
      FROM espera_tarefas
      GROUP BY espera_tarefa
    ) espera_total ON espera_total.espera_tarefa = tarefas.id
    LEFT JOIN (
      SELECT inter_tarefa, MAX(inter_data) AS ultima_interacao
      FROM inter_tarefa
      WHERE inter_tipo > 0
      GROUP BY inter_tarefa
    ) inter_total ON inter_total.inter_tarefa = tarefas.id
  ";

  $countSql = "SELECT COUNT(*) " . $baseJoins . $where;
  $count = $pdo->prepare($countSql);
  atd_projeto_bind_params($count, $params);
  $count->execute();
  $total = (int)$count->fetchColumn();

  $sql = "SELECT
      tarefas.*,
      projetos.nome_proj,
      clientes.clt_nomef, clientes.clt_nomer,
      pessoas.pessoa_nom,
      locais.local_nom,
      categorias.cat_nome,
      subcategorias.scat_nome,
      itens.itens_nome,
      tecnico.user_nome AS tecnico_nome,
      COALESCE(espera_total.espera_segundos, 0) AS espera_segundos,
      inter_total.ultima_interacao
    " . $dataJoins . $where . "
    ORDER BY " . $filters['order_sql'] . ", tarefas.id DESC
    LIMIT :limit OFFSET :offset";

  $stmt = $pdo->prepare($sql);
  atd_projeto_bind_params($stmt, $params);
  $stmt->bindValue(':limit', $filters['per_page'], PDO::PARAM_INT);
  $stmt->bindValue(':offset', $filters['offset'], PDO::PARAM_INT);
  $stmt->execute();

  return [
    'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    'pagination' => atd_projeto_pagination($total, $filters),
  ];
}

function atd_projeto_pagination($total, array $filters)
{
  $loaded = min($total, $filters['offset'] + $filters['per_page']);
  $pages = max(1, (int)ceil($total / $filters['per_page']));
  return [
    'total' => $total,
    'loaded' => $loaded,
    'page' => $filters['page'],
    'pages' => $pages,
    'per_page' => $filters['per_page'],
    'has_prev' => $filters['page'] > 1,
    'has_next' => $filters['page'] < $pages,
    'has_more' => $filters['page'] < $pages,
    'next_page' => $filters['page'] < $pages ? $filters['page'] + 1 : null,
  ];
}

function atd_projeto_status_badge($status)
{
  $map = [
    0 => ['Agendado', 'secondary', 'far fa-clock'],
    1 => ['Aguardando', 'warning', 'fas fa-hourglass-half'],
    2 => ['Em execucao', 'info', 'fas fa-magic'],
    3 => ['Em espera', 'danger', 'far fa-pause-circle'],
    4 => ['Concluido', 'success', 'fas fa-check'],
  ];
  $item = $map[(int)$status] ?? ['Indefinido', 'light', 'far fa-circle'];
  return '<span class="badge projeto-status-badge projeto-status-' . (int)$status . '"><i class="' . $item[2] . '"></i> ' . $item[0] . '</span>';
}

function atd_projeto_nivel_badge($nivel)
{
  if ((int)$nivel <= 0) {
    return '<span class="badge badge-light">NA</span>';
  }
  return '<span class="badge badge-info">Nivel ' . (int)$nivel . '</span>';
}

function atd_projeto_forma_nome($forma)
{
  $map = [
    1 => 'Remoto',
    2 => 'Presencial',
    3 => 'Remoto - Plantao',
    4 => 'Presencial - Plantao',
  ];
  return $map[(int)$forma] ?? 'Nao informado';
}

function atd_projeto_desc($text, $limit = 180)
{
  $plain = trim(strip_tags(html_entity_decode((string)$text, ENT_QUOTES, 'UTF-8')));
  if (function_exists('mb_strlen') && mb_strlen($plain, 'UTF-8') > $limit) {
    return mb_substr($plain, 0, $limit, 'UTF-8') . '...';
  }
  if (!function_exists('mb_strlen') && strlen($plain) > $limit) {
    return substr($plain, 0, $limit) . '...';
  }
  return $plain;
}

function atd_projeto_sort_button($key, $label, array $filters)
{
  $nextDir = ($filters['ord'] === $key && $filters['order_dir'] === 'ASC') ? 'DESC' : 'ASC';
  $icon = $filters['ord'] === $key ? ($filters['order_dir'] === 'ASC' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort';
  return '<button type="button" class="btn btn-link btn-sm p-0 projeto-sort" data-projeto-sort="' . atd_projeto_h($key) . '" data-projeto-dir="' . $nextDir . '"><i class="fas ' . $icon . '"></i> ' . atd_projeto_h($label) . '</button>';
}

function atd_projeto_render_projects_table(array $rows, array $filters, array $pagination)
{
  ob_start();
  ?>
  <div class="projeto-list-shell" data-list-kind="projects">
    <div class="projeto-list-meta">
      <span>Total: <strong><?php echo (int)$pagination['total']; ?></strong></span>
      <span>Exibindo <?php echo (int)$pagination['loaded']; ?> de <?php echo (int)$pagination['total']; ?></span>
    </div>
    <div class="projeto-table-wrap">
      <table class="table table-hover small projeto-table">
        <thead>
          <tr>
            <th><?php echo atd_projeto_sort_button('id', 'ID', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('cliente', 'Cliente', $filters); ?></th>
            <th>Projeto</th>
            <th><?php echo atd_projeto_sort_button('abertura', 'Abertura', $filters); ?></th>
            <th>Categoria</th>
            <th><?php echo atd_projeto_sort_button('nivel', 'Nivel', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('forma', 'Forma', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('tecnico', 'Tecnico', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('status', 'Status', $filters); ?></th>
          </tr>
        </thead>
        <tbody>
          <?php echo atd_projeto_render_project_rows($rows); ?>
        </tbody>
      </table>
    </div>
    <?php echo atd_projeto_render_infinite_loader($pagination, 'projetos'); ?>
  </div>
  <?php
  return ob_get_clean();
}

function atd_projeto_render_project_rows(array $rows)
{
  ob_start();
  if (!$rows) { ?>
    <tr>
      <td colspan="9" class="text-center text-muted py-4">Nenhum projeto encontrado para os filtros atuais.</td>
    </tr>
  <?php } ?>
  <?php foreach ($rows as $row) { ?>
    <tr class="projeto-open-row" data-projeto-open-url="projeto.php?projeto=<?php echo (int)$row['id']; ?>">
      <td class="align-middle font-weight-bold">#<?php echo str_pad((int)$row['id'], 5, '0', STR_PAD_LEFT); ?></td>
      <td class="align-middle">
        <strong><?php echo atd_projeto_h($row['clt_nomef']); ?></strong><br>
        <span class="text-muted"><i class="far fa-user"></i> <?php echo atd_projeto_h($row['pessoa_nom']); ?></span>
      </td>
      <td class="align-middle projeto-desc-cell">
        <div class="projeto-project-summary">
          <strong class="projeto-project-title"><?php echo atd_projeto_h(atd_projeto_desc($row['nome_proj'], 75)); ?></strong>
          <span class="text-muted projeto-project-description"><?php echo atd_projeto_h(atd_projeto_desc($row['desc_abertura'] ?? '', 95)); ?></span>
        </div>
      </td>
      <td class="align-middle"><?php echo $row['abertura'] ? date('d/m/y H:i', strtotime($row['abertura'])) : '-'; ?></td>
      <td class="align-middle">
        <?php echo atd_projeto_h($row['cat_nome']); ?><br>
        <span class="text-muted"><?php echo atd_projeto_h($row['scat_nome']); ?></span>
      </td>
      <td class="align-middle"><?php echo atd_projeto_nivel_badge($row['nivel']); ?></td>
      <td class="align-middle"><?php echo atd_projeto_h(atd_projeto_forma_nome($row['forma'])); ?></td>
      <td class="align-middle"><?php echo atd_projeto_h($row['tecnico_nome'] ?: 'Nao direcionado'); ?></td>
      <td class="align-middle"><?php echo atd_projeto_status_badge($row['status']); ?></td>
    </tr>
  <?php }
  return ob_get_clean();
}

function atd_projeto_render_tasks_table(array $rows, array $filters, array $pagination)
{
  ob_start();
  ?>
  <div class="projeto-list-shell" data-list-kind="tasks">
    <div class="projeto-list-meta">
      <span>Total: <strong><?php echo (int)$pagination['total']; ?></strong></span>
      <span>Exibindo <?php echo (int)$pagination['loaded']; ?> de <?php echo (int)$pagination['total']; ?></span>
    </div>
    <div class="projeto-table-wrap">
      <table class="table table-hover small projeto-table">
        <thead>
          <tr>
            <th><?php echo atd_projeto_sort_button('id', 'ID', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('cliente', 'Cliente', $filters); ?></th>
            <th>Tarefa</th>
            <th><?php echo atd_projeto_sort_button('abertura', 'Abertura', $filters); ?></th>
            <th>Projeto</th>
            <th>Categoria</th>
            <th><?php echo atd_projeto_sort_button('nivel', 'Nivel', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('forma', 'Forma', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('tecnico', 'Tecnico', $filters); ?></th>
            <th><?php echo atd_projeto_sort_button('status', 'Status', $filters); ?></th>
          </tr>
        </thead>
        <tbody>
          <?php echo atd_projeto_render_task_rows($rows); ?>
        </tbody>
      </table>
    </div>
    <?php echo atd_projeto_render_infinite_loader($pagination, 'tarefas'); ?>
  </div>
  <?php
  return ob_get_clean();
}

function atd_projeto_render_task_rows(array $rows)
{
  ob_start();
  if (!$rows) { ?>
    <tr>
      <td colspan="10" class="text-center text-muted py-4">Nenhuma tarefa encontrada para os filtros atuais.</td>
    </tr>
  <?php } ?>
  <?php foreach ($rows as $row) { ?>
    <tr class="projeto-open-row" data-projeto-open-url="tarefa.php?tarefa=<?php echo (int)$row['id']; ?>">
      <td class="align-middle font-weight-bold">#<?php echo str_pad((int)$row['id'], 5, '0', STR_PAD_LEFT); ?></td>
      <td class="align-middle">
        <strong><?php echo atd_projeto_h($row['clt_nomef']); ?></strong><br>
        <span class="text-muted"><i class="far fa-user"></i> <?php echo atd_projeto_h($row['pessoa_nom']); ?></span>
      </td>
      <td class="align-middle projeto-desc-cell">
        <div class="projeto-project-summary">
          <strong class="projeto-project-title"><?php echo atd_projeto_h(atd_projeto_desc($row['nome_tarefa'], 75)); ?></strong>
          <span class="text-muted projeto-project-description"><?php echo atd_projeto_h(atd_projeto_desc($row['desc_abertura'] ?? '', 95)); ?></span>
        </div>
      </td>
      <td class="align-middle"><?php echo $row['abertura'] ? date('d/m/y H:i', strtotime($row['abertura'])) : '-'; ?></td>
      <td class="align-middle"><?php echo atd_projeto_h(atd_projeto_desc($row['nome_proj'] ?: '-', 60)); ?></td>
      <td class="align-middle">
        <?php echo atd_projeto_h($row['cat_nome']); ?><br>
        <span class="text-muted"><?php echo atd_projeto_h($row['scat_nome']); ?></span>
      </td>
      <td class="align-middle"><?php echo atd_projeto_nivel_badge($row['nivel']); ?></td>
      <td class="align-middle"><?php echo atd_projeto_h(atd_projeto_forma_nome($row['forma'])); ?></td>
      <td class="align-middle"><?php echo atd_projeto_h($row['tecnico_nome'] ?: 'Nao direcionado'); ?></td>
      <td class="align-middle"><?php echo atd_projeto_status_badge($row['status']); ?></td>
    </tr>
  <?php }
  return ob_get_clean();
}

function atd_projeto_render_pagination(array $pagination)
{
  ob_start();
  ?>
  <div class="projeto-pagination">
    <button type="button" class="btn btn-outline-secondary btn-sm" data-projeto-page="<?php echo max(1, (int)$pagination['page'] - 1); ?>" <?php echo $pagination['has_prev'] ? '' : 'disabled'; ?>>
      <i class="fas fa-chevron-left"></i> Anterior
    </button>
    <span>Pagina <?php echo (int)$pagination['page']; ?> de <?php echo (int)$pagination['pages']; ?></span>
    <button type="button" class="btn btn-outline-secondary btn-sm" data-projeto-page="<?php echo (int)$pagination['page'] + 1; ?>" <?php echo $pagination['has_next'] ? '' : 'disabled'; ?>>
      Proxima <i class="fas fa-chevron-right"></i>
    </button>
  </div>
  <?php
  return ob_get_clean();
}

function atd_projeto_render_infinite_loader(array $pagination, $label = 'registros')
{
  $hasMore = !empty($pagination['has_more']);
  $label = preg_replace('/[^a-zA-Z0-9 çÇãÃáÁéÉíÍóÓúÚâÂêÊôÔõÕ]/u', '', (string)$label);
  $normalizedLabel = function_exists('mb_strtolower') ? mb_strtolower($label, 'UTF-8') : strtolower($label);
  $doneText = $normalizedLabel === 'tarefas'
    ? 'Todas as tarefas foram exibidas.'
    : 'Todos os ' . $label . ' foram exibidos.';
  ob_start();
  ?>
  <div class="projeto-infinite-loader" data-projeto-infinite-loader data-next-page="<?php echo $hasMore ? (int)$pagination['next_page'] : ''; ?>" data-has-more="<?php echo $hasMore ? '1' : '0'; ?>">
    <?php if ($hasMore) { ?>
      <span class="projeto-infinite-spinner" aria-hidden="true"></span>
      <span>Role para carregar mais <?php echo atd_projeto_h($label); ?></span>
    <?php } else { ?>
      <span><?php echo atd_projeto_h($doneText); ?></span>
    <?php } ?>
  </div>
  <?php
  return ob_get_clean();
}
