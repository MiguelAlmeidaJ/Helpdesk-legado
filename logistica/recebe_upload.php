<?php
// ARQUIVO ATUALIZADO NOVO FINANCEIRO
header('Content-Type: application/json');

session_start();
include_once("../all/seguranca.php"); // Garante que o usuário está logado
include_once("../all/conect.php");
include_once("../all/permissoes.php");

if (!isset($_FILES['pdfFile']) || $_FILES['pdfFile']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Nenhum arquivo enviado ou erro no upload.']);
    exit;
}

$nome_da_sessao = isset($_SESSION['allterusN3Nome']) ? trim($_SESSION['allterusN3Nome']) : '';

$nome_Usuario = !empty($nome_da_sessao) ? $nome_da_sessao : 'identificar_usuario';

// Função para limpar o nome para usar no arquivo
function sanitizarNomeParaArquivo($nome)
{
    $nomeLimpo = strtolower($nome);
    $nomeLimpo = preg_replace('/[áàãâä]/u', 'a', $nomeLimpo);
    $nomeLimpo = preg_replace('/[éèêë]/u', 'e', $nomeLimpo);
    $nomeLimpo = preg_replace('/[íìîï]/u', 'i', $nomeLimpo);
    $nomeLimpo = preg_replace('/[óòõôö]/u', 'o', $nomeLimpo);
    $nomeLimpo = preg_replace('/[úùûü]/u', 'u', $nomeLimpo);
    $nomeLimpo = preg_replace('/[ç]/u', 'c', $nomeLimpo);
    $nomeLimpo = preg_replace('/[^a-z0-9]+/', '_', $nomeLimpo);
    $nomeLimpo = trim($nomeLimpo, '_');
    return $nomeLimpo ?: 'identificar_usuario';
}

$nomeUsuario = sanitizarNomeParaArquivo($nome_Usuario);



$categoryId = isset($_POST['category_id']) ? (int)$_POST['category_id'] : 0;
if ($categoryId === 0) {
    echo json_encode(['success' => false, 'message' => 'Categoria não selecionada.']);
    exit;
}

$subfolder = ($categoryId === 43) ? 'notas_servico/' : 'comprov_diversos/';

// Caminho Físico Absoluto para salvar o arquivo
// dirname(__DIR__) sobe um nível a partir da pasta 'logistica' para a raiz do projeto.
$baseUploadDir = dirname(__DIR__) . '/uploads_rd/' . $subfolder;

// Caminho Web para montar a URL
$baseWebDir = 'uploads_rd/' . $subfolder;

$meses = [
    1 => 'janeiro',
    2 => 'fevereiro',
    3 => 'marco',
    4 => 'abril',
    5 => 'maio',
    6 => 'junho',
    7 => 'julho',
    8 => 'agosto',
    9 => 'setembro',
    10 => 'outubro',
    11 => 'novembro',
    12 => 'dezembro'
];
$mesAtual = $meses[date('n')];
$anoAtual = date('Y');
$dirMesAno = $mesAtual . '_' . $anoAtual . '/';

$uploadDir = $baseUploadDir . $dirMesAno;

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(['success' => false, 'message' => 'Falha ao criar o diretório de destino: ' . $uploadDir]);
        exit;
    }
}
if (!is_writable($uploadDir)) {
    echo json_encode(['success' => false, 'message' => 'O diretório de destino não tem permissão de escrita.']);
    exit;
}

$fileExtension = pathinfo($_FILES['pdfFile']['name'], PATHINFO_EXTENSION);
if (strtolower($fileExtension) !== 'pdf') {
    echo json_encode(['success' => false, 'message' => 'Apenas arquivos PDF são permitidos.']);
    exit;
}

$pre_name = str_replace('/', '_', $subfolder) . $mesAtual . '_' . $anoAtual . '_';

$fileName = $pre_name . $nomeUsuario . '_' . uniqid() . '.pdf';
$destination = $uploadDir . $fileName;

if (move_uploaded_file($_FILES['pdfFile']['tmp_name'], $destination)) {
    // Monta a URL dinamicamente conforme o host onde o sistema estiver publicado
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
    $host = preg_replace('/[^A-Za-z0-9.\-_:]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    $scriptDir = trim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    $basePath = preg_replace('#/logistica$#', '', $scriptDir);
    $webPath = $protocol . $host . '/' . ($basePath ? $basePath . '/' : '') . $baseWebDir . $dirMesAno . $fileName;

    echo json_encode([
        'success' => true,
        'url' => $webPath,
        'fileName' => $fileName
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Erro ao mover o arquivo para o destino final.']);
}
