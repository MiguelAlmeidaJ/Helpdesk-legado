<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// 1. VERIFICAÇÕES INICIAIS E DE SEGURANÇA
// ----------------------------------------------------

// Garante que o usuário tem permissão para acessar a página
if ($m9_02 < 2) {
    header("Location: ../home.php");
    exit;
}

// Garante que o usuário está logado
if (!isset($_SESSION['allterusN3Id'])) {
    header("Location: ../index.php");
    exit;
}

$pdo = connectionN3();
if (!$pdo) exit("Erro ao conectar ao banco de dados.");

// Garante que o formulário foi enviado usando o método POST
if ($_SERVER["REQUEST_METHOD"] != "POST") {
    // Se não for POST, redireciona com erro
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Acesso inválido.'];
    header("Location: detalharRD.php"); // Altere para a sua página principal de despesas
    exit;
}

// var_dump($_POST);
// exit;


$id_despesa = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$user_id_logado = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);
$amount = filter_input(INPUT_POST, 'amount', FILTER_VALIDATE_FLOAT);
$category_id = filter_input(INPUT_POST, 'category_id', FILTER_VALIDATE_INT);
$pix_type = filter_input(INPUT_POST, 'pix_type', FILTER_VALIDATE_INT);
$pix = trim($_POST['pix'] ?? '');
$clt_id = trim($_POST['clt_id'] ?? '');
$remarks = trim($_POST['remarks'] ?? '');
$return_url = $_POST['return_url'] ?? '';

if (!$id_despesa || !$amount) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro: Dados essenciais não foram enviados.'];
    header("Location: detalharRD.php");
    exit;
}


if (!$pdo) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro: Não foi possível conectar ao banco de dados.'];
    header("Location: detalharRD.php");
    exit;
}

$cliente_nome = null; // Inicia a variável do nome

if (!empty($clt_id)) {
    // Busca o nome do cliente usando o ID
    $sql_busca_cliente = "SELECT clt_nomef as nome FROM clientes WHERE clt_id = ?";
    $stmt_busca = $pdo->prepare($sql_busca_cliente);
    $stmt_busca->execute([$clt_id]);
    $cliente_resultado = $stmt_busca->fetch(PDO::FETCH_ASSOC);

    if ($cliente_resultado) {
        $cliente_nome = $cliente_resultado['nome']; // Armazena o nome na nova variável
    }
}


try {
    // CORREÇÃO 3: Use placeholders para TODOS os valores na consulta UPDATE
    $sql = "UPDATE running_balance SET
                amount = :amount,
                category_id = :category_id,
                pix_type = :pix_type,
                pix = :pix,
                clt_id = :clt_id,
                cliente = :cliente_nome, 
                remarks = :remarks
            WHERE
                id = :id_despesa
            ";

    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(':amount', $amount, PDO::PARAM_STR);
    $stmt->bindParam(':category_id', $category_id, PDO::PARAM_INT);
    $stmt->bindParam(':pix_type', $pix_type, PDO::PARAM_INT);
    $stmt->bindParam(':pix', $pix, PDO::PARAM_STR);
    $stmt->bindParam(':clt_id', $clt_id, PDO::PARAM_INT);
    $stmt->bindParam(':cliente_nome', $cliente_nome, PDO::PARAM_STR);
    $stmt->bindParam(':remarks', $remarks, PDO::PARAM_STR);
    $stmt->bindParam(':id_despesa', $id_despesa, PDO::PARAM_INT);

    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Despesa atualizada com sucesso!'];
    } else {
        $_SESSION['alert_message'] = ['type' => 'warning', 'text' => 'Nenhuma alteração foi realizada. A despesa pode não pertencer a você, já ter sido aprovada ou os dados eram idênticos.'];
    }
} catch (PDOException $e) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Ocorreu um erro ao tentar atualizar a despesa.'];
}

// Se houver filtros na return_url, anexa à URL de redirecionamento
if (!empty($return_url)) {
    header("Location: detalharRD.php?" . $return_url);
} else {
    header("Location: detalharRD.php");
}
exit;
