<?php
require_once __DIR__ . '/../all/app_url.php';

$params = [];

if (isset($_GET['mes'])) {
    $month = (int)$_GET['mes'];
    if ($month >= 1 && $month <= 12) {
        $params['month'] = $month;
    }
}

if (isset($_GET['ano'])) {
    $year = (int)$_GET['ano'];
    if ($year >= 2000 && $year <= 2100) {
        $params['year'] = $year;
    }
}

$params['print'] = '1';

$target = '/logistics/vehicles/agenda?' . http_build_query($params);

header('Location: ' . allterus_web_url($target), true, 302);
exit;
