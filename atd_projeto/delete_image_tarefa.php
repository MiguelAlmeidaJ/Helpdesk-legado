<?php
include_once("../all/conect.php");

// Conexão com o banco de dados
$pdo = ConnectionN3();
if (!$pdo) {
    // Envia uma resposta JSON de erro sem imprimir mensagens na tela
    echo json_encode(['status' => 'error', 'message' => 'Erro ao conectar ao banco de dados.']);
    exit;
}

$response = ['status' => 'error', 'message' => 'Erro desconhecido.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = isset($_POST['img_id']) ? $_POST['img_id'] : '';

    // Verifique se a imagem existe
    $query = "SELECT * FROM imagens_tarefa WHERE id = :id";
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $image = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($image) {
        // Exclua a imagem do banco de dados
        $query = "DELETE FROM imagens_tarefa WHERE id = :id";
        $stmt = $pdo->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        if ($stmt->execute()) {
            $response = ['status' => 'success', 'message' => 'Imagem excluída com sucesso.'];
        } else {
            $response = ['status' => 'error', 'message' => 'Erro ao excluir a imagem.'];
        }
    } else {
        $response = ['status' => 'error', 'message' => 'Imagem não encontrada. ID: ' . $id];
    }
} else {
    $response = ['status' => 'error', 'message' => 'Método de requisição inválido.'];
}

// Envia a resposta JSON para o frontend
echo json_encode($response);
?>
