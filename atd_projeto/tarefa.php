<?php
$id = (int)($_GET['tarefa'] ?? $_POST['tarefa'] ?? 0);
$target = $id > 0
    ? '/tickets/devops/' . $id
    : '/tickets/new?type=devops';
header('Location: ' . $target, true, 303);
exit;
