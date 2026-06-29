<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/permissoes.php");

$allowedPages = [
    'atd_abertos_por_tecnico.php',
    'atd_total_por_cliente.php',
    'atd_total_por_tecnico.php',
    'atd_total_por_categoria.php',
    'atd_tempo_por_tecnico.php',
    'atd_analitico_por_cliente.php',
    'atd_analitico_por_tarefa.php',
    'atd_analitico_por_melhoria.php',
    'rel_Unificado.php',
    'rel_Unificado_Id.php',
    'rel_ti.php',
    'rel_tempo_atd.php',
];

$pagina = basename($_GET['pagina'] ?? '');
if (!in_array($pagina, $allowedPages, true)) {
    http_response_code(400);
    exit('Relatório não permitido para geração em PDF.');
}

$wkhtmltopdf = localizarWkhtmltopdf();
if (!$wkhtmltopdf) {
    http_response_code(500);
    exit('wkhtmltopdf não encontrado.');
}

$params = $_GET;
unset($params['pagina']);
$params['pdf'] = '1';
ksort($params);

$sessionName = session_name();
$sessionId = session_id();
$userId = $_SESSION['allterusN3Id'] ?? $sessionId ?: 'guest';

if ($sessionId) {
    session_write_close();
}

$requestHash = sha1($userId . '|' . $pagina . '|' . http_build_query($params));
$cacheDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'n3ti_pdf_cache';
if (!is_dir($cacheDir) && !mkdir($cacheDir, 0777, true) && !is_dir($cacheDir)) {
    http_response_code(500);
    exit('Não foi possível preparar a pasta temporária do PDF.');
}

$cachedPdf = $cacheDir . DIRECTORY_SEPARATOR . $requestHash . '.pdf';
$lockFile = $cacheDir . DIRECTORY_SEPARATOR . $requestHash . '.lock';
$cacheTtlSeconds = 300;

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

function sendPdfFile(string $path, string $filename): void
{
    if (ob_get_level()) {
        ob_end_clean();
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=300');
    readfile($path);
    exit;
}

function failPdf(string $message, int $statusCode = 500): void
{
    http_response_code($statusCode);
    header('Content-Type: text/plain; charset=utf-8');
    exit($message);
}

$nomeBase = preg_replace('/[^a-zA-Z0-9_-]+/', '_', pathinfo($pagina, PATHINFO_FILENAME));
$filename = $nomeBase . '_' . date('Ymd_His') . '.pdf';

clearstatcache(true, $cachedPdf);
if (is_file($cachedPdf) && (time() - filemtime($cachedPdf)) <= $cacheTtlSeconds && filesize($cachedPdf) > 0) {
    sendPdfFile($cachedPdf, $filename);
}

$lockHandle = fopen($lockFile, 'c');
if (!$lockHandle) {
    failPdf('Não foi possível preparar a geração do PDF.');
}

$lockStartedAt = time();
while (!flock($lockHandle, LOCK_EX | LOCK_NB)) {
    clearstatcache(true, $cachedPdf);
    if (is_file($cachedPdf) && filesize($cachedPdf) > 0) {
        fclose($lockHandle);
        sendPdfFile($cachedPdf, $filename);
    }

    if ((time() - $lockStartedAt) >= 60) {
        fclose($lockHandle);
        failPdf('A geração anterior ainda está em andamento. Tente novamente em alguns segundos.', 503);
    }

    usleep(250000);
}

clearstatcache(true, $cachedPdf);
if (is_file($cachedPdf) && (time() - filemtime($cachedPdf)) <= $cacheTtlSeconds && filesize($cachedPdf) > 0) {
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
    sendPdfFile($cachedPdf, $filename);
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
$url = $scheme . '://' . $host . $basePath . '/' . rawurlencode($pagina) . '?' . http_build_query($params);

$tmpFile = tempnam($cacheDir, 'n3_rel_');
$pdfFile = $tmpFile . '.pdf';
$logFile = $tmpFile . '.log';
@unlink($tmpFile);

$cookieArgs = [];
if ($sessionId) {
    $cookieArgs[] = '--cookie';
    $cookieArgs[] = $sessionName;
    $cookieArgs[] = $sessionId;
}

$args = array_merge([
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
], $cookieArgs, [$url, $pdfFile]);

$cmdParts = array_map('escapeshellarg', $args);
$cmd = implode(' ', $cmdParts) . ' 2> ' . escapeshellarg($logFile);

set_time_limit(120);
$output = [];
$returnCode = 0;
exec($cmd, $output, $returnCode);

clearstatcache(true, $pdfFile);
if ($returnCode !== 0 || !is_file($pdfFile) || filesize($pdfFile) === 0) {
    $log = is_file($logFile) ? trim(file_get_contents($logFile)) : '';
    @unlink($pdfFile);
    @unlink($logFile);
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
    @unlink($lockFile);

    $detail = $log ? " Detalhe: " . substr($log, 0, 700) : '';
    failPdf('Não foi possível gerar o PDF do relatório.' . $detail);
}

@unlink($logFile);
if (!@rename($pdfFile, $cachedPdf)) {
    @copy($pdfFile, $cachedPdf);
    @unlink($pdfFile);
}

flock($lockHandle, LOCK_UN);
fclose($lockHandle);
@unlink($lockFile);

sendPdfFile($cachedPdf, $filename);

