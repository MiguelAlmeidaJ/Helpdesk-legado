<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../ativos/ativos_conect.php");


// Estabelece a conexão com o banco de dados
$pdopatrimonios = ConnectionPatrimonios();
if (!$pdopatrimonios) {
    exit("Erro ao conectar ao banco de dados plugins_app."); // Exibe mensagem de erro se a conexão falhar
}

// Verifica se o ID foi enviado via POST
if (isset($_POST['id'])) {
    $id = $_POST['id'];

    // Prepara a declaração para deletar o patrimonio
    $stmt = $pdopatrimonios->prepare("DELETE FROM patrimonios WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        echo "patrimonio deletado com sucesso!";
    } else {
        echo "Erro ao deletar o patrimonio.";
    }
} else {
    echo "ID do patrimonio não fornecido.";
}
?>
