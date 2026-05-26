<?php
include_once("../all/conect.php");

// Conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
    // Resposta JSON sem mensagem HTML
    echo json_encode(['status' => 'error', 'message' => 'Erro ao conectar ao banco de dados.']);
    exit;
}

$response = ['status' => 'error', 'message' => 'Erro desconhecido.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $img_id = $_POST['img_id'];
    $user_id = $_POST['user_id'];

    // Verifica se a imagem existe
    $stmt = $pdo->prepare("SELECT img_tarefa FROM imagens_tarefa WHERE id = :img_id");
    $stmt->bindParam(':img_id', $img_id, PDO::PARAM_INT);
    $stmt->execute();
    $imagem = $stmt->fetch(PDO::FETCH_ASSOC);

    if (isset($_FILES['editImagemInput']) && $_FILES['editImagemInput']['error'] === UPLOAD_ERR_OK) {
        $img_tarefa = file_get_contents($_FILES['editImagemInput']['tmp_name']);
    } else {
        $img_tarefa = $imagem['img_tarefa'];
    }

    // Atualiza a imagem
    $stmt = $pdo->prepare("UPDATE imagens_tarefa SET img_tarefa = :img_tarefa, user_id = :user_id, data_atualizacao = NOW() WHERE id = :img_id");
    $stmt->bindParam(':img_tarefa', $img_tarefa, PDO::PARAM_LOB);
    $stmt->bindParam(':img_id', $img_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_STR);

    if ($stmt->execute()) {
        $response = ['status' => 'success', 'message' => 'Imagem atualizada com sucesso.'];
    } else {
        $response = ['status' => 'error', 'message' => 'Erro ao atualizar a imagem.'];
    }
} else {
    $response = ['status' => 'error', 'message' => 'Método de requisição inválido.'];
}

// Envia a resposta JSON
echo json_encode($response);
?>
