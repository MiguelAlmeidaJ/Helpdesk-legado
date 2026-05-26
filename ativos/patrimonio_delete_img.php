<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../ativos/ativos_conect.php");

// Estabelece a conexão com o banco de dados
$pdo = ConnectionPatrimonios();

if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

// Obtém o ID do patrimônio
$id = isset($_POST['id']) ? $_POST['id'] : '';

if ($id) {
    // Atualiza o campo da imagem para NULL
    $query = "UPDATE patrimonios SET img_patrimonio = NULL WHERE id = :id";
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => $stmt->errorInfo()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'ID do patrimônio não fornecido']);
}
?>
