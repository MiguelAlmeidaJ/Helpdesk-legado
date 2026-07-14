<?php
require_once __DIR__ . "/all/session.php";

n3_session_destroy();

header("Location: " . n3_app_url("index.php"));
exit;
