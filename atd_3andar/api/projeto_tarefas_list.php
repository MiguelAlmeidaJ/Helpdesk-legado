<?php
session_start();
include_once("../../all/seguranca.php");
include_once("../../all/conect.php");
include_once("../../all/permissoes.php");
include_once("../lib/detail_tasks.php");

header('Content-Type: application/json; charset=utf-8');

if ((int)($m5_00 ?? 0) === 0) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'message' => 'Sem permissao.']);
  exit;
}

try {
  $filters = [
    'projeto' => (int)($_POST['projeto'] ?? $_GET['projeto'] ?? 0),
    'tecnico' => (string)($_POST['tecnico'] ?? $_GET['tecnico'] ?? '%'),
    'solicitante' => (string)($_POST['solicitante'] ?? $_GET['solicitante'] ?? '%'),
    'ord' => (string)($_POST['ord'] ?? $_GET['ord'] ?? 'cliente'),
    'dir' => (string)($_POST['dir'] ?? $_GET['dir'] ?? 'ASC'),
    'page' => (int)($_POST['page'] ?? $_GET['page'] ?? 1),
    'per_page' => (int)($_POST['per_page'] ?? $_GET['per_page'] ?? 15),
  ];

  if ($filters['projeto'] <= 0) {
    throw new RuntimeException('Projeto invalido.');
  }

  $pdo = ConnectionN3();
  $result = atd_3andar_detail_fetch_tasks($pdo, $filters);

  echo json_encode([
    'ok' => true,
    'html' => [
      'rows' => atd_3andar_detail_render_task_rows($result['rows']),
      'loader' => atd_3andar_detail_render_loader($result['pagination']),
    ],
    'pagination' => $result['pagination'],
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'ok' => false,
    'message' => 'Falha ao carregar tarefas do projeto.',
  ]);
}
