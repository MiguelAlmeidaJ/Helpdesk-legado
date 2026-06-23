<?php
session_start();
include_once("../../all/seguranca.php");
include_once("../../all/conect.php");
include_once("../../all/permissoes.php");
include_once("../lib/list_helpers.php");

header('Content-Type: application/json; charset=utf-8');

if ((int)($m5_00 ?? 0) === 0) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'message' => 'Sem permissao.']);
  exit;
}

try {
  $source = array_merge($_GET, $_POST);
  if (isset($_SESSION['allterusN3Id']) && (int)$_SESSION['allterusN3Id'] === 134 && empty($source['f_palavra'])) {
    $source['f_palavra'] = 'NET DO BRASIL';
  }

  $filters = atd_projeto_collect_filters($source, 'tasks');
  $mode = ($_POST['mode'] ?? $_GET['mode'] ?? 'refresh') === 'append' ? 'append' : 'refresh';
  $pdo = ConnectionN3();
  $result = atd_projeto_fetch_tasks($pdo, $filters);
  $html = $mode === 'append'
    ? [
      'rows' => atd_projeto_render_task_rows($result['rows']),
      'loader' => atd_projeto_render_infinite_loader($result['pagination'], 'tarefas'),
    ]
    : atd_projeto_render_tasks_table($result['rows'], $filters, $result['pagination']);

  echo json_encode([
    'ok' => true,
    'html' => $html,
    'pagination' => $result['pagination'],
    'filters' => [
      'ord' => $filters['ord'],
      'order_dir' => $filters['order_dir'],
      'page' => $filters['page'],
    ],
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok' => false,
    'message' => 'Falha ao carregar tarefas.',
  ]);
}
