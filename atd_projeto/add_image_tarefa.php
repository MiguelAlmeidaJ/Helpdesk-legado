<?php
include_once("../all/conect.php");

// Conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
    exit("Erro ao conectar ao banco de dados.");
}

if (isset($_POST['tarefa_id']) && isset($_POST['user_id'])) {
    $tarefa_id = $_POST['tarefa_id'];
    $user_id = $_POST['user_id'];

    // Imprime o ID do atendimento e o user_id
    echo '<script>';
    echo 'console.log("ID em add: ' . $tarefa_id . '");';
    echo 'console.log("User ID em add: ' . $user_id . '");';
    echo '</script>';

    // Processar o upload da imagem se uma nova imagem for enviada
    if (isset($_FILES['addImagemInput']) && $_FILES['addImagemInput']['error'] === UPLOAD_ERR_OK) {
        $img_tarefa = file_get_contents($_FILES['addImagemInput']['tmp_name']);

        // Inserir os dados no banco de dados
        $stmt = $pdo->prepare("INSERT INTO imagens_tarefa (tarefa_id, user_id, img_tarefa, data_atualizacao) VALUES (:tarefa_id, :user_id, :img_tarefa, NOW())");
        $stmt->bindParam(':img_tarefa', $img_tarefa, PDO::PARAM_LOB);
        $stmt->bindParam(':tarefa_id', $tarefa_id, PDO::PARAM_STR);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_STR);

        if ($stmt->execute()) {
            echo "Imagem adicionada com sucesso.";
        } else {
            exit("Erro na adição da imagem: " . $stmt->errorInfo()[2]);
        }
    } else {
        exit("Erro no upload da imagem ou nenhuma imagem foi enviada.");
    }
}
?>
