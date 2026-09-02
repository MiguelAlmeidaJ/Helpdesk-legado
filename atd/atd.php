<?php
require_once __DIR__ . '/../all/app_url.php';

$ticketId = filter_input(INPUT_POST, 'atd', FILTER_VALIDATE_INT);
if (!$ticketId) {
    $ticketId = filter_input(INPUT_GET, 'atd', FILTER_VALIDATE_INT);
}

$target = $ticketId && $ticketId > 0
    ? allterus_web_url('/tickets/' . rawurlencode((string)$ticketId))
    : allterus_web_url('/tickets');

$status = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' ? 303 : 302;
header('Location: ' . $target, true, $status);
exit;
