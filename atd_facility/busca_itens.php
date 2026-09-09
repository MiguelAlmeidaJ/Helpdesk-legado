<?php
declare(strict_types=1);

http_response_code(410);
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'ok' => false,
    'message' => 'Facility foi desativado.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
