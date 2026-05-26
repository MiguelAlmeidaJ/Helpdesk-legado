<?php
require_once 'qrcodepix_config.php'; // onde está a função montarPayloadPix

$chave_pix = $_GET['chave'] ?? '';
$valor = (float)($_GET['valor'] ?? 0);
$nome = $_GET['nome'] ?? 'Pagamento';
$cidade = $_GET['cidade'] ?? 'NIVEL3 TI';
$txid = 'RD' . date('YmdHis') . rand(100, 999); // mesmo que no gerar_qrcodePix.php

if (empty($chave_pix) || $valor <= 0) {
    exit("Erro: Dados inválidos.");
}

$payload = montarPayloadPix($chave_pix, $valor, $nome, $cidade, $txid);

// Exibe o payload formatado
header('Content-Type: text/plain');
echo "Payload gerado para QR Code PIX:\n\n";
echo $payload;