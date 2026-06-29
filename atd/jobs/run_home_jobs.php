<?php

if (PHP_SAPI !== 'cli') {
  http_response_code(404);
  exit;
}

require_once __DIR__ . '/../../all/conect.php';
require_once __DIR__ . '/../lib/home_jobs.php';

try {
  $pdo = ConnectionN3();
  if (!$pdo) {
    throw new RuntimeException('Falha ao conectar no banco de dados.');
  }

  $result = atd_home_run_jobs($pdo, [
    'recurrence_interval' => 0,
    'force_recurrences' => true,
  ]);

  echo json_encode([
    'ok' => true,
    'executed_at' => date('Y-m-d H:i:s'),
    'result' => $result,
  ], JSON_UNESCAPED_UNICODE) . PHP_EOL;
  exit(0);
} catch (Throwable $e) {
  error_log('Erro no job CLI de atendimentos: ' . $e->getMessage());
  fwrite(STDERR, json_encode([
    'ok' => false,
    'executed_at' => date('Y-m-d H:i:s'),
    'message' => 'Erro ao executar jobs de atendimentos.',
  ], JSON_UNESCAPED_UNICODE) . PHP_EOL);
  exit(1);
}
