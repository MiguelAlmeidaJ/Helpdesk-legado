<?php

if (PHP_SAPI !== 'cli') {
  http_response_code(404);
  exit;
}

fwrite(STDOUT, json_encode([
  'ok' => true,
  'deprecated' => true,
  'executed_at' => date('Y-m-d H:i:s'),
  'message' => 'Jobs automaticos de atendimentos foram migrados para helpdesk-ticket-worker.',
], JSON_UNESCAPED_UNICODE) . PHP_EOL);

exit(0);
