<?php
require_once __DIR__ . '/../legacy/bridge/app_url.php';

$query = http_build_query($_GET, '', '&', PHP_QUERY_RFC3986);
$target = allterus_web_url('/logistics/expenses/admin/report');
if ($query !== '') {
    $target .= '?' . $query;
}
header('Location: ' . $target, true, 302);
exit;
