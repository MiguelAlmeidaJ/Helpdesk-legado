<?php
// recebe_upload_financeiro.php
header('Content-Type: application/json');
session_start(); // Inicia a sessão para segurança

// --- Validações Iniciais ---
if (!isset($_FILES['pdfFile']) || $_FILES['pdfFile']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Nenhum arquivo enviado ou erro no upload. Código: ' . ($_FILES['pdfFile']['error'] ?? 'N/A')]);
    exit;
}
$originalFilename = $_FILES['pdfFile']['name']; // Guarda o nome original
$fileExtension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));

if ($fileExtension !== 'pdf') {
    echo json_encode(['success' => false, 'message' => 'Apenas arquivos PDF são permitidos.']);
    exit;
}

// --- Parâmetros ---
$contaId = isset($_POST['conta_id']) ? (int)$_POST['conta_id'] : 0;
$tipoConta = isset($_POST['tipo_conta']) ? trim($_POST['tipo_conta']) : 'desconhecido';

if (!in_array($tipoConta, ['pagar', 'receber'])) {
     echo json_encode(['success' => false, 'message' => 'Tipo de conta inválido recebido: ' . htmlspecialchars($tipoConta)]);
     exit;
}

// --- Estrutura de Pastas (Corrigida) ---
$baseUploadDir = rtrim(dirname(__DIR__), '/') . '/uploads_financeiro/'; 
$subfolder = ($tipoConta === 'pagar') ? 'comprovantes_pagamentos/' : 'comprovantes_recebimentos/';
$anoAtual = date('Y');
$mesAtual = date('m');

$uploadDir = $baseUploadDir . $subfolder . $anoAtual . '/' . $mesAtual . '/';
$baseWebDir = 'uploads_financeiro/' . $subfolder . $anoAtual . '/' . $mesAtual . '/'; 

// --- Criação do Diretório ---
// (Código de criação do diretório permanece o mesmo)
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) { 
        echo json_encode(['success' => false, 'message' => 'Falha ao criar diretório: ' . $uploadDir . '. Verifique permissões em: ' . dirname($uploadDir)]);
        exit;
    }
}
if (!is_writable($uploadDir)) {
    echo json_encode(['success' => false, 'message' => 'Sem permissão de escrita no diretório: ' . $uploadDir]);
    exit;
}

// ## NOVA LÓGICA PARA NOME DO ARQUIVO ##

// 1. Extrai o nome base (sem extensão) do arquivo original
$basename = pathinfo($originalFilename, PATHINFO_FILENAME);

// 2. Sanitiza o nome base para uso seguro no sistema de arquivos
function sanitizeBasename($filename) {
    $filename = strtolower($filename);
    // Remove acentos e caracteres especiais comuns
    $filename = preg_replace('/[áàãâä]/u', 'a', $filename);
    $filename = preg_replace('/[éèêë]/u', 'e', $filename);
    $filename = preg_replace('/[íìîï]/u', 'i', $filename);
    $filename = preg_replace('/[óòõôö]/u', 'o', $filename);
    $filename = preg_replace('/[úùûü]/u', 'u', $filename);
    $filename = preg_replace('/[ç]/u', 'c', $filename);
    // Substitui espaços e caracteres não alfanuméricos (exceto hífen e underscore) por underscore
    $filename = preg_replace('/[^a-z0-9_\-]+/i', '_', $filename);
    // Remove múltiplos underscores consecutivos
    $filename = preg_replace('/_+/', '_', $filename);
    // Remove underscores do início e do fim
    $filename = trim($filename, '_');
    // Garante que não fique vazio
    return empty($filename) ? 'arquivo' : $filename;
}
$sanitizedBasename = sanitizeBasename($basename);

// 3. Gera um ID único
$uniqueId = uniqid();

// 4. Monta o novo nome do arquivo: nome_original_sanitizado_IDunico.pdf
$newFileName = $sanitizedBasename . '_' . $uniqueId . '.' . $fileExtension;
$destination = $uploadDir . $newFileName;

// --- Mover o Arquivo ---
if (move_uploaded_file($_FILES['pdfFile']['tmp_name'], $destination)) {
    // Monta a URL final conforme o host onde o sistema estiver publicado
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $host = preg_replace('/[^A-Za-z0-9.\-_:]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    $scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    $basePath = preg_replace('#/logistica$#', '', $scriptDir);
    $webPath = $protocol . $host . '/' . ($basePath ? $basePath . '/' : '') . $baseWebDir . $newFileName;

    echo json_encode([
        'success' => true,
        'url' => $webPath,
        'fileName' => $newFileName // Retorna o NOVO nome do arquivo
    ]);
} else {
    // ... (Código de erro permanece o mesmo) ...
    echo json_encode([
        'success' => false, 
        'message' => 'Erro CRÍTICO ao mover arquivo para: ' . $destination . '...' 
    ]);
}
?>
