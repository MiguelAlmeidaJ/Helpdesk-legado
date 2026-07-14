<?php
session_start();
ob_start();
include_once("../../all/seguranca.php");
include_once("../../all/conect.php");
include_once("../../all/permissoes.php");

if ($m8_00 == 0) {
    header("Location: ../../home.php");
    exit;
}

require_once(__DIR__ . '/../../dependences/fpdf/fpdf.php');

function pdf_text($value)
{
    $text = html_entity_decode(strip_tags((string)$value), ENT_QUOTES, 'UTF-8');
    $converted = @iconv('UTF-8', 'windows-1252//TRANSLIT', $text);
    return $converted !== false ? $converted : $text;
}

$pdo = connectionN3();

$stmt = $pdo->prepare("
    SELECT
        usuarios.user_nome,
        atendimentos.id AS tarefa_id,
        clientes.clt_nomef AS nome_cliente,
        IFNULL(espera_counts.qtde_espera, 0) AS qtde_espera,
        (SELECT espera_causa FROM espera
            WHERE espera_atd = atendimentos.id
            ORDER BY espera_start DESC LIMIT 1) AS ultima_causa,
        (SELECT espera_desc FROM espera
            WHERE espera_atd = atendimentos.id
            ORDER BY espera_start DESC LIMIT 1) AS ultima_desc
    FROM usuarios
    INNER JOIN atendimentos ON usuarios.user_id = atendimentos.tecnico
    INNER JOIN clientes ON atendimentos.cliente = clientes.clt_id
    LEFT JOIN (
        SELECT espera_atd, COUNT(*) AS qtde_espera
        FROM espera
        GROUP BY espera_atd
    ) AS espera_counts ON atendimentos.id = espera_counts.espera_atd
    WHERE atendimentos.status = 3
      AND usuarios.user_sts = 1
    ORDER BY ultima_causa ASC, usuarios.user_nome ASC, atendimentos.id ASC
");
$stmt->execute();
$atendimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

class EsperaPDF extends FPDF
{
    public function Header()
    {
        $this->SetFont('Arial', 'B', 14);
        $this->Cell(0, 8, pdf_text('Relatorio de atendimentos em espera'), 0, 1, 'L');
        $this->SetFont('Arial', '', 9);
        $this->Cell(0, 6, pdf_text('Gerado em ' . date('d/m/Y H:i')), 0, 1, 'L');
        $this->Ln(2);
    }

    public function Footer()
    {
        $this->SetY(-12);
        $this->SetFont('Arial', '', 8);
        $this->Cell(0, 8, pdf_text('Pagina ') . $this->PageNo(), 0, 0, 'R');
    }
}

if (ob_get_length()) {
    ob_end_clean();
}

$pdf = new EsperaPDF('L', 'mm', 'A4');
$pdf->SetAutoPageBreak(true, 14);
$pdf->AddPage();
$pdf->SetMargins(10, 10, 10);

$pdf->SetFont('Arial', 'B', 10);
$pdf->Cell(0, 7, pdf_text('Total em espera: ' . count($atendimentos)), 0, 1, 'L');
$pdf->Ln(1);

if (empty($atendimentos)) {
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(0, 8, pdf_text('Nenhum atendimento em espera no momento.'), 0, 1, 'L');
} else {
    $grupoAtual = null;

    foreach ($atendimentos as $item) {
        $grupo = trim((string)($item['ultima_causa'] ?? ''));
        $grupo = $grupo !== '' ? $grupo : 'Sem motivo';

        if ($grupo !== $grupoAtual) {
            $grupoAtual = $grupo;
            $pdf->Ln(2);
            $pdf->SetFillColor(243, 244, 246);
            $pdf->SetTextColor(17, 24, 39);
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->Cell(0, 8, pdf_text($grupoAtual), 0, 1, 'L', true);
        }

        $descricao = trim((string)($item['ultima_desc'] ?? ''));
        $descricao = $descricao !== '' ? $descricao : 'Sem descricao informada.';

        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(25, 6, pdf_text('Atd: ' . $item['tarefa_id']), 0, 0, 'L');
        $pdf->Cell(75, 6, pdf_text('Tecnico: ' . $item['user_nome']), 0, 0, 'L');
        $pdf->Cell(35, 6, pdf_text('Espera: ' . (int)$item['qtde_espera'] . 'x'), 0, 0, 'L');
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(0, 6, pdf_text('Cliente: ' . ($item['nome_cliente'] ?? 'Nao informado')), 0, 1, 'L');

        $pdf->SetFont('Arial', '', 9);
        $pdf->MultiCell(0, 5, pdf_text('Ultima descricao: ' . $descricao), 0, 'L');
        $pdf->Ln(1);
    }
}

$filename = 'relatorio_atendimentos_em_espera_' . date('Ymd_His') . '.pdf';
$pdf->Output('D', $filename);
exit;
