<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../ativos/ativos_conect.php");


// Estabelece a conexão com o banco de dados
$pdoAtivos = ConnectionPluginsApp();
if (!$pdoAtivos) {
    exit("Erro ao conectar ao banco de dados plugins_app."); // Exibe mensagem de erro se a conexão falhar
}

// Verifica se o ID foi enviado via POST
if (isset($_POST['id'])) {
    $id = $_POST['id'];

    // Prepara a declaração para deletar o ativo
    $stmt = $pdoAtivos->prepare("DELETE FROM ativos WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        echo "Ativo deletado com sucesso!";
    } else {
        echo "Erro ao deletar o ativo.";
    }
} else {
    echo "ID do ativo não fornecido.";
}
?>
