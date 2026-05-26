<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");

// Função para verificar configurações PHP
function verificarConfiguracoesPHP() {
    echo 'upload_max_filesize: ' . ini_get('upload_max_filesize') . "\n";
    echo 'post_max_size: ' . ini_get('post_max_size') . "\n";
    echo 'memory_limit: ' . ini_get('memory_limit') . "\n";
}

verificarConfiguracoesPHP();

$pdoPatrimonio = ConnectionPatrimonios();
if (!$pdoPatrimonio) {
    exit("Erro ao conectar ao banco de dados.");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id']) && isset($_FILES['editImagemInput'])) {
    $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);

    // Processar o upload da imagem
    if ($_FILES['editImagemInput']['error'] === UPLOAD_ERR_OK) {
        $img_patrimonio = file_get_contents($_FILES['editImagemInput']['tmp_name']);
    } else {
        exit("Erro no upload da imagem.");
    }

    // Atualizar a imagem do patrimônio no banco de dados
    $stmt = $pdoPatrimonio->prepare("UPDATE patrimonios SET img_patrimonio = :img_patrimonio WHERE id = :id");
    if (!$stmt) {
        exit("Erro na atualização do patrimônio: " . $pdoPatrimonio->errorInfo()[2]);
    }

    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->bindParam(':img_patrimonio', $img_patrimonio, PDO::PARAM_LOB);

    if ($stmt->execute()) {
        echo "Imagem editada com sucesso!";
    } else {
        exit("Erro ao atualizar patrimônio: " . $pdoPatrimonio->errorInfo()[2]);
    }
} else {
    exit("Dados incompletos.");
}
?>
