<?php
$id = (int)($_GET['tarefa'] ?? $_POST['tarefa'] ?? 0);
$target = $id > 0
    ? '/tickets/marketing/' . $id
    : '/tickets/new?type=marketing';
header('Location: ' . $target, true, 303);
exit;
