<?php
// test_qr_inline.php — mostra payload e QR inline para DEBUG

require_once '../phpqrcode/qrlib.php';      // ajuste o caminho se necessário
require_once 'qrcodepix_config.php';        // seu arquivo com montarPayloadPix, calcularCRC16, etc.

// parâmetros via GET
$chave = $_GET['chave'] ?? '';
$valor = isset($_GET['valor']) ? (float)$_GET['valor'] : 0.0;
$nome  = $_GET['nome'] ?? 'Pagamento Teste';
$cidade = $_GET['cidade'] ?? 'NIVEL3 TI';
$txid = 'RD' . date('YmdHis') . rand(100, 999);

// validação mínima
if (empty($chave) || $valor <= 0) {
    echo "<p style='color:darkred'>Erro: passe ?chave=...&valor=...&nome=... no URL</p>";
    exit;
}

// monta payload
$payload = montarPayloadPix($chave, $valor, $nome, $cidade, $txid);

// calcula CRC (apenas demonstrativo — sua função já devolve CRC no final)
$crc_aplicado = substr($payload, -4);

// gera imagem PNG em memória e converte para base64
ob_start();
QRcode::png($payload, false, 'M', 5, 2);
$imageString = ob_get_clean();
$base64 = base64_encode($imageString);

// saída HTML simples para debug
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Teste QR PIX — Inline</title>
</head>
<body>
  <h2>Teste do Payload / QR Code</h2>

  <p><strong>Chave:</strong> <?php echo htmlspecialchars($chave); ?></p>
  <p><strong>Valor:</strong> R$ <?php echo number_format($valor,2,',','.'); ?></p>
  <p><strong>Nome:</strong> <?php echo htmlspecialchars($nome); ?></p>
  <p><strong>Cidade:</strong> <?php echo htmlspecialchars($cidade); ?></p>
  <p><strong>TXID:</strong> <?php echo htmlspecialchars($txid); ?></p>

  <h3>Payload gerado (copiar/colar para validar)</h3>
  <pre style="background:#f3f3f3; padding:10px; border-radius:4px; max-width:1000px; white-space:pre-wrap;">
<?php echo htmlspecialchars($payload); ?>
  </pre>

  <p><strong>CRC (últimos 4 hex):</strong> <?php echo htmlspecialchars($crc_aplicado); ?></p>

  <h3>QR Code (scan com app do banco)</h3>
  <img src="data:image/png;base64,<?php echo $base64; ?>" alt="QR PIX">

  <hr>
  <p>Dicas de teste:</p>
  <ul>
    <li>Cole o payload no validador (ex.: <em>pix.qrcodes.dev</em> / gerador de BR Code) para ver se o parser do Bacen aceita.</li>
    <li>Teste com a chave exatamente como está cadastrada no banco e também com variações (CPF com e sem pontuação, telefone com e sem +55) — alguns apps tratam formatos de forma diferente.</li>
  </ul>
</body>
</html>
