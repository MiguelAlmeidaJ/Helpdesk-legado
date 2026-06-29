<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

$response = ['status' => 'error', 'message' => 'Dados insuficientes ou método inválido.'];

function atd_document_physical_path($storedPath)
{
    $storedPath = str_replace('\\', '/', (string)$storedPath);
    $storedPath = ltrim($storedPath, '/');
    $storedPath = preg_replace('#^(\.\./)+#', '', $storedPath);

    $baseUploads = realpath(__DIR__ . '/../uploads');
    if ($baseUploads === false) {
        return null;
    }

    $candidate = realpath(__DIR__ . '/../' . $storedPath);
    if ($candidate === false) {
        return null;
    }

    $baseUploadsNorm = rtrim(str_replace('\\', '/', $baseUploads), '/') . '/';
    $candidateNorm = str_replace('\\', '/', $candidate);
    if (strpos($candidateNorm, $baseUploadsNorm) !== 0) {
        return null;
    }

    return $candidate;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id'])) {
    echo json_encode($response);
    exit;
}

$conexao = ConnectionN3();
if (!$conexao) {
    $response['message'] = 'Erro ao conectar ao banco.';
    echo json_encode($response);
    exit;
}

try {
    $id_para_excluir = (int)$_POST['id'];
    $user_id = (int)$_SESSION['allterusN3Id'];

    $comando_busca = $conexao->prepare("SELECT caminho_arquivo, nome_arquivo, atd_id FROM documentos WHERE id = :id");
    $comando_busca->bindParam(':id', $id_para_excluir, PDO::PARAM_INT);
    $comando_busca->execute();
    $documento = $comando_busca->fetch(PDO::FETCH_ASSOC);

    if (!$documento) {
        $response['message'] = 'Documento não encontrado.';
        echo json_encode($response);
        exit;
    }

    $stmtPerm = $conexao->prepare("SELECT tecnico FROM atendimentos WHERE id = :id LIMIT 1");
    $stmtPerm->execute([':id' => (int)$documento['atd_id']]);
    $atendimentoPerm = $stmtPerm->fetch(PDO::FETCH_ASSOC);
    if (!$atendimentoPerm) {
        $response['message'] = 'Atendimento nao encontrado.';
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ((int)$m3_00 < 1 || !n3_can_atd_execute_owner_or_manager((int)$atendimentoPerm['tecnico'])) {
        n3_forbidden('Voce nao tem permissao para excluir anexos deste atendimento.');
    }

    $comando_delete = $conexao->prepare("DELETE FROM documentos WHERE id = :id");
    $comando_delete->bindParam(':id', $id_para_excluir, PDO::PARAM_INT);

    if ($comando_delete->execute() && $comando_delete->rowCount() > 0) {
        $caminhoFisico = atd_document_physical_path($documento['caminho_arquivo']);
        if ($caminhoFisico && is_file($caminhoFisico)) {
            @unlink($caminhoFisico);
        }

        $nome_original = $documento['nome_arquivo'];
        $atd_id = (int)$documento['atd_id'];
        $inter_desc = 'Excluiu o anexo: ' . htmlspecialchars($nome_original, ENT_QUOTES, 'UTF-8');
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
        $response = ['status' => 'success', 'message' => 'Anexo excluído com sucesso.'];
    } else {
        $response['message'] = 'Não foi possível excluir o registro.';
    }
} catch (Throwable $e) {
    error_log('Erro ao excluir documento: ' . $e->getMessage());
    $response['message'] = 'Erro ao excluir documento.';
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;
