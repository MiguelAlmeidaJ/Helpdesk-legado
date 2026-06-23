<?php
session_start();

include_once(__DIR__ . '/../../all/seguranca.php');
include_once(__DIR__ . '/../../all/conect.php');
include_once(__DIR__ . '/../../all/permissoes.php');
include_once(__DIR__ . '/../lib/home_data.php');
include_once(__DIR__ . '/../lib/home_jobs.php');
include_once(__DIR__ . '/../lib/home_render.php');

header('Content-Type: application/json; charset=UTF-8');

if (!isset($m3_00) || (int)$m3_00 === 0) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'message' => 'Acesso negado.'], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  $mode = ($_POST['mode'] ?? 'refresh') === 'append' ? 'append' : 'refresh';

  if (!empty($_POST['clear'])) {
    atd_home_clear_filters();
    $_POST = ['mode' => 'refresh'];
    $mode = 'refresh';
  }

  $pdo = ConnectionN3();
  if (!$pdo) {
    throw new RuntimeException('Falha na conexao com o banco de dados.');
  }

  if ($mode === 'refresh') {
    atd_home_run_jobs($pdo);
  }

  $filters = atd_home_normalize_filters($_POST, $mode === 'refresh');
  $page = max(1, (int)($_POST['page'] ?? 1));
  $pageSize = atd_home_page_size();

  if ($mode === 'append') {
    $config = atd_home_get_config($pdo);
    $rows = atd_home_fetch_rows($pdo, $filters, $page, $pageSize);
    $total = atd_home_fetch_total($pdo, $filters);
    $loaded = min((($page - 1) * $pageSize) + count($rows), $total);
    $hasMore = $loaded < $total;

    echo json_encode([
      'ok' => true,
      'html' => [
        'rows' => atd_home_render_rows($rows, $config),
        'loader' => atd_home_render_loader($loaded, $total, $page + 1, $hasMore),
      ],
      'pagination' => [
        'total' => $total,
        'loaded' => $loaded,
        'nextPage' => $page + 1,
        'hasMore' => $hasMore,
      ],
      'filters' => $filters,
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $state = atd_home_load_state($pdo, $filters, 1);

  echo json_encode([
    'ok' => true,
    'html' => [
      'cards' => atd_home_render_status_cards($state['statusCards'], $state['filters']),
      'filters' => atd_home_render_filters($state['filters'], $state['options'], $state['total']),
      'table' => atd_home_render_table($state),
    ],
    'pagination' => [
      'total' => $state['total'],
      'loaded' => $state['loaded'],
      'nextPage' => $state['nextPage'],
      'hasMore' => $state['hasMore'],
    ],
    'filters' => $state['filters'],
  ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  error_log('Erro no endpoint atd/api/home_list.php: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['ok' => false, 'message' => 'Erro ao carregar atendimentos.'], JSON_UNESCAPED_UNICODE);
}
