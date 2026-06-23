<?php
require_once __DIR__ . '/../phpqrcode/qrlib.php';
require_once __DIR__ . '/qrcodepix_config.php';

$chave_pix = $_GET['chave'] ?? '';
$valor = (float)($_GET['valor'] ?? 0);
$nome = $_GET['nome'] ?? 'Pagamento';
$txid = 'RD' . date('YmdHis') . rand(100, 999);

if (empty($chave_pix) || $valor <= 0) {
    http_response_code(400);
    exit('Dados inválidos para gerar o QR Code.');
}

$payload = montarPayloadPix($chave_pix, $valor, $nome, $txid);
$matrix = QRcode::text($payload, false, QR_ECLEVEL_M, 5, 2);
$moduleSize = 6;
$size = count($matrix) * $moduleSize;

header('Content-Type: image/svg+xml; charset=UTF-8');
echo '<svg xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . $size . '" viewBox="0 0 ' . $size . ' ' . $size . '" role="img" aria-label="QR Code PIX">';
echo '<rect width="100%" height="100%" fill="#ffffff"/>';
foreach ($matrix as $y => $row) {
    foreach (str_split($row) as $x => $cell) {
        if ($cell === '1') {
            echo '<rect x="' . ($x * $moduleSize) . '" y="' . ($y * $moduleSize) . '" width="' . $moduleSize . '" height="' . $moduleSize . '" fill="#000000"/>';
        }
    }
}
echo '</svg>';
