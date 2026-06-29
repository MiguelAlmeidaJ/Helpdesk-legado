<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");

function rel_current_base_url()
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ((int)($_SERVER['SERVER_PORT'] ?? 80) === 443);
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/N3TI/rel/gerar_pdf.php')), '/');
    return $scheme . '://' . $host . $scriptDir;
}

function rel_wkhtmltopdf_path()
{
    $exe = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'wkhtmltopdf.exe' : 'wkhtmltopdf';
    $local = realpath(__DIR__ . '/../wkhtmltopdf/bin/' . $exe);
    if ($local && is_file($local)) {
        return $local;
    }
    return $exe;
}

$f_clt = filter_input(INPUT_GET, 'f_clt', FILTER_SANITIZE_NUMBER_INT) ?? '';
$data_1 = filter_input(INPUT_GET, 'data_1', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';
$data_2 = filter_input(INPUT_GET, 'data_2', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '';
$f_local = filter_input(INPUT_GET, 'f_local', FILTER_SANITIZE_NUMBER_INT) ?? '';
$f_nivel = filter_input(INPUT_GET, 'f_nivel', FILTER_SANITIZE_NUMBER_INT) ?? '0';
$tokenRecebido = $_GET['token'] ?? '';

if (isset($_SESSION['token']) && $_SESSION['token'] !== '' && !hash_equals((string)$_SESSION['token'], (string)$tokenRecebido)) {
    http_response_code(403);
    exit('Erro: token invalido.');
}

$wkhtmltopdf = rel_wkhtmltopdf_path();
$outputFile = tempnam(sys_get_temp_dir(), 'n3ti_rel_');
if ($outputFile === false) {
    http_response_code(500);
    exit('Erro ao criar arquivo temporario.');
}
$pdfFile = $outputFile . '.pdf';
@rename($outputFile, $pdfFile);

$query = http_build_query([
    'f_clt' => $f_clt,
    'data_1' => $data_1,
    'data_2' => $data_2,
    'f_local' => $f_local,
    'f_nivel' => $f_nivel,
    'token' => $tokenRecebido,
]);
$url = rel_current_base_url() . '/rel_Unificado.php?' . $query;

$command = escapeshellarg($wkhtmltopdf) . ' ' . escapeshellarg($url) . ' ' . escapeshellarg($pdfFile) . ' 2>&1';
$output = [];
$returnCode = 0;
exec($command, $output, $returnCode);

if ($returnCode !== 0 || !is_file($pdfFile) || filesize($pdfFile) === 0) {
    @unlink($pdfFile);
    error_log('Erro wkhtmltopdf rel/gerar_pdf.php: ' . implode("\n", $output));
    http_response_code(500);
    exit('Erro ao gerar PDF.');
}

$filename = 'relatorio_' . preg_replace('/\D+/', '', (string)$f_clt) . '.pdf';
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($pdfFile));
readfile($pdfFile);
@unlink($pdfFile);
exit;
