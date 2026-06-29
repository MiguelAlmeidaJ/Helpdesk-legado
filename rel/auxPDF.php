<?php
date_default_timezone_set('America/Sao_Paulo');
session_start();
include_once("../all/seguranca.php");
include_once("../all/permissoes.php");

header('Content-Type: application/json; charset=utf-8');

function responderJson(bool $success, string $message, array $files = [], array $errors = [], int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'files' => $files,
        'errors' => $errors,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function validarDataRelatorio(string $data): ?string
{
    $dateTime = DateTime::createFromFormat('Y-m-d', $data);
    if (!$dateTime || $dateTime->format('Y-m-d') !== $data) {
        return null;
    }

    return $data;
}

function normalizarNomeArquivo(string $texto): string
{
    $texto = html_entity_decode($texto, ENT_QUOTES, 'UTF-8');
    $convertido = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto);
    if ($convertido !== false) {
        $texto = $convertido;
    }

    $texto = preg_replace('/[^A-Za-z0-9_-]+/', '_', $texto);
    $texto = trim($texto, '_');
    $texto = substr($texto, 0, 90);

    return $texto !== '' ? $texto : 'Cliente';
}

function dataArquivo(string $data): string
{
    return DateTime::createFromFormat('Y-m-d', $data)->format('d-m-Y');
}

function localizarWkhtmltopdf(): ?string
{
    $binario = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'wkhtmltopdf.exe' : 'wkhtmltopdf';
    $local = realpath(__DIR__ . '/../wkhtmltopdf/bin/' . $binario);
    if ($local && is_file($local)) {
        return $local;
    }

    $paths = explode(PATH_SEPARATOR, getenv('PATH') ?: '');
    foreach ($paths as $path) {
        $candidate = rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $binario;
        if (is_file($candidate) && is_executable($candidate)) {
            return $candidate;
        }
    }

    return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? null : $binario;
}

function registrarErroPdf(string $contexto, string $detalhe): void
{
    $detalhe = trim($detalhe);
    if ($detalhe !== '') {
        error_log('[N3TI PDF] ' . $contexto . ' - ' . $detalhe);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(false, 'Este recurso aceita apenas POST.', [], [], 405);
}

set_time_limit(600);

$clientesData = $_POST['clientes'] ?? [];
$dataInicio = validarDataRelatorio((string)($_POST['data_inicio'] ?? ''));
$dataFim = validarDataRelatorio((string)($_POST['data_fim'] ?? ''));

if (!is_array($clientesData) || empty($clientesData) || !$dataInicio || !$dataFim) {
    responderJson(false, 'Selecione ao menos um cliente e informe um periodo valido.', [], [], 400);
}

if (strtotime($dataInicio) > strtotime($dataFim)) {
    responderJson(false, 'A data inicial nao pode ser maior que a data final.', [], [], 400);
}

$wkhtmltopdf = localizarWkhtmltopdf();
if (!$wkhtmltopdf) {
    responderJson(false, 'Gerador de PDF nao encontrado no servidor.', [], [], 500);
}

$relatoriosDir = __DIR__ . DIRECTORY_SEPARATOR . 'relatorios';
if (!is_dir($relatoriosDir) && !mkdir($relatoriosDir, 0777, true) && !is_dir($relatoriosDir)) {
    responderJson(false, 'Nao foi possivel preparar a pasta de relatorios.', [], [], 500);
}

$realRelatoriosDir = realpath($relatoriosDir);
if (!$realRelatoriosDir) {
    responderJson(false, 'Pasta de relatorios indisponivel.', [], [], 500);
}

$sessionName = session_name();
$sessionId = session_id();
if ($sessionId) {
    session_write_close();
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = preg_replace('/[^A-Za-z0-9.\-_:]/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
$baseUrl = $scheme . '://' . $host . $basePath;

$gerados = [];
$erros = [];
$dataInicioArquivo = dataArquivo($dataInicio);
$dataFimArquivo = dataArquivo($dataFim);

foreach ($clientesData as $cliente) {
    $clienteId = filter_var($cliente['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $clienteNome = trim((string)($cliente['nome'] ?? ''));

    if (!$clienteId || $clienteNome === '') {
        $erros[] = 'Cliente invalido recebido no formulario.';
        continue;
    }

    $params = [
        'f_clt' => $clienteId,
        'f_local' => 0,
        'data_1' => $dataInicio,
        'data_2' => $dataFim,
        'f_nivel' => 0,
        'pdf' => 1,
    ];

    $url = $baseUrl . '/rel_Unificado_Id.php?' . http_build_query($params);
    $nomeArquivo = 'Relatorio_' . normalizarNomeArquivo($clienteNome) . '_' . $dataInicioArquivo . '_a_' . $dataFimArquivo . '.pdf';
    $pdfFile = $realRelatoriosDir . DIRECTORY_SEPARATOR . $nomeArquivo;
    $realPdfDir = realpath(dirname($pdfFile));

    if ($realPdfDir !== $realRelatoriosDir) {
        $erros[] = $clienteNome . ': nome de arquivo invalido.';
        continue;
    }

    $tmpLog = tempnam(sys_get_temp_dir(), 'n3ti_pdf_bulk_');
    $logFile = $tmpLog ? $tmpLog . '.log' : sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('n3ti_pdf_bulk_', true) . '.log';
    if ($tmpLog) {
        @unlink($tmpLog);
    }

    $args = [
        $wkhtmltopdf,
        '--quiet',
        '--enable-local-file-access',
        '--page-size', 'A4',
        '--orientation', 'Portrait',
        '--print-media-type',
        '--no-stop-slow-scripts',
        '--run-script', "document.body.classList.add('rel-pdf-render');",
        '--javascript-delay', '1000',
        '--header-left', 'N3TI - Relatorio',
        '--header-right', date('d/m/Y H:i'),
        '--header-font-size', '8',
        '--header-spacing', '3',
        '--footer-center', 'Pagina [page] de [toPage]',
        '--footer-font-size', '8',
        '--footer-spacing', '3',
        '--load-error-handling', 'ignore',
        '--load-media-error-handling', 'ignore',
        '--image-quality', '95',
        '--dpi', '120',
        '--margin-top', '14mm',
        '--margin-right', '10mm',
        '--margin-bottom', '14mm',
        '--margin-left', '10mm',
    ];

    if ($sessionId) {
        $args[] = '--cookie';
        $args[] = $sessionName;
        $args[] = $sessionId;
    }

    $args[] = $url;
    $args[] = $pdfFile;

    $cmd = implode(' ', array_map('escapeshellarg', $args)) . ' 2> ' . escapeshellarg($logFile);
    $output = [];
    $returnCode = 0;
    exec($cmd, $output, $returnCode);

    clearstatcache(true, $pdfFile);
    if ($returnCode !== 0 || !is_file($pdfFile) || filesize($pdfFile) === 0) {
        $log = is_file($logFile) ? trim(file_get_contents($logFile)) : '';
        registrarErroPdf('Cliente ' . $clienteId, $log ?: 'wkhtmltopdf retornou codigo ' . $returnCode);
        @unlink($pdfFile);
        $erros[] = $clienteNome . ': falha ao gerar PDF.';
    } else {
        $gerados[] = $nomeArquivo;
    }

    @unlink($logFile);
}

if (empty($gerados)) {
    responderJson(false, 'Nenhum relatorio foi gerado.', [], $erros, 500);
}

$responderSuccess = empty($erros);
$responderMessage = count($gerados) . ' relatorio(s) gerado(s).';
if (!$responderSuccess) {
    $responderMessage .= ' Alguns clientes tiveram falha.';
}

responderJson($responderSuccess, $responderMessage, $gerados, $erros);
