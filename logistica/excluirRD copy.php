<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_02 == 0) {
    header("Location: ../home.php");
    exit;
}


$id = $_POST['id'];


$pdo = ConnectionN3rd();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

$stmt = $pdo->prepare("DELETE FROM running_balance WHERE id = ?");
$stmt->execute([$id]);

$pdo->query("DELETE FROM running_balance WHERE id = $id");

if ($stmt->rowCount() > 0) {

    $success = true;

   if ($success) {
        $_SESSION['alert_message'] = [
            'type' => 'success',
            'text' => 'Despesa excluída com sucesso!'
        ];
        header('Location: rd.php');
        exit;
    } else {
        $_SESSION['alert_message'] = [
            'type' => 'error',
            'text' => 'Erro ao excluir a despesa.'
        ];
        header('Location: rd.php');
        exit;
    }
} else {
    header("Location: rd.php");
    exit;
}
