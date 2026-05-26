<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
include_once("../all/conect.php");

$response = ['status' => 'error'];

$conexao = ConnectionN3();
if (!$conexao) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao conectar ao banco de dados.'];
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($response);
    exit;
}

if (isset($_POST['atd_id']) && isset($_POST['user_id'])) {

    if (isset($_FILES['input_arquivo']) && $_FILES['input_arquivo']['error'] === UPLOAD_ERR_OK) {
        
        $diretorio_upload = '../uploads/';

        if (!is_dir($diretorio_upload)) {
            mkdir($diretorio_upload, 0755, true);
        }

        $nome_original = $_FILES['input_arquivo']['name'];
        $tipo_arquivo = $_FILES['input_arquivo']['type'];
        $extensao_arquivo = pathinfo($nome_original, PATHINFO_EXTENSION);
        $nome_unico = date('Y_m') . '_' . uniqid() . '_' . time() . '.' . $extensao_arquivo;
        $caminho_completo = $diretorio_upload . $nome_unico;

        if (move_uploaded_file($_FILES['input_arquivo']['tmp_name'], $caminho_completo)) {
            
            $atd_id = $_POST['atd_id'];
            // $user_id = $_POST['user_id'];
            $user_id = $_SESSION['allterusN3Id'];
            $comando = $conexao->prepare(
                "INSERT INTO documentos (atd_id, user_id, caminho_arquivo, nome_arquivo, tipo_arquivo, data_upload) 
                 VALUES (:atd_id, :user_id, :caminho_unico, :nome_original, :tipo_arquivo, NOW())"
            );
            
            $comando->bindParam(':caminho_unico', $caminho_completo, PDO::PARAM_STR); 
            $comando->bindParam(':nome_original', $nome_original, PDO::PARAM_STR);
            $comando->bindParam(':atd_id', $atd_id, PDO::PARAM_STR);
            $comando->bindParam(':user_id', $user_id, PDO::PARAM_STR);
            $comando->bindParam(':tipo_arquivo', $tipo_arquivo, PDO::PARAM_STR);

            if ($comando->execute()) {
                
                // Lógica da interação (continua a mesma)
                $inter_desc = 'Adicionou um anexo: '. htmlspecialchars($nome_original) ;
                $comando_log = $conexao->prepare(
                    "INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) 
                     VALUES (:tipo, :atd, :user, NOW(), :descricao)"
                );
                
                $tipo_interacao = 12; 
                $comando_log->bindParam(':tipo', $tipo_interacao, PDO::PARAM_INT);
                $comando_log->bindParam(':atd', $atd_id, PDO::PARAM_INT);
                $comando_log->bindParam(':user', $user_id, PDO::PARAM_INT);
                $comando_log->bindParam(':descricao', $inter_desc, PDO::PARAM_STR);
                $comando_log->execute(); 
                
                $_SESSION['alert_message'] = ['type' => 'success', 'text' => '<strong> Arquivo adicionado com sucesso! </strong>'];
                $response['status'] = 'success';

            } else {
                unlink($caminho_completo); 
                $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao salvar informações no banco.'];
            }

        } else {
             $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao mover o arquivo para o diretório de upload.'];
        }
    } else {
         $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro no upload ou nenhum arquivo foi enviado.'];
    }
} else {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Dados insuficientes recebidos.'];
}

echo json_encode($response);
exit;
