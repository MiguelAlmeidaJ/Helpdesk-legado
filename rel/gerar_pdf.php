<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");

// Captura os valores recebidos na URL
$f_clt = $_GET['f_clt'] ?? '';
$data_1 = $_GET['data_1'] ?? '';
$data_2 = $_GET['data_2'] ?? '';
$f_local = $_GET['f_local'] ?? '';
$f_nivel = $_GET['f_nivel'] ?? '0'; // Define 0 caso esteja vazio
$token = $_GET['token'] ?? '';

// Debug: Verificação do token na sessão e o token recebido
echo "Token na Sessão: " . ($_SESSION['token'] ?? 'NÃO DEFINIDO') . PHP_EOL;
echo "Token Recebido: " . $token . PHP_EOL;
exit;

// Verifica se o token da sessão corresponde ao recebido
if (!isset($_SESSION['token']) || $_SESSION['token'] !== $token) {
    die("Erro: Token inválido ou não encontrado.");
}

// Caminho do wkhtmltopdf
$wkhtmltopdf = "C:\\xampp\\htdocs\\N3TI\\wkhtmltopdf\\bin\\wkhtmltopdf.exe";

// Arquivo de saída
$outputFile = "C:\\xampp\\htdocs\\N3TI\\rel\\relatorio_$f_clt.pdf";

// URL do relatório com o token
$url = "http://localhost/N3TI/rel/rel_Unificado.php?f_clt=$f_clt&data_1=$data_1&data_2=$data_2&f_local=$f_local&f_nivel=$f_nivel&token=$token";

// Executa o comando para gerar o PDF
$command = "\"$wkhtmltopdf\" \"$url\" \"$outputFile\"";
shell_exec($command);

// Força o download do arquivo
header("Content-Type: application/pdf");
header("Content-Disposition: attachment; filename=\"relatorio_$f_clt.pdf\"");
readfile($outputFile);

// Exclui o arquivo após o download
unlink($outputFile);
exit;
?>
