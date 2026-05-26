<?php
// MUDANÇA: O header() deve ser a PRIMEIRA linha a ser executada.
header('Content-Type: application/json');

// Verifica se o arquivo foi enviado corretamente
if (!isset($_FILES['pdfFile']) || $_FILES['pdfFile']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Nenhum arquivo enviado ou erro no upload. Código: ' . ($_FILES['pdfFile']['error'] ?? 'N/A')]);
    exit;
}

// MUDANÇA: Usar o caminho absoluto diretamente. Não concatenar com __DIR__.
$uploadDir = 'C:/xampp/htdocs/N3TI/documentos/';


// Verifica se o diretório de destino existe e tem permissão de escrita
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(['success' => false, 'message' => 'Falha ao criar o diretório de destino.']);
        exit;
    }
}
if (!is_writable($uploadDir)) {
    echo json_encode(['success' => false, 'message' => 'O diretório de destino não tem permissão de escrita. Verifique as permissões da pasta.']);
    exit;
}

// Gera um nome de arquivo único
$fileExtension = pathinfo($_FILES['pdfFile']['name'], PATHINFO_EXTENSION);
if (strtolower($fileExtension) !== 'pdf') {
    echo json_encode(['success' => false, 'message' => 'Apenas arquivos PDF são permitidos.']);
    exit;
}
$fileName = 'comprovante_' . uniqid() . '.pdf';
$destination = $uploadDir . $fileName;

// Move o arquivo para o diretório de destino
if (move_uploaded_file($_FILES['pdfFile']['tmp_name'], $destination)) {
    
    // MUDANÇA: Construa a URL baseada em como você acessa o projeto pelo navegador
    $webPath = 'https://allterus.nivel3ti.com.br/n3ti/documentos/' . $fileName;

    // Resposta de sucesso em JSON
    echo json_encode([
        'success' => true,
        'url' => $webPath,
        'fileName' => $fileName
    ]);

} else {
    // Resposta de erro em JSON
    echo json_encode(['success' => false, 'message' => 'Erro ao mover o arquivo para o destino final.']);
}
