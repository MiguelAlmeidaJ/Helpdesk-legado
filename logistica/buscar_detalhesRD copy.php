<?php
// buscar_detalhesRD.php

session_start();
include_once("../all/conect.php");


header('Content-Type: application/json');

$pdo = ConnectionN3rd();
if (!$pdo) {
    echo json_encode(['erro' => 'Erro ao conectar ao banco de dados.']);
    exit;
}

// Parâmetros da requisição
$tipo = $_GET['tipo'] ?? '';
$identificador = $_GET['identificador'] ?? '';
$dataInicio = $_GET['data_inicio'] ?? null;
$dataFim = $_GET['data_fim'] ?? null;

if (empty($tipo) || empty($identificador) || empty($dataInicio) || empty($dataFim)) {
    echo json_encode(['erro' => 'Parâmetros inválidos.']);
    exit;
}

// Monta a query base
$sql = "SELECT r.id, r.date_created, u.firstname, r.remarks, r.amount 
        FROM running_balance r 
        JOIN user u ON u.id = r.user_id";
$clausulaWhere = " WHERE r.status = 4 AND r.aj = 1 ";
$parametros = [];

// Adiciona o filtro de data
$clausulaWhere .= " AND r.date_created BETWEEN :inicio AND :fim";
$parametros[':inicio'] = $dataInicio;
$parametros[':fim'] = $dataFim . " 23:59:59";


// Adiciona o filtro específico do tipo
switch ($tipo) {
    case 'categoria':
        $sql .= " JOIN category c ON c.id = r.category_id";
        $clausulaWhere .= " AND c.categories = :identificador";
        $parametros[':identificador'] = $identificador;
        break;

    case 'cliente':
        $clausulaWhere .= " AND r.cliente = :identificador";
        $parametros[':identificador'] = $identificador;
        break;

    case 'colaborador':
        $clausulaWhere .= " AND r.user_id = :identificador";
        $parametros[':identificador'] = (int)$identificador;
        break;

    default:
        echo json_encode(['erro' => 'Tipo de filtro desconhecido.']);
        exit;
}

$sqlFinal = $sql . $clausulaWhere . " ORDER BY r.date_created DESC";

try {
    $stmt = $pdo->prepare($sqlFinal);
    $stmt->execute($parametros);
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($resultados);
} catch (PDOException $e) {
    echo json_encode(['erro' => 'Erro na consulta.', 'detalhes' => $e->getMessage()]);
}
