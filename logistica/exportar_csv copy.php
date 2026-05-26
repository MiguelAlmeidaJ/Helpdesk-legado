<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");

// if ($m9_02 == 0) {
//     header("Location: ../home.php");
//     exit;
// }

$pdo = ConnectionN3rd();

$dataInicio = $_GET['data_inicio'] ?? date('Y-m-01');
$dataFim = $_GET['data_fim'] ?? date('Y-m-t');
$cliente = $_GET['cliente'] ?? '';
$user_id = $_GET['user_id'] ?? '';



$params = [
    ':inicio' => $dataInicio,
    ':fim' => $dataFim
];

$filtros = "r.status = 4 AND r.date_created BETWEEN :inicio AND :fim";


if (!empty($cliente)) {
    $filtros .= " AND r.cliente = :cliente";
    $params[':cliente'] = $cliente;
}

if (!empty($user_id)) {
    $filtros .= " AND r.user_id = :user_id";
    $params[':user_id'] = $user_id;
}

// var_dump($params, $filtros);
// exit;
$sql = "
    SELECT r.id, r.remarks, r.amount, r.date_created, u.firstname, u.lastname, c.categories, r.cliente
    FROM running_balance r
    JOIN user u ON u.id = r.user_id
    JOIN category c ON c.id = r.category_id
    WHERE $filtros
    ORDER BY r.date_created DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$despesas = $stmt->fetchAll(PDO::FETCH_ASSOC);


// Cabeçalhos para download
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="despesas_pagas.csv"');

// Abrir o "arquivo" de saída
$output = fopen('php://output', 'w');

// Adiciona BOM para forçar Excel a abrir como UTF-8
fwrite($output, "\xEF\xBB\xBF");

// Define separador como ponto e vírgula
$delimiter = ';';

// Cabeçalhos das colunas
fputcsv($output, ['ID', 'Descrição', 'Valor', 'Data', 'Usuário', 'Categoria', 'Cliente'], $delimiter);


// Dados
foreach ($despesas as $row) {
    fputcsv($output, [
        $row['id'],
        trim($row['remarks']),
        $row['amount'] = number_format($row['amount'], 2, ',', '.'),
        date('Y-m-d', strtotime($row['date_created'])), // Formato ISO
        $row['firstname'] . ' ' . $row['lastname'],
        $row['categories'],
        $row['cliente']
    ], $delimiter);
}

fclose($output);
exit;
