<?php
session_start();

header('Content-Type: application/json; charset=utf-8');
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

$response = ['status' => 'error'];

$conexao = ConnectionN3();
if (!$conexao) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao conectar ao banco de dados.'];
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['atd_id'])) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Dados insuficientes recebidos.'];
    echo json_encode($response);
    exit;
}

$atd_id = (int)$_POST['atd_id'];
if ($atd_id <= 0) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Atendimento inválido.'];
    echo json_encode($response);
    exit;
}

$stmtPerm = $conexao->prepare("SELECT tecnico FROM atendimentos WHERE id = :id LIMIT 1");
$stmtPerm->execute([':id' => $atd_id]);
$atendimentoPerm = $stmtPerm->fetch(PDO::FETCH_ASSOC);
if (!$atendimentoPerm) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Atendimento não encontrado.'];
    echo json_encode($response);
    exit;
}

if ((int)$m3_00 < 1 || !n3_can_atd_execute_owner_or_manager((int)$atendimentoPerm['tecnico'])) {
    n3_forbidden('Você não tem permissão para anexar arquivos neste atendimento.');
}

if (!isset($_FILES['input_arquivo']) || $_FILES['input_arquivo']['error'] !== UPLOAD_ERR_OK) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro no upload ou nenhum arquivo foi enviado.'];
    echo json_encode($response);
    exit;
}

$uploadRoot = realpath(__DIR__ . '/../uploads');
if ($uploadRoot === false) {
    $uploadRoot = __DIR__ . '/../uploads';
    if (!mkdir($uploadRoot, 0755, true) && !is_dir($uploadRoot)) {
        $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao preparar diretório de upload.'];
        echo json_encode($response);
        exit;
    }
    $uploadRoot = realpath($uploadRoot);
}

$nome_original = basename((string)$_FILES['input_arquivo']['name']);
$tipo_arquivo = (string)($_FILES['input_arquivo']['type'] ?? 'application/octet-stream');
$extensao_arquivo = strtolower(pathinfo($nome_original, PATHINFO_EXTENSION));
$extensao_arquivo = preg_replace('/[^a-z0-9]/', '', $extensao_arquivo);
if ($extensao_arquivo === '') {
    $extensao_arquivo = 'bin';
}

$nome_unico = date('Y_m') . '_' . uniqid('', true) . '_' . time() . '.' . $extensao_arquivo;
$caminho_fisico = $uploadRoot . DIRECTORY_SEPARATOR . $nome_unico;
$caminho_banco = '../uploads/' . $nome_unico;

if (!move_uploaded_file($_FILES['input_arquivo']['tmp_name'], $caminho_fisico)) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao mover o arquivo para o diretório de upload.'];
    echo json_encode($response);
    exit;
}

$user_id = (int)$_SESSION['allterusN3Id'];

try {
    $comando = $conexao->prepare(
        "INSERT INTO documentos (atd_id, user_id, caminho_arquivo, nome_arquivo, tipo_arquivo, data_upload)
         VALUES (:atd_id, :user_id, :caminho_unico, :nome_original, :tipo_arquivo, NOW())"
    );

    $comando->bindParam(':caminho_unico', $caminho_banco, PDO::PARAM_STR);
    $comando->bindParam(':nome_original', $nome_original, PDO::PARAM_STR);
    $comando->bindParam(':atd_id', $atd_id, PDO::PARAM_INT);
    $comando->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $comando->bindParam(':tipo_arquivo', $tipo_arquivo, PDO::PARAM_STR);

    if (!$comando->execute()) {
        @unlink($caminho_fisico);
        $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao salvar informações no banco.'];
        echo json_encode($response);
        exit;
    }

    $inter_desc = 'Adicionou um anexo: ' . htmlspecialchars($nome_original, ENT_QUOTES, 'UTF-8');
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
} catch (Throwable $e) {
    @unlink($caminho_fisico);
    error_log('Erro ao salvar anexo do atendimento: ' . $e->getMessage());
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro ao salvar o anexo.'];
}

echo json_encode($response);
exit;
