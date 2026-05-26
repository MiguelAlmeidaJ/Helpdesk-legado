<?php

// Inclui a biblioteca QR Code
require_once '../phpqrcode/qrlib.php';
// Inclui as funções auxiliares que criamos no passo 1
require_once 'qrcodepix_config.php'; // Ou o nome do arquivo que você salvou as funções

// Pega os dados da URL (via GET)
$chave_pix = $_GET['chave'] ?? '';
$valor = (float)($_GET['valor'] ?? 0);
$nome = $_GET['nome'] ?? 'Pagamento';
$cidade = $_GET['cidade'] ?? 'NIVEL3TI'; // Idealmente, você teria a cidade do usuário/empresa
$txid = 'RD' . date('YmdHis') . rand(100, 999); // ID único da transação

// Validação básica
if (empty($chave_pix) || $valor <= 0) {
    // Você pode gerar uma imagem de erro aqui, se quiser
    exit("Dados inválidos para gerar o QR Code.");
}

// Monta o payload do PIX
$payload = montarPayloadPix($chave_pix, $valor, $nome, $cidade, $txid);

// ===== TESTE: imprimir payload e parar =====
// header('Content-Type: text/plain; charset=UTF-8');
// echo "Payload gerado para QR Code PIX:\n\n";
// echo $payload;
// exit; 

// ===== Geração do QR Code (descomente quando parar de testar) =====
header('Content-Type: image/png');
QRcode::png($payload, false, 'M', 5, 2);
