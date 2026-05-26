<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
include_once("../all/conect.php");

$response = ['status' => 'error', 'message' => 'Dados insuficientes ou método inválido.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id']) && isset($_POST['user_id'])) {

    $conexao = ConnectionN3();
    if ($conexao) {
        try {
            $id_para_excluir = (int)$_POST['id'];
            $user_id = $_SESSION['allterusN3Id'];


            $comando_busca = $conexao->prepare("SELECT caminho_arquivo, nome_arquivo, atd_id FROM documentos WHERE id = :id");
            $comando_busca->bindParam(':id', $id_para_excluir, PDO::PARAM_INT);
            $comando_busca->execute();
            $documento = $comando_busca->fetch(PDO::FETCH_ASSOC);

            if ($documento) {
                $comando_delete = $conexao->prepare("DELETE FROM documentos WHERE id = :id");
                $comando_delete->bindParam(':id', $id_para_excluir, PDO::PARAM_INT);

                if ($comando_delete->execute() && $comando_delete->rowCount() > 0) {
                    
                    if (!empty($documento['caminho_arquivo']) && file_exists($documento['caminho_arquivo'])) {
                        unlink($documento['caminho_arquivo']);
                    }

                    $atd_id = $documento['atd_id'];
                    $nome_original = $documento['nome_arquivo'];
                    $inter_desc = 'Deletou um anexo: <del>' . htmlspecialchars($nome_original) . '</del>';

                    $comando_log = $conexao->prepare(
                        "INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) 
                         VALUES (:tipo, :atd, :user, NOW(), :descricao)"
                    );

                    $tipo_interacao = 11;
                    $comando_log->bindParam(':tipo', $tipo_interacao, PDO::PARAM_INT);
                    $comando_log->bindParam(':atd', $atd_id, PDO::PARAM_INT);
                    $comando_log->bindParam(':user', $user_id, PDO::PARAM_INT);
                    $comando_log->bindParam(':descricao', $inter_desc, PDO::PARAM_STR);
                    
                    $comando_log->execute();

                    $_SESSION['alert_message'] = ['type' => 'success', 'text' => '<strong> Anexo excluído com sucesso! </strong>'];
                    $response['status'] = 'success';

                } else {
                    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao tentar excluir o documento do banco de dados.'];
                }
            } else {
                $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Documento não encontrado no banco de dados com o ID fornecido.'];
            }
        } catch (Exception $e) {
            $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro no servidor: ' . $e->getMessage()];
        }
    } else {
        $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro de conexão com o banco de dados.'];
    }
} else {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Dados insuficientes ou método inválido.'];
}


echo json_encode($response);
