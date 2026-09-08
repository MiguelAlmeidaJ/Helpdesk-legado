<?php
require_once __DIR__ . '/legacy/bridge/app_url.php';
header('Location: ' . allterus_web_url('/login'), true, 302);
exit;
