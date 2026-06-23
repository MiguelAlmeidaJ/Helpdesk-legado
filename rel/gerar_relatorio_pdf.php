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
    exit('Relat?rio n?o permitido para gera??o em PDF.');
}

$wkhtmltopdf = __DIR__ . '/../wkhtmltopdf/bin/wkhtmltopdf.exe';
if (!file_exists($wkhtmltopdf)) {
    http_response_code(500);
    exit('wkhtmltopdf n?o encontrado.');
}

$params = $_GET;
unset($params['pagina']);
$params['pdf'] = '1';

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
$url = $scheme . '://' . $host . $basePath . '/' . rawurlencode($pagina) . '?' . http_build_query($params);

$tmpFile = tempnam(sys_get_temp_dir(), 'n3_rel_');
$pdfFile = $tmpFile . '.pdf';
@unlink($tmpFile);

$cookieArg = '';
if (session_id()) {
    $cookieArg = ' --cookie ' . escapeshellarg(session_name()) . ' ' . escapeshellarg(session_id());
}

$cmd = escapeshellarg($wkhtmltopdf)
    . ' --quiet --enable-local-file-access --page-size A4 --orientation Landscape --print-media-type'
    . $cookieArg
    . ' ' . escapeshellarg($url)
    . ' ' . escapeshellarg($pdfFile);

$descriptors = [
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w'],
];
$process = proc_open($cmd, $descriptors, $pipes);
if (!is_resource($process)) {
    http_response_code(500);
    exit('N?o foi poss?vel iniciar a gera??o do PDF.');
}

$startedAt = time();
$timeoutSeconds = 45;
do {
    $status = proc_get_status($process);
    if (!$status['running']) {
        break;
    }
    if ((time() - $startedAt) >= $timeoutSeconds) {
        proc_terminate($process);
        foreach ($pipes as $pipe) { @fclose($pipe); }
        proc_close($process);
        @unlink($pdfFile);
        http_response_code(504);
        exit('Tempo limite excedido ao gerar o PDF do relat?rio.');
    }
    usleep(200000);
} while (true);

foreach ($pipes as $pipe) { @fclose($pipe); }
proc_close($process);

if (!file_exists($pdfFile) || filesize($pdfFile) === 0) {
    http_response_code(500);
    exit('N?o foi poss?vel gerar o PDF do relat?rio.');
}

$nomeBase = preg_replace('/[^a-zA-Z0-9_-]+/', '_', pathinfo($pagina, PATHINFO_FILENAME));
$filename = $nomeBase . '_' . date('Ymd_His') . '.pdf';

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($pdfFile));
readfile($pdfFile);
@unlink($pdfFile);
exit;
