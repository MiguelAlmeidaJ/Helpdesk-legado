<?php

function atd_home_date_label($date)
{
  if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    return '';
  }
  $parts = explode('-', $date);
  return $parts[2] . '/' . $parts[1] . '/' . $parts[0];
}

function atd_home_short_text($text, $length)
{
  $text = (string)$text;
  if (function_exists('mb_substr')) {
    return mb_substr($text, 0, $length, 'UTF-8');
  }
  return substr($text, 0, $length);
}

function atd_home_preview_text($text, $length = 75)
{
  $text = html_entity_decode((string)$text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $text = trim(preg_replace('/\s+/', ' ', strip_tags($text)));

  if (function_exists('mb_strlen') && function_exists('mb_substr')) {
    if (mb_strlen($text, 'UTF-8') <= $length) {
      return $text;
    }
    return rtrim(mb_substr($text, 0, $length, 'UTF-8')) . '...';
  }

  if (strlen($text) <= $length) {
    return $text;
  }
  return rtrim(substr($text, 0, $length)) . '...';
}

function atd_home_render_hidden_filters($filters, $exclude = [])
{
  $exclude = array_flip($exclude);
  $html = '';
  $scalars = [
    'f_clt' => $filters['f_clt'],
    'f_sol' => $filters['f_sol'],
    'f_sts' => $filters['f_sts'],
    'f_id' => $filters['f_id'],
    'f_date_1' => $filters['f_date_1'],
    'f_date_2' => $filters['f_date_2'],
    'f_palavra' => $filters['f_palavra_raw'],
    'ord' => $filters['ord'],
    'order_dir' => $filters['order_dir'],
  ];

  foreach ($scalars as $name => $value) {
    if (isset($exclude[$name])) {
      continue;
    }
    $html .= '<input type="hidden" name="' . atd_home_h($name) . '" value="' . atd_home_h($value) . '">' . "\n";
  }

  if (!isset($exclude['f_tipo'])) {
    foreach ((array)$filters['f_tipo'] as $value) {
      $html .= '<input type="hidden" name="f_tipo[]" value="' . atd_home_h($value) . '">' . "\n";
    }
  }

  if (!isset($exclude['f_tec'])) {
    foreach ((array)$filters['f_tec'] as $value) {
      $html .= '<input type="hidden" name="f_tec[]" value="' . atd_home_h($value) . '">' . "\n";
    }
  }

  return $html;
}

function atd_home_next_order_dir($filters, $column)
{
  return ($filters['ord'] === $column && $filters['order_dir'] === 'ASC') ? 'DESC' : 'ASC';
}

function atd_home_render_status_cards($cards, $filters)
{
  ob_start();
?>
  <div class="status-card-bar">
    <?php foreach ($cards as $key => $card) { ?>
      <form action="#" method="POST" class="status-card-form" data-atd-dynamic-form="1">
        <?php echo atd_home_render_hidden_filters($filters, ['f_sts']); ?>
        <input type="hidden" name="f_sts" value="<?php echo (int)$key; ?>">
        <button type="submit"
          class="status-card-btn <?php echo ((int)$filters['f_sts'] === (int)$key) ? 'active' : ''; ?>"
          style="border-color: <?php echo atd_home_h($card['border']); ?>;">
          <span class="status-card-total"><?php echo (int)$card['total']; ?></span>
          <span class="status-card-label"><?php echo atd_home_h($card['label']); ?></span>
        </button>
      </form>
    <?php } ?>
  </div>
<?php
  return ob_get_clean();
}

function atd_home_tipo_label($selected)
{
  $labels = [
    0 => 'Nao Informado',
    1 => 'Falha',
    2 => 'Relacionamento',
    3 => 'Requisicao de Servicos',
    4 => 'Requisicao de Informacao',
    6 => 'Melhoria',
  ];

  if (empty($selected)) {
    return 'Selecione';
  }
  if (count($selected) === 1) {
    $key = (int)$selected[0];
    return $labels[$key] ?? 'Selecionado';
  }
  return count($selected) . ' selecionados';
}

function atd_home_tecnico_label($selected, $tecnicos)
{
  if (empty($selected)) {
    return 'Selecione o tecnico';
  }
  if (count($selected) === 1) {
    $id = (int)$selected[0];
    if ($id === 0) {
      return 'Nao direcionado';
    }
    foreach ($tecnicos as $tecnico) {
      if ((int)$tecnico['user_id'] === $id) {
        return $tecnico['user_nome'];
      }
    }
  }
  return count($selected) . ' selecionados';
}

function atd_home_render_filters($filters, $options, $total)
{
  $tiposAtendimento = [
    1 => 'Falha',
    2 => 'Relacionamento',
    3 => 'Requisicao de Servicos',
    4 => 'Requisicao de Informacao',
    6 => 'Melhoria',
    0 => 'Nao Informado',
  ];
  $showAdvanced = !isset($_SESSION['tipo']) || (int)$_SESSION['tipo'] !== 2;
  $showPeriod = !isset($_SESSION['allterusN3Id']) || (int)$_SESSION['allterusN3Id'] !== 134;
  ob_start();
?>
  <div class="card-header py-1 filters-toolbar">
    <form action="#" method="POST" id="form-filtros" data-atd-dynamic-form="1">
      <div class="form-row align-items-center">
        <div class="col-auto col-form-label-sm">
          <label class="my-0">Cliente:</label>
          <select name="f_clt" class="form-control form-control-sm" tabindex="1">
            <option value="0">Todos os Clientes</option>
            <?php foreach ($options['clientes'] as $cliente) { ?>
              <option value="<?php echo (int)$cliente['clt_id']; ?>" <?php echo ((int)$filters['f_clt'] === (int)$cliente['clt_id']) ? 'selected' : ''; ?>>
                <?php echo atd_home_h($cliente['clt_nomef']); ?>
              </option>
            <?php } ?>
          </select>
        </div>

        <?php if ((int)$filters['f_clt'] > 0) { ?>
          <div class="col-auto col-form-label-sm filter-wide">
            <label class="my-0">Solicitante:</label>
            <select name="f_sol" class="form-control form-control-sm" tabindex="1">
              <option value="0">Todos os Solicitantes</option>
              <?php foreach ($options['solicitantes'] as $solicitante) { ?>
                <option value="<?php echo (int)$solicitante['pessoa_id']; ?>" <?php echo ((int)$filters['f_sol'] === (int)$solicitante['pessoa_id']) ? 'selected' : ''; ?>>
                  <?php echo atd_home_h($solicitante['pessoa_nom']); ?>
                </option>
              <?php } ?>
            </select>
          </div>
        <?php } ?>

        <div class="col-auto col-form-label-sm">
          <label class="my-0">Status:</label>
          <select name="f_sts" class="form-control form-control-sm" tabindex="2">
            <option value="10" <?php echo ((int)$filters['f_sts'] === 10) ? 'selected' : ''; ?>>Todos</option>
            <option value="11" <?php echo ((int)$filters['f_sts'] === 11) ? 'selected' : ''; ?>>Abertas</option>
            <option value="1" <?php echo ((int)$filters['f_sts'] === 1) ? 'selected' : ''; ?>>Aguardando</option>
            <option value="2" <?php echo ((int)$filters['f_sts'] === 2) ? 'selected' : ''; ?>>Em execucao</option>
            <option value="3" <?php echo ((int)$filters['f_sts'] === 3) ? 'selected' : ''; ?>>Em espera</option>
            <option value="4" <?php echo ((int)$filters['f_sts'] === 4) ? 'selected' : ''; ?>>Finalizado</option>
            <option value="5" <?php echo ((int)$filters['f_sts'] === 5) ? 'selected' : ''; ?>>Concluido</option>
            <option value="0" <?php echo ((int)$filters['f_sts'] === 0) ? 'selected' : ''; ?>>Agendados</option>
          </select>
        </div>

        <?php if ($showAdvanced) { ?>
          <div class="col-auto col-form-label-sm filter-wide">
            <label class="my-0">Tipo Atendimento:</label>
            <div class="dropdown filter-dropdown">
              <div class="form-control form-control-sm dropdown-toggle dropdown-toggle-split" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer;">
                <?php echo atd_home_h(atd_home_tipo_label($filters['f_tipo'])); ?>
              </div>
              <div class="dropdown-menu">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="select-all-tipo" onclick="toggleAllTipos()">
                  <label class="form-check-label" for="select-all-tipo">Todos</label>
                </div>
                <?php foreach ($tiposAtendimento as $valor => $nome) { ?>
                  <div class="form-check">
                    <input class="form-check-input tipo-checkbox" type="checkbox" name="f_tipo[]" value="<?php echo (int)$valor; ?>" id="tipo<?php echo (int)$valor; ?>" <?php echo in_array((int)$valor, $filters['f_tipo'], true) ? 'checked' : ''; ?>>
                    <label class="form-check-label" for="tipo<?php echo (int)$valor; ?>"><?php echo atd_home_h($nome); ?></label>
                  </div>
                <?php } ?>
              </div>
            </div>
          </div>

          <div class="col-auto col-form-label-sm filter-wide">
            <label class="my-0">Tecnicos:</label>
            <div class="dropdown filter-dropdown">
              <div class="form-control form-control-sm dropdown-toggle dropdown-toggle-split" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer;">
                <?php echo atd_home_h(atd_home_tecnico_label($filters['f_tec'], $options['tecnicos'])); ?>
              </div>
              <div class="dropdown-menu" style="max-height: 400px; overflow-y: auto;">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="select-all-tecnicos" onclick="toggleAllTecnicos()">
                  <label class="form-check-label" for="select-all-tecnicos">Todos os tecnicos</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input tec-checkbox" type="checkbox" name="f_tec[]" value="0" id="tec0" <?php echo in_array(0, $filters['f_tec'], true) ? 'checked' : ''; ?>>
                  <label class="form-check-label" for="tec0">Nao direcionado</label>
                </div>
                <?php foreach ($options['tecnicos'] as $tecnico) { ?>
                  <div class="form-check">
                    <input class="form-check-input tec-checkbox" type="checkbox" name="f_tec[]" value="<?php echo (int)$tecnico['user_id']; ?>" id="tec<?php echo (int)$tecnico['user_id']; ?>" <?php echo in_array((int)$tecnico['user_id'], $filters['f_tec'], true) ? 'checked' : ''; ?>>
                    <label class="form-check-label" for="tec<?php echo (int)$tecnico['user_id']; ?>"><?php echo atd_home_h($tecnico['user_nome']); ?></label>
                  </div>
                <?php } ?>
              </div>
            </div>
          </div>
        <?php } ?>

        <div class="col-auto col-form-label-sm filter-id">
          <label class="my-0">ID:</label>
          <input type="text" name="f_id" id="f_id" class="form-control form-control-sm" placeholder="Digite o ID" tabindex="4" value="<?php echo atd_home_h($filters['f_id']); ?>">
        </div>

        <input type="hidden" name="f_date_1" id="f_date_1" value="<?php echo atd_home_h($filters['f_date_1']); ?>">
        <input type="hidden" name="f_date_2" id="f_date_2" value="<?php echo atd_home_h($filters['f_date_2']); ?>">
        <input type="hidden" name="f_palavra" value="<?php echo atd_home_h($filters['f_palavra_raw']); ?>">
        <input type="hidden" name="ord" value="<?php echo atd_home_h($filters['ord']); ?>">
        <input type="hidden" name="order_dir" value="<?php echo atd_home_h($filters['order_dir']); ?>">

        <div class="col-auto pt-3">
          <button type="submit" class="btn btn-sm btn-info" tabindex="4">Filtrar</button>
        </div>
        <div class="col-auto pt-3">
          <button type="button" class="btn btn-sm btn-outline-info" data-atd-clear-filters="1" tabindex="4">Limpar</button>
        </div>

        <?php if ($showPeriod) { ?>
          <div class="col-auto pt-3">
            <button type="button" class="btn btn-sm <?php echo ($filters['f_date_1'] || $filters['f_date_2']) ? 'btn-info' : 'btn-outline-info'; ?>" id="btn-date-range" tabindex="4" title="Filtrar por data de abertura">
              <i class="far fa-calendar-alt"></i>
              <span id="date-range-label" class="ml-1">
                <?php
                if ($filters['f_date_1'] && $filters['f_date_2']) {
                  echo atd_home_h(atd_home_date_label($filters['f_date_1']) . ' ate ' . atd_home_date_label($filters['f_date_2']));
                } elseif ($filters['f_date_1']) {
                  echo atd_home_h('A partir de ' . atd_home_date_label($filters['f_date_1']));
                } elseif ($filters['f_date_2']) {
                  echo atd_home_h('Ate ' . atd_home_date_label($filters['f_date_2']));
                } else {
                  echo 'Periodo';
                }
                ?>
              </span>
            </button>
          </div>
          <div class="col-auto pt-3 d-flex align-items-center">
            <i id="autoReloadToggle" class="fas fa-sync text-muted" style="font-size: 16px; cursor: pointer;" title="Atualizacao automatica"></i>
          </div>
        <?php } else { ?>
          <div class="col-auto pt-3">
            <button type="button" class="btn btn-sm btn-outline-info btn-total-atd" tabindex="4">Total: <?php echo (int)$total; ?></button>
          </div>
        <?php } ?>
      </div>
    </form>
  </div>
<?php
  return ob_get_clean();
}

function atd_home_render_sort_header($label, $column, $filters)
{
  ob_start();
?>
  <th class="p-1">
    <form action="#" method="POST" class="atd-sort-form" data-atd-dynamic-form="1">
      <?php echo atd_home_render_hidden_filters($filters, ['ord', 'order_dir']); ?>
      <input type="hidden" name="ord" value="<?php echo atd_home_h($column); ?>">
      <input type="hidden" name="order_dir" value="<?php echo atd_home_h(atd_home_next_order_dir($filters, $column)); ?>">
      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> <?php echo atd_home_h($label); ?></button>
    </form>
  </th>
<?php
  return ob_get_clean();
}

function atd_home_minutes_since($date)
{
  if (empty($date)) {
    return 0;
  }
  $time = strtotime($date);
  if (!$time) {
    return 0;
  }
  return max(0, (int)floor((time() - $time) / 60));
}

function atd_home_sla_for_level($level, $config)
{
  $level = (int)$level;
  if ($level <= 1) return (int)$config['sla_n1'];
  if ($level === 2) return (int)$config['sla_n2'];
  if ($level === 3) return (int)$config['sla_n3'];
  if ($level === 4) return (int)$config['sla_n4'];
  if ($level === 5) return (int)$config['sla_n5'];
  if ($level === 6) return (int)$config['sla_n6'];
  return (int)$config['sla_n1'];
}

function atd_home_tipo_text($tipo)
{
  $labels = [
    0 => 'Nao Informado',
    1 => 'Falha',
    2 => 'Relacionamento',
    3 => 'Requisicao de Servicos',
    4 => 'Requisicao de Informacao',
    6 => 'Melhoria',
  ];
  return $labels[(int)$tipo] ?? 'Nao Informado';
}

function atd_home_forma_text($forma)
{
  $labels = [
    1 => 'Remoto',
    2 => 'Presencial',
    3 => 'Remoto - Plantao',
    4 => 'Presencial - Plantao',
  ];
  return $labels[(int)$forma] ?? '';
}

function atd_home_level_badge($level)
{
  $level = (int)$level;
  if ($level === 0) return '<span class="badge badge-danger">NA</span>';
  if ($level === 1) return '<span class="badge badge-secondary">Nivel 1</span>';
  if ($level === 2) return '<span class="badge badge-info">Nivel 2</span>';
  if ($level === 3) return '<span class="badge badge-primary">Nivel 3</span>';
  if ($level === 4 || $level === 5) return '<span class="badge badge-primary">Rotina</span>';
  if ($level === 6) return '<span class="badge badge-primary">Tarefa</span>';
  return '<span class="badge badge-secondary">NA</span>';
}

function atd_home_priority_badge($priority)
{
  $priority = (int)$priority;
  if ($priority === 1) return '<span class="badge badge-success">Baixa</span>';
  if ($priority === 2) return '<span class="badge badge-warning">Media</span>';
  if ($priority === 3) return '<span class="badge badge-alert" style="color: black; background-color: #FF8C00;">Alta</span>';
  if ($priority === 4) return '<span class="badge badge-danger">Urgente</span>';
  return '<span class="badge badge-secondary">NA</span>';
}

function atd_home_status_text($status)
{
  $status = (int)$status;
  if ($status === 0) return '<i class="far fa-clock"></i> Agendado';
  if ($status === 1) return '<i class="fas fa-hourglass-half"></i> Aguardando';
  if ($status === 2) return '<i class="fas fa-magic"></i> Em Execucao';
  if ($status === 3) return '<i class="far fa-pause-circle"></i> Em Espera';
  if ($status === 5) return '<i class="fas fa-check"></i> Concluido';
  if ($status === 4) return '<i class="fas fa-check"></i> Finalizado';
  return '';
}

function atd_home_progress_state($row, $config)
{
  $status = (int)$row['status'];
  if ($status <= 0) {
    return null;
  }

  if ($status === 4) {
    return ['color' => 'green', 'width' => 100, 'tag' => 'ok'];
  }

  $sla = atd_home_sla_for_level($row['nivel'], $config);
  $open = strtotime($row['abertura']);
  if (!$open) {
    return ['color' => 'orange', 'width' => 100, 'tag' => 'Vencido'];
  }

  $limit = $open + ($sla * 60) + (int)$row['espera_segundos'];
  $remaining = $limit - time();
  if ($remaining <= 0) {
    return ['color' => 'orange', 'width' => 100, 'tag' => 'Vencido'];
  }

  $minutes = (int)floor($remaining / 60);
  $hoursLabel = (int)floor($minutes / 60);
  $minutesLabel = $minutes % 60;
  $width = 110 - (($minutes / 180) * 100);
  $width = max(0, min(100, $width));
  $color = $width > 92 ? 'orange' : 'blue';

  return ['color' => $color, 'width' => $width, 'tag' => $hoursLabel . 'h ' . $minutesLabel . 'm'];
}

function atd_home_render_sla_bell($row, $config)
{
  $status = (int)$row['status'];
  if ($status < 1 || $status >= 3) {
    return '';
  }

  $minutes = ((int)$row['subcategoria'] === 97)
    ? atd_home_minutes_since($row['ultima_inter_data'])
    : atd_home_minutes_since($row['ultima_inter_inicio_data']);

  if ($minutes >= (int)$config['sla_n3']) {
    return atd_home_render_sla_bell_icon('blinkk', 'SLA em estado critico');
  }
  if ($minutes >= (int)$config['sla_n2']) {
    return atd_home_render_sla_bell_icon('blinkkk', 'SLA em alerta');
  }
  if ($minutes >= (int)$config['sla_n1']) {
    return atd_home_render_sla_bell_icon('blink', 'SLA requer atencao');
  }

  return '';
}

function atd_home_render_sla_bell_icon($class, $label)
{
  return '<span class="sla-bell-alert ' . $class . '" title="' . $label . '" aria-label="' . $label . '">'
    . '<svg class="sla-bell-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    . '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>'
    . '<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>'
    . '</svg>'
    . '<span class="sla-bell-mark" aria-hidden="true">!</span>'
    . '</span> ';
}

function atd_home_render_rows($rows, $config)
{
  ob_start();
  foreach ($rows as $row) {
    $atd = (int)$row['id'];
    $data = $row['abertura'] ? date('d/m/y', strtotime($row['abertura'])) : '';
    $hora = $row['abertura'] ? date('H:i', strtotime($row['abertura'])) : '';
    $tecnicoNome = ((int)$row['tecnico'] === 0 || empty($row['tecnico_nome'])) ? 'Nao direcionado' : $row['tecnico_nome'];
    $progress = atd_home_progress_state($row, $config);
?>
    <tr class="atd-row-clickable" data-atd-url="atd_detalhe.php?atd=<?php echo urlencode((string)$atd); ?>" title="De um duplo clique para abrir o atendimento">
      <th class="align-middle">
        #<?php echo atd_home_h(str_pad((string)$atd, 5, '0', STR_PAD_LEFT)); ?>
        <?php if ((int)$row['reincidente'] === 1) { ?>
          <i class="fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
        <?php } ?>
      </th>
      <td class="align-middle">
        <strong><?php echo atd_home_h(atd_home_short_text($row['clt_nomer'] ?: $row['clt_nomef'], 35)); ?></strong>
        <?php if (!empty($row['pessoa_nom'])) { ?><br><i class="far fa-user mr-1"></i><?php echo atd_home_h($row['pessoa_nom']); ?><?php } ?>
      </td>
      <td class="align-middle text-left atd-abertura-cell">
        <span class="atd-abertura-date"><?php echo atd_home_h($data . ' as ' . $hora . 'h'); ?></span>
        <span class="atd-abertura-preview"><?php echo atd_home_h(atd_home_preview_text($row['desc_abertura'], 200)); ?></span>
      </td>
      <td class="align-middle text-left"><?php echo atd_home_h(atd_home_tipo_text($row['tipo'])); ?></td>
      <td class="align-middle text-center">
        <?php echo atd_home_h($row['cat_nome']); ?><br>
        <?php echo atd_home_h($row['scat_nome']); ?><br>
        <?php echo atd_home_h($row['itens_nome']); ?>
      </td>
      <th class="align-middle text-center"><?php echo atd_home_level_badge($row['nivel']); ?></th>
      <th class="align-middle text-center"><?php echo atd_home_priority_badge($row['prioridade']); ?></th>
      <td class="align-middle text-center"><?php echo atd_home_h(atd_home_forma_text($row['forma'])); ?></td>
      <td class="align-middle">
        <?php if ($progress) { ?>
          <div class="progress <?php echo atd_home_h($progress['color']); ?>">
            <div class="progress-bar" style="width:<?php echo (float)$progress['width']; ?>%;">
              <div class="progress-value"><?php echo atd_home_h($progress['tag']); ?></div>
            </div>
          </div>
        <?php } ?>
      </td>
      <td class="align-middle">
        <?php echo atd_home_render_sla_bell($row, $config); ?>
        <?php echo atd_home_h($tecnicoNome); ?>
      </td>
      <td class="align-middle"><?php echo atd_home_status_text($row['status']); ?></td>
    </tr>
<?php
  }
  return ob_get_clean();
}

function atd_home_render_loader($loaded, $total, $nextPage, $hasMore)
{
  if (!$hasMore) {
    return '<div id="atdInfiniteLoader" class="p-2 text-center border-top bg-white text-muted" data-next-page="' . (int)$nextPage . '" data-loaded="' . (int)$loaded . '" data-total="' . (int)$total . '" data-has-more="0"><small id="atdInfiniteLoaderText">Todos os atendimentos foram carregados.</small></div>';
  }

  return '<div id="atdInfiniteLoader" class="p-2 text-center border-top bg-white" data-next-page="' . (int)$nextPage . '" data-loaded="' . (int)$loaded . '" data-total="' . (int)$total . '" data-has-more="1"><small id="atdInfiniteLoaderText" class="text-muted">Role para baixo para carregar mais atendimentos (' . (int)$loaded . ' de ' . (int)$total . ')</small></div>';
}

function atd_home_render_table($state)
{
  $filters = $state['filters'];
  ob_start();
?>
  <div class="card-body p-0" style="overflow: hidden; background: #fff;">
    <div class="table-container">
      <table class="table table-hover small">
        <thead>
          <tr>
            <?php echo atd_home_render_sort_header('ID', 'id', $filters); ?>
            <?php echo atd_home_render_sort_header('Cliente', 'cliente', $filters); ?>
            <?php echo atd_home_render_sort_header('Abertura', 'abertura', $filters); ?>
            <th class="p-1"><button type="button" class="btn btn-light btn-sm btn-block">Tipo</button></th>
            <th class="p-1"><button type="button" class="btn btn-light btn-sm btn-block">Categoria</button></th>
            <?php echo atd_home_render_sort_header('Nivel', 'nivel', $filters); ?>
            <?php echo atd_home_render_sort_header('Prioridade', 'prioridade', $filters); ?>
            <?php echo atd_home_render_sort_header('Forma', 'forma', $filters); ?>
            <th class="p-1"><button type="button" class="btn btn-light btn-sm btn-block">Prazo para Conclusao</button></th>
            <?php echo atd_home_render_sort_header('Tecnico', 'tecnico', $filters); ?>
            <?php echo atd_home_render_sort_header('Status', 'status', $filters); ?>
          </tr>
        </thead>
        <tbody id="atdRows">
          <?php echo atd_home_render_rows($state['rows'], $state['config']); ?>
        </tbody>
      </table>
      <?php echo atd_home_render_loader($state['loaded'], $state['total'], $state['nextPage'], $state['hasMore']); ?>
    </div>
  </div>
<?php
  return ob_get_clean();
}

function atd_home_render_help_modal()
{
  ob_start();
?>
  <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Lista de atendimento</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>
        <div class="modal-body">
          <p><strong>Alertas no sistema:</strong></p>
          <ul class="list">
            <li><i class="fas fa-bell"></i> Sino do SLA</li>
          </ul>
          <p><strong>Os atendimentos sao marcados pelos status da listagem.</strong></p>
          <ul class="list">
            <li class="small">Agendado, Aguardando, Em Execucao, Em Espera, Concluido e Finalizado.</li>
            <li class="small">Use duplo clique na linha para abrir o atendimento em outra aba.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
<?php
  return ob_get_clean();
}
