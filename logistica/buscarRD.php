<?php
http_response_code(410);
header('Content-Type: application/json; charset=UTF-8');
echo json_encode([
    'success' => false,
    'message' => 'A edição administrativa de RD foi migrada para o fluxo nativo.',
], JSON_UNESCAPED_UNICODE);
exit;
