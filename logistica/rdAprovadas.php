<?php
session_start();

$query = $_GET;
$query['status'] = 2;

header('Location: gestaoRD.php?' . http_build_query($query));
exit;
