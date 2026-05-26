<?php
// ARQUIVO ATUALIZADO NOVO FINANCEIRO

session_start();
include_once("../all/conect.php");


header('Content-Type: application/json');

$pdo = connectionN3();
if (!$pdo) {
    echo json_encode(['erro' => 'Erro ao conectar ao banco de dados.']);
    exit;
}


// Parâmetros da requisição
$tipo = $_GET['tipo'] ?? '';
$identificador = $_GET['identificador'] ?? '';
$dataInicio = $_GET['data_inicio'] ?? null;
$dataFim = $_GET['data_fim'] ?? null;
$status = $_GET['status'] ?? null;


if (empty($tipo) || empty($identificador) || empty($dataInicio) || empty($dataFim) || empty($status)) {
    echo json_encode(['erro' => 'Parâmetros inválidos.']);
    exit;
}

// Monta a query base
$sql = "SELECT r.id, r.date_created, u.user_nome, r.remarks, r.amount 
        FROM running_balance r 
        LEFT JOIN usuarios u ON u.user_id = r.user_id";
$clausulaWhere = " WHERE r.aj = 1 ";
$parametros = [];


// Adiciona o filtro de data
$clausulaWhere .= " AND r.date_created BETWEEN :inicio AND :fim";
$parametros[':inicio'] = $dataInicio;
$parametros[':fim'] = $dataFim . " 23:59:59";

if ($status !== null && $status !== '') {
    $clausulaWhere .= " AND r.status = :status";
    $parametros[':status'] = $status;
}


// Adiciona o filtro específico do tipo
switch ($tipo) {
    case 'categoria':
        $sql .= " LEFT JOIN category c_antigo ON r.category_id = c_antigo.id
                  LEFT JOIN categorias_subgrupo c_novo ON r.category_id = c_novo.id";

        // A cláusula WHERE agora precisa checar em ambas as tabelas
        $clausulaWhere .= " AND (c_antigo.categories = :identificador OR c_novo.nome = :identificador)";
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
