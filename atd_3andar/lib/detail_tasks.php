<?php

function atd_3andar_detail_h($value)
{
  return htmlspecialchars((string)($value ?? ''), ENT_QUOTES, 'UTF-8');
}

function atd_3andar_detail_order_sql($ord, $dir)
{
  $dir = strtoupper((string)$dir) === 'DESC' ? 'DESC' : 'ASC';

  $map = [
    'abertura' => 'tarefas_terc_andar.abertura',
    'tecnico' => 'tecnico_nome',
    'status' => 'tarefas_terc_andar.status',
    'cliente' => 'tarefas_terc_andar.abertura',
  ];

  $key = array_key_exists((string)$ord, $map) ? (string)$ord : 'cliente';

  return $map[$key] . ' ' . $dir;
}

function atd_3andar_detail_status_info($status)
{
  $labels = [
    0 => ['label' => 'Agendada', 'class' => 'projeto-status-0', 'percent' => 0, 'icon' => 'far fa-clock'],
    1 => ['label' => 'Aguardando', 'class' => 'projeto-status-1', 'percent' => 10, 'icon' => 'fas fa-hourglass-half'],
    2 => ['label' => 'Em execucao', 'class' => 'projeto-status-2', 'percent' => 50, 'icon' => 'fas fa-magic'],
    3 => ['label' => 'Em espera', 'class' => 'projeto-status-3', 'percent' => 35, 'icon' => 'far fa-pause-circle'],
    4 => ['label' => 'Finalizada', 'class' => 'projeto-status-4', 'percent' => 100, 'icon' => 'fas fa-check'],
  ];
  return $labels[(int)$status] ?? $labels[1];
}

function atd_3andar_detail_fetch_tasks(PDO $pdo, array $filters)
{
  $page = max(1, (int)($filters['page'] ?? 1));
  $perPage = min(max((int)($filters['per_page'] ?? 15), 5), 50);
  $offset = ($page - 1) * $perPage;

  $projectId = (int)($filters['projeto'] ?? 0);
  $tecnico = (string)($filters['tecnico'] ?? '%');
  $solicitante = (string)($filters['solicitante'] ?? '%');

  $orderBy = atd_3andar_detail_order_sql($filters['ord'] ?? 'cliente', $filters['dir'] ?? 'ASC');

  $baseSql = "
    FROM tarefas_terc_andar

    LEFT JOIN pessoas 
      ON pessoas.pessoa_id = tarefas_terc_andar.pessoa

    LEFT JOIN categorias_terc_andar AS categorias 
      ON categorias.id = tarefas_terc_andar.categoria

    LEFT JOIN subcategorias_terc_andar AS subcategorias 
      ON subcategorias.id = tarefas_terc_andar.subcategoria

    LEFT JOIN itens 
      ON itens.itens_id = tarefas_terc_andar.item

    LEFT JOIN usuarios 
      ON usuarios.user_id = tarefas_terc_andar.tecnico

    WHERE tarefas_terc_andar.id_projeto = :projeto
      AND tarefas_terc_andar.tecnico LIKE :tecnico
      AND tarefas_terc_andar.pessoa LIKE :solicitante
  ";

  $count = $pdo->prepare("SELECT COUNT(*) " . $baseSql);
  $count->bindValue(':projeto', $projectId, PDO::PARAM_INT);
  $count->bindValue(':tecnico', $tecnico);
  $count->bindValue(':solicitante', $solicitante);
  $count->execute();

  $total = (int)$count->fetchColumn();

  $stmt = $pdo->prepare("
    SELECT 
      tarefas_terc_andar.id AS id_tarefa,
      tarefas_terc_andar.nome_tarefa,
      tarefas_terc_andar.desc_abertura,
      tarefas_terc_andar.abertura,
      tarefas_terc_andar.tecnico,
      tarefas_terc_andar.status,

      pessoas.pessoa_nom,

      categorias.nome AS cat_nome,
      subcategorias.nome AS scat_nome,

      itens.itens_nome,

      usuarios.user_nome AS tecnico_nome

    " . $baseSql . "

    ORDER BY 
      CASE WHEN tarefas_terc_andar.status = 4 THEN 1 ELSE 0 END ASC,
      " . $orderBy . "

    LIMIT :limit OFFSET :offset
  ");

  $stmt->bindValue(':projeto', $projectId, PDO::PARAM_INT);
  $stmt->bindValue(':tecnico', $tecnico);
  $stmt->bindValue(':solicitante', $solicitante);
  $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
  $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
  $stmt->execute();

  $loaded = min($total, $offset + $perPage);

  return [
    'rows' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    'pagination' => [
      'total' => $total,
      'loaded' => $loaded,
      'page' => $page,
      'per_page' => $perPage,
      'has_more' => $loaded < $total,
      'next_page' => $loaded < $total ? $page + 1 : null,
    ],
  ];
}

function atd_3andar_detail_render_task_rows(array $rows)
{
  ob_start();

  foreach ($rows as $task) {
    $taskId = (int)$task['id_tarefa'];
    $taskStatus = (int)$task['status'];

    $statusInfo = atd_3andar_detail_status_info($taskStatus);
    $taskPercent = (int)$statusInfo['percent'];

    $taskTitle = trim((string)$task['nome_tarefa']) !== ''
      ? $task['nome_tarefa']
      : strip_tags((string)$task['desc_abertura']);

    $taskOpenLabel = !empty($task['abertura'])
      ? date('d/m/y H:i', strtotime($task['abertura']))
      : '-';

    $taskTech = ((int)$task['tecnico'] === 0 || empty($task['tecnico_nome']))
      ? 'Nao direcionado'
      : $task['tecnico_nome'];
    ?>

    <div class="projeto-task-row <?php echo $taskStatus === 4 ? 'is-done' : 'is-open'; ?>" data-task-card data-task-status="<?php echo $taskStatus; ?>">
      <div class="projeto-task-main">
        <strong><?php echo atd_3andar_detail_h($taskTitle); ?></strong>

        <div class="projeto-task-meta">
          Aberta em <?php echo atd_3andar_detail_h($taskOpenLabel); ?>

          <?php if (!empty($task['pessoa_nom'])) { ?>
            - Solicitante: <?php echo atd_3andar_detail_h($task['pessoa_nom']); ?>
          <?php } ?>
        </div>

        <div class="projeto-task-badges">
          <?php if (!empty($task['cat_nome'])) { ?>
            <span><?php echo atd_3andar_detail_h($task['cat_nome']); ?></span>
          <?php } ?>

          <?php if (!empty($task['scat_nome'])) { ?>
            <span><?php echo atd_3andar_detail_h($task['scat_nome']); ?></span>
          <?php } ?>

          <?php if (!empty($task['itens_nome'])) { ?>
            <span><?php echo atd_3andar_detail_h($task['itens_nome']); ?></span>
          <?php } ?>
        </div>
      </div>

      <div class="projeto-task-owner">
        <span>Responsavel</span>
        <strong><?php echo atd_3andar_detail_h($taskTech); ?></strong>
      </div>

      <div class="projeto-task-date">
        <span>Abertura</span>
        <strong><?php echo atd_3andar_detail_h($taskOpenLabel); ?></strong>
      </div>

      <div class="projeto-task-state">
        <span class="projeto-status-badge <?php echo $statusInfo['class']; ?>">
          <i class="<?php echo $statusInfo['icon']; ?>"></i> <?php echo $statusInfo['label']; ?>
        </span>
      </div>

      <div class="projeto-task-progress">
        <div class="projeto-progress-track">
          <span style="width: <?php echo $taskPercent; ?>%;"></span>
        </div>
        <small><?php echo $taskPercent; ?>%</small>
      </div>

      <form action="tarefa.php" method="POST" class="projeto-task-action">
        <input type="hidden" name="tarefa" value="<?php echo $taskId; ?>">
        <button type="submit" class="btn btn-light btn-sm projeto-open-task-btn">
          <i class="far fa-folder-open"></i> Ver
        </button>
      </form>
    </div>

    <?php
  }

  return ob_get_clean();
}

function atd_3andar_detail_render_loader(array $pagination)
{
  $hasMore = !empty($pagination['has_more']);
  ob_start();
  ?>
  <div class="projeto-detail-task-loader" data-project-task-loader data-next-page="<?php echo $hasMore ? (int)$pagination['next_page'] : ''; ?>" data-has-more="<?php echo $hasMore ? '1' : '0'; ?>">
    <?php if ($hasMore) { ?>
      <span class="projeto-infinite-spinner" aria-hidden="true"></span>
      <span>Role para carregar mais tarefas</span>
    <?php } else { ?>
      <span>Todas as tarefas foram exibidas.</span>
    <?php } ?>
  </div>
  <?php
  return ob_get_clean();
}
