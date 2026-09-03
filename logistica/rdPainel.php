<?php
require_once __DIR__ . '/../all/app_url.php';

header('Location: ' . allterus_web_url('/logistics/expenses'), true, 302);
exit;
