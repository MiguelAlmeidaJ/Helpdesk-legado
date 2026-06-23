<?php
session_start();

$query = $_GET;
$query['status'] = 1;

header('Location: gestaoRD.php?' . http_build_query($query));
exit;
