<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

include_once("../all/seguranca.php");
include_once("../all/conect.php");

header('Content-Type: application/json; charset=utf-8');

$cliente = filter_input(INPUT_GET, 'cliente', FILTER_VALIDATE_INT);
if ($cliente === null || $cliente === false) {
    $cliente = filter_input(INPUT_POST, 'cliente', FILTER_VALIDATE_INT);
}

if ($cliente === null || $cliente === false || $cliente <= 0) {
    echo json_encode([]);
    exit;
}

if (isset($_SESSION['tipo']) && (int)$_SESSION['tipo'] === 2) {
    $empresas = array_values(array_filter(
        array_map('intval', $_SESSION['empresas'] ?? []),
        static fn ($id) => $id > 0
    ));

    if (!in_array((int)$cliente, $empresas, true)) {
        http_response_code(403);
        echo json_encode([]);
        exit;
    }
}

$pdo = ConnectionN3();
$show = $pdo->prepare(
    "SELECT locais.local_id, locais.local_nom
     FROM locais
     WHERE locais.local_clt = :cliente
     ORDER BY locais.local_nom ASC"
);
$show->execute([':cliente' => (int)$cliente]);

$locais = [];
while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
    $locais[] = [
        'id' => (int)$row['local_id'],
        'nome' => $row['local_nom'],
    ];
}

echo json_encode(
    $locais ?: [['id' => 0, 'nome' => 'Sem local cadastrado']]
);
