<?php
// delete_image.php

session_start();

header('Content-Type: application/json; charset=utf-8');

include_once("../all/conect.php");
include_once("../all/seguranca.php");
include_once("../all/permissoes.php");

$response = ['status' => 'error'];

$pdo = ConnectionN3();
if (!$pdo) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao conectar ao banco de dados.'];
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    $id = (int)$_POST['id'];

    if ($id > 0) {
        $query = "SELECT id, atd_id FROM imagens WHERE id = :id";
        $stmt = $pdo->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $image = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($image) {
            $stmt_perm = $pdo->prepare("SELECT tecnico FROM atendimentos WHERE id = :id LIMIT 1");
            $stmt_perm->execute([':id' => (int)$image['atd_id']]);
            $atendimento_perm = $stmt_perm->fetch(PDO::FETCH_ASSOC);
            if (!$atendimento_perm) {
                $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Atendimento nao encontrado.'];
                echo json_encode($response, JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ((int)$m3_00 < 1 || !n3_can_atd_execute_owner_or_manager((int)$atendimento_perm['tecnico'])) {
                n3_forbidden('Voce nao tem permissao para excluir imagens deste atendimento.');
            }

            // Exclui a imagem do banco de dados
            $query_delete = "DELETE FROM imagens WHERE id = :id";
            $stmt_delete = $pdo->prepare($query_delete);
            $stmt_delete->bindParam(':id', $id, PDO::PARAM_INT);
            
            if ($stmt_delete->execute() && $stmt_delete->rowCount() > 0) {
                
                $user_id = $_SESSION['allterusN3Id'];

                $atd_id = $image['atd_id'];
                $inter_desc = 'Deletou uma imagem: <del>Imagem #' . $id . '</del>';

                $comando_log = $pdo->prepare(
                    "INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) 
                     VALUES (:tipo, :atd, :user, NOW(), :descricao)"
                );
                $tipo_interacao = 11;
                $comando_log->bindParam(':tipo', $tipo_interacao, PDO::PARAM_INT);
                $comando_log->bindParam(':atd', $atd_id, PDO::PARAM_INT);
                $comando_log->bindParam(':user', $user_id, PDO::PARAM_INT);
                $comando_log->bindParam(':descricao', $inter_desc, PDO::PARAM_STR);
                $comando_log->execute();

                $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Imagem excluída com sucesso.'];
                $response['status'] = 'success';

            } else {
                $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao excluir a imagem.'];
            }
        } else {
            $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Imagem não encontrada. ID: ' . $id];
        }
    } else {
        $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'ID da imagem inválido.'];
    }
} else {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Método de requisição inválido.'];
}

echo json_encode($response);
