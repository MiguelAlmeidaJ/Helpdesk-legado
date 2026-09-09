<?php
http_response_code(410);
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
echo json_encode([
    'erro' => 'Os detalhes administrativos de RD foram migrados para a API nativa.',
], JSON_UNESCAPED_UNICODE);
exit;
