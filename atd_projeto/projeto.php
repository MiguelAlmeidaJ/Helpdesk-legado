<?php
$id = (int)($_GET['projeto'] ?? $_POST['projeto'] ?? 0);
$target = $id > 0
    ? '/tickets/devops/projects/' . $id
    : '/tickets/devops/projects/new';
header('Location: ' . $target, true, 303);
exit;
