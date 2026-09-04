<?php
session_start();
include_once("../all/conect.php");
include_once("../all/seguranca.php");
include_once("../all/permissoes.php");
include_once("../all/app_url.php");

// Habilitar debug para encontrar erros
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json'); // 🔹 Define JSON como saída

// Conectar ao banco de dados
$pdo = ConnectionN3();

// Recuperar valores do POST
$clt_id = $_POST["clt_id"] ?? "";
$catalogo_categoria = $_POST["categoria_id"] ?? "";
$atd_id = $_POST["atd_id"] ?? "";

// Verifica se as variáveis da sessão estão definidas
$cargo_id = $_SESSION['user_funcao'] ?? "";
$user_id = $_SESSION['allterusN3Id'] ?? "";

// Definir permissões de setor
if ($m8_04 == 5 || $m8_04 == 6) {
    $setor = [1, 2];
} elseif ($m8_04 == 1 || $m8_04 == 2) {
    $setor = [1];
} elseif ($m8_04 == 3 || $m8_04 == 4) {
    $setor = [2];
} else {
    $setor = [];
}

// 🚨 Caso o usuário não tenha permissão
if (empty($setor)) {
    $_SESSION['mensagem'] = "<i class='fas fa-exclamation-circle'></i> Usuário sem permissões.";
    $_SESSION['mensagem_cor'] = "alert-danger";

    ob_end_clean(); // Limpa qualquer saída antes do JSON
    echo json_encode(["status" => "reload", "message" => "Acesso negado.", "atd_id" => $atd_id]);
    exit;
}

// Criar placeholders para a query SQL
$placeholders = implode(',', array_fill(0, count($setor), '?'));

$sql = "SELECT * FROM catalogos WHERE cliente_id = ? AND catalogo_categoria = ? AND setor IN ($placeholders)";
$stmt = $pdo->prepare($sql);
$params = array_merge([$clt_id, $catalogo_categoria], $setor);
$stmt->execute($params);
$catalogos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 🔹 Se encontrou apenas 1 catálogo, abre diretamente
if (count($catalogos) === 1) {
    echo json_encode([
        "status" => "open_new_tab",
        "url" => "../catlg/catalogo_visualizar.php?id=" . $catalogos[0]['id']
    ]);
    exit;
}

// 🔹 Se encontrou mais de 1 catálogo, envia para catalogo.php
if (count($catalogos) > 1) {
    echo json_encode([
        "status" => "post",
        "url" => "/n3ti/catlg/catalogo.php",
        "data" => [
            "clt_id" => $clt_id,
            "catalogo_categoria" => $catalogo_categoria,
            "setor" => array_values($setor) // 🔹 Garante que seja um array JSON válido
        ]    
    ]);
    exit;
}

// 🔹 Caso não encontre catálogos, recarrega a página e exibe mensagem
$_SESSION['mensagem'] = "<i class='fas fa-exclamation-circle'></i> Nenhum catálogo encontrado nesta categoria";
$_SESSION['mensagem_cor'] = "alert-danger";

ob_end_clean();

// Modificar aqui para incluir o atd_id na resposta
echo json_encode([
    "url" => ((int)$atd_id > 0
        ? allterus_web_url('/tickets/' . rawurlencode((string)(int)$atd_id))
        : allterus_web_url('/tickets')),
    "status" => "reload",
    "message" => "Nenhum catálogo encontrado nesta categoria.",
    "alert_type" => "alert-danger",
    "atd_id" => $atd_id // Adiciona o atd_id na resposta
]);
exit;
?>