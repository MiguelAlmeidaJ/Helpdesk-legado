<?php
// ARQUIVO ATUALIZADO NOVO FINANCEIRO
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if ($m9_00 == 0) {
    header("Location: ../home.php");
    exit;
}


$pdo = ConnectionN3();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // var_dump($_POST);
    // exit;
    $user_id = intval($_POST['user_id']);
    $amount = floatval($_POST['amount']);
    $category_id = intval($_POST['category_id']);
    $pix_type = $_POST['pix_type'] ?? '';
    $pix = !empty($_POST['pix']) ? $_POST['pix'] : ($_POST['chavepix_default'] ?? '');
    $cliente_id = $_POST['cliente_id'] ?? '';
    $anexos_json = !empty($_POST['anexos_json']) ? $_POST['anexos_json'] : null;
    $status = 1;

    $remarks = $_POST['remarks'] ?? '';
    // Remove espaços em branco do início e do fim da string.
    $trimmed_remarks = trim($remarks);
    // Remove a tag <p> de abertura no início e a tag </p> de fechamento no final.
    $clean_remarks = preg_replace('/(^<p[^>]*>|<\/p>$)/i', '', $trimmed_remarks);
    $remarks = trim($clean_remarks);

    // Variável para guardar o nome do cliente
    $cliente_nome = null;

    if (!empty($cliente_id)) {
        // A consulta está correta
        $sql_busca_cliente = "SELECT clt_nomef as nome FROM clientes WHERE clt_id = ?";
        $stmt_busca = $pdo->prepare($sql_busca_cliente);
        $stmt_busca->execute([$cliente_id]);
        $cliente = $stmt_busca->fetch(PDO::FETCH_ASSOC);

        if ($cliente) {
            $cliente_nome = $cliente['nome'];
        }
    }

    $stmt = $pdo->prepare(
        "INSERT INTO running_balance (remarks, clt_id, cliente, amount, user_id, category_id, pix_type, pix, anexos, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );



    $success = $stmt->execute([
        $remarks,
        $cliente_id,
        $cliente_nome,
        $amount,
        $user_id,
        $category_id,
        $pix_type,
        $pix,
        $anexos_json,
        $status
    ]);

    if ($success) {
        $_SESSION['alert_message'] = [
            'type' => 'success',
            'text' => 'Despesa adicionada com sucesso!'
        ];
    } else {
        $_SESSION['alert_message'] = [
            'type' => 'error',
            'text' => 'Erro ao inserir a despesa.'
        ];
    }
    header('Location: rd.php');
    exit;
} else {
    header("Location: rd.php");
    exit;
}
