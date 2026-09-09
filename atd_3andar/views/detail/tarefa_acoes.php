<?php
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'error' => 'legacy_ticket_surface_retired',
    'message' => 'Esta superficie PHP foi aposentada. Use a aplicacao Next.js.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
