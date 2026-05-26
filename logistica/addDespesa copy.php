<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");


//formatar pix
function formatarChavePix($chave, $tipo)
{
    if (in_array($tipo, [1, 2, 4])) {
        // Remove tudo que nao for numero
        return preg_replace('/\D/', '', $chave);
    }
    // Para e-mail, chave aleatoria etc, mantem como esta
    return $chave;
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $remarks = $_POST['remarks'];
    $cliente = $_POST['cliente_nome'];
    $amount = floatval($_POST['amount']);
    $user_id = intval($_POST['user_id']);
    $category_id = intval($_POST['category_id']);
    $pix_type = $_POST['pix_type'];
    $pix = !empty($_POST['pix']) ? $_POST['pix'] : $_POST['chavepix_default'];
    $status = 1;


    $pix = formatarChavePix($pix, $pix_type);


    $pdo = ConnectionN3rd();
    $stmt = $pdo->prepare("INSERT INTO running_balance (remarks, cliente, amount, user_id, category_id, pix_type, pix, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");


    $stmt->bindParam(1, $remarks);
    $stmt->bindParam(2, $cliente);
    $stmt->bindParam(3, $amount);
    $stmt->bindParam(4, $user_id);
    $stmt->bindParam(5, $category_id);
    $stmt->bindParam(6, $pix_type);
    $stmt->bindParam(7, $pix);
    $stmt->bindParam(8, $status);
    $stmt->bindParam(9, $date_created);



    // var_dump ($_POST, $stmt, $remarks, $cliente, $amount, $user_id, $category_id, $pix_type, $pix, $status);
    // exit;

    $success = $stmt->execute([$remarks, $cliente, $amount, $user_id, $category_id, $pix_type, $pix, $status]);

    if ($success) {
        $_SESSION['alert_message'] = [
            'type' => 'success',
            'text' => 'Despesa adicionada com sucesso!'
        ];
        header('Location: rd.php');
        exit;
    } else {
        $_SESSION['alert_message'] = [
            'type' => 'error',
            'text' => 'Erro ao inserir a despesa.'
        ];
        header('Location: rd.php');
        exit;
    }
} else {
    header("Location: rd.php");
    exit;
}
