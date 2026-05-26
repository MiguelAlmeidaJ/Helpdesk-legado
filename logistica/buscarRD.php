<?php
// buscarRD.php CORRIGIDO

session_start();
header('Content-Type: application/json'); // Define o tipo de resposta como JSON

include_once("../all/conect.php");
// Removi os includes de segurança e permissão, pois esta é uma busca de dados.
// Se precisar deles, pode adicionar novamente.

// Prepara a resposta padrão
$response = ['success' => false, 'message' => 'Ocorreu um erro desconhecido.'];

// Pega o ID enviado pelo JavaScript via POST
$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

if (!$id) {
    $response['message'] = 'ID da despesa é inválido ou não foi fornecido.';
    echo json_encode($response);
    exit;
}

$pdo = connectionN3();
if (!$pdo) {
    $response['message'] = 'Erro: Não foi possível conectar ao banco de dados.';
    echo json_encode($response);
    exit;
}

try {
    // SQL para buscar todos os dados necessários para preencher o modal
    $sql = "SELECT id, user_id, amount, category_id, pix_type, pix, clt_id, cliente, remarks 
            FROM running_balance
            WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);

    // Usa fetch() para pegar apenas um resultado, não uma lista
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($data) {
        // Se encontrou a despesa, prepara a resposta de sucesso
        $response = [
            'success' => true,
            'data'    => $data // Envia os dados encontrados
        ];
    } else {
        // Se não encontrou, informa que o registro não existe
        $response['message'] = 'Despesa não encontrada com o ID fornecido.';
    }
} catch (PDOException $e) {
    // Em caso de erro na consulta SQL
    $response['message'] = 'Erro na consulta ao banco de dados.';
    // Para depuração (opcional): $response['details'] = $e->getMessage();
}

// Envia a resposta final em formato JSON para o JavaScript
echo json_encode($response);
