<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// Importa o FPDF do seu diretório específico
require_once('../dependences/fpdf/fpdf.php');

if ($m9_02 < 2) { exit("Acesso negado."); }

$pdo = connectionN3();

// Captura dos filtros
$dataInicio = $_GET['date_start'] ?? date('Y-m-01');
$dataFim    = $_GET['date_end']   ?? date('Y-m-t');
$user_id_filter      = $_GET['user_id'] ?? null;
$cliente_nome_filter = $_GET['cliente_nome'] ?? null;
$category_id_filter  = $_GET['category_id'] ?? [];

// Construção da Query SQL
$params = [':dataInicio' => $dataInicio, ':dataFim' => $dataFim];
$filtroSQL = "";

if (!empty($user_id_filter)) {
    $filtroSQL .= " AND r.user_id = :user_id_filter ";
    $params[':user_id_filter'] = $user_id_filter;
}
if (!empty($cliente_nome_filter)) {
    $filtroSQL .= " AND r.cliente = :cliente_nome_filter ";
    $params[':cliente_nome_filter'] = $cliente_nome_filter;
}
if (!empty($category_id_filter)) {
    $category_ids = is_array($category_id_filter) ? $category_id_filter : [$category_id_filter];
    $filtroSQL .= " AND r.category_id IN (" . implode(',', array_map('intval', $category_ids)) . ") ";
}

$sql = "
    SELECT r.date_updated, r.remarks, r.amount, r.cliente, u.user_nome, cs.nome AS categories
    FROM running_balance r
    JOIN usuarios u ON u.user_id = r.user_id
    LEFT JOIN categorias_subgrupo cs ON cs.id = r.category_id 
    WHERE r.status = 4 AND r.aj = 1
    AND DATE(r.date_created) BETWEEN :dataInicio AND :dataFim
    $filtroSQL
    ORDER BY r.date_created ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
$total = array_sum(array_column($results, 'amount'));

// --- CLASSE PARA PADRONIZAÇÃO DO PDF ---
class PDF extends FPDF {
    // Helper para converter encoding sem usar utf8_decode (Obsoleto PHP 8.2)
    function txt($s) {
        return mb_convert_encoding($s, "ISO-8859-1", "UTF-8");
    }

    function Header() {
        $this->SetFont('Arial', 'B', 14);
        $this->Cell(0, 10, $this->txt('Relatório de Pagamentos'), 0, 1, 'C');
        $this->SetFont('Arial', '', 10);
        $this->Ln(5);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->Cell(0, 10, $this->txt('Página ') . $this->PageNo() . '/{nb}', 0, 0, 'C');
    }
}

// Inicializa o PDF em Paisagem (L), Milímetros (mm), Papel A4
$pdf = new PDF('L', 'mm', 'A4');
$pdf->AliasNbPages();
$pdf->AddPage();

// Informações do Filtro - USANDO $pdf->txt() CORRETAMENTE
$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(0, 7, $pdf->txt("Período: " . date("d/m/Y", strtotime($dataInicio)) . " até " . date("d/m/Y", strtotime($dataFim))), 0, 1, 'L');
$pdf->Ln(2);

// Cabeçalho da Tabela - Ajuste de Larguras (Total ~277mm)
$w = [10, 25, 45, 40, 50, 82, 25]; 
$header = ['#', 'Data', 'Colaborador', 'Categoria', 'Cliente', 'Observações', 'Valor'];

$pdf->SetFillColor(67, 97, 238); // Cor azul #4361ee
$pdf->SetTextColor(255);
$pdf->SetFont('Arial', 'B', 9);

for($i=0; $i<count($header); $i++) {
    $pdf->Cell($w[$i], 7, $pdf->txt($header[$i]), 1, 0, 'C', true);
}
$pdf->Ln();

// Listagem dos Dados
$pdf->SetTextColor(0);
$pdf->SetFont('Arial', '', 8);
$count = 1;

foreach ($results as $row) {
    $pdf->Cell($w[0], 6, $count++, 1, 0, 'C');
    $pdf->Cell($w[1], 6, date("d/m/Y", strtotime($row['date_updated'])), 1, 0, 'C');
    $pdf->Cell($w[2], 6, $pdf->txt(substr($row['user_nome'], 0, 25)), 1, 0, 'L');
    $pdf->Cell($w[3], 6, $pdf->txt(substr($row['categories'], 0, 20)), 1, 0, 'L');
    $pdf->Cell($w[4], 6, $pdf->txt(substr($row['cliente'], 0, 28)), 1, 0, 'L');
    $pdf->Cell($w[5], 6, $pdf->txt(substr($row['remarks'], 0, 55)), 1, 0, 'L');
    $pdf->Cell($w[6], 6, 'R$ ' . number_format($row['amount'], 2, ',', '.'), 1, 0, 'R');
    $pdf->Ln();
}

// Linha de Totalizador
$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(array_sum(array_slice($w, 0, 6)), 8, 'TOTAL GERAL: ', 1, 0, 'R');
$pdf->Cell($w[6], 8, 'R$ ' . number_format($total, 2, ',', '.'), 1, 1, 'R');

// Saída para o navegador
$pdf->Output('I', 'Relatorio_Financeiro_KM2.pdf');
exit;