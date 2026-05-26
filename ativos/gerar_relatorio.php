<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../ativos/ativos_conect.php");
require('../dependences/fpdf/fpdf.php'); // Inclui o FPDF

$pdoAtivos = ConnectionPluginsApp();
$source = isset($_GET['source']) ? $_GET['source'] : null;

// Caso o source seja 'ativos_programas', realiza a busca na tabela programas_instalados
if ($source === 'ativos_programas') {
    
    $empresa = isset($_GET['empresa']) ? $_GET['empresa'] : '';
    $nome_programa = isset($_GET['nome_programa']) ? $_GET['nome_programa'] : '';

    // Verifica se os parâmetros obrigatórios estão disponíveis
    if ( empty($nome_programa)) {
        die("Digitar um Programa' é obrigatório para esta operação.");
    }

    // Realiza a busca de programas_instalados relacionados aos ativos
    $sql = "
        SELECT 
            ativos.id AS id_ativo,
            ativos.empresa,
            ativos.nome_computador,
            programas_instalados.nome_programa,
            programas_instalados.versao_programa
        FROM 
            programas_instalados
        INNER JOIN 
            ativos ON programas_instalados.id_ativo = ativos.id
        WHERE 
            ativos.empresa LIKE :empresa 
            AND programas_instalados.nome_programa LIKE :nome_programa
        ORDER BY 
            ativos.id, programas_instalados.nome_programa
    ";

    $stmt = $pdoAtivos->prepare($sql);
    $stmt->bindValue(':empresa', '%' . $empresa . '%', PDO::PARAM_STR);
    $stmt->bindValue(':nome_programa', '%' . $nome_programa . '%', PDO::PARAM_STR);
    $stmt->execute();

    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($resultados)) {
        die("Nenhum dado encontrado para a empresa '{$empresa}' e programa '{$nome_programa}'.");
    }

    // Define o nome do arquivo CSV para download
    $nomeArquivo = "Relatorio_Programas_" . date('Y-m-d') . ".csv";

    // Define os headers para que o navegador entenda que é um arquivo para download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=' . $nomeArquivo);

    // Abre o output para escrever os dados
    $output = fopen('php://output', 'w');

    // Adiciona o marcador BOM para garantir compatibilidade UTF-8 com o Excel
fwrite($output, "\xEF\xBB\xBF");

    // Escreve os cabeçalhos
    $headers = ['ID Ativo', 'Empresa', 'Nome Computador', 'Nome Programa', 'Versão Programa'];
    fputcsv($output, $headers, ';');

    // Escreve os dados
    foreach ($resultados as $resultado) {
        $row = [
            $resultado['id_ativo'],
            $resultado['empresa'],
            $resultado['nome_computador'],
            $resultado['nome_programa'],
            $resultado['versao_programa']
        ];
        fputcsv($output, $row, ';');
    }

    fclose($output);
    exit;
}

// Captura os filtros enviados pela URL
$formato = isset($_GET['formato']) ? $_GET['formato'] : 'csv'; // Valor padrão 'csv'
error_log("Valor do formato: " . $formato);

// Verifica se o formato é válido
if ($formato !== 'csv' && $formato !== 'excel' && $formato !== 'pdf') {
    die("Formato de relatório não suportado.");
}

$empresa = isset($_GET['empresa']) ? $_GET['empresa'] : '';
$nomeComputador = isset($_GET['nome_computador']) ? $_GET['nome_computador'] : '';
$enderecoMac = isset($_GET['endereco_mac']) ? $_GET['endereco_mac'] : '';

// Cria a query SQL com base nos filtros
$sql = "SELECT * FROM ativos WHERE 1=1";

if (!empty($empresa)) {
    $sql .= " AND empresa LIKE :empresa";
}
if (!empty($nomeComputador)) {
    $sql .= " AND nome_computador LIKE :nome_computador";
}
if (!empty($enderecoMac)) {
    $sql .= " AND endereco_mac LIKE :endereco_mac";
}

// Prepara a consulta
$stmt = $pdoAtivos->prepare($sql);

// Associa os parâmetros na query
if (!empty($empresa)) {
    $stmt->bindValue(':empresa', '%' . $empresa . '%');
}
if (!empty($nomeComputador)) {
    $stmt->bindValue(':nome_computador', '%' . $nomeComputador . '%');
}
if (!empty($enderecoMac)) {
    $stmt->bindValue(':endereco_mac', '%' . $enderecoMac . '%');
}

// Executa a consulta
$stmt->execute();
$ativos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Verifica se há dados
if (empty($ativos)) {
    die("Nenhum ativo encontrado com os filtros aplicados.");
}

// Define o nome do arquivo CSV para download
$nomeArquivo = "Relatorio_Ativos_" . date('Y-m-d') . ".csv";

// Define os headers para que o navegador entenda que é um arquivo para download
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=' . $nomeArquivo);

// Abre o output para escrever os dados
$output = fopen('php://output', 'w');

// Adiciona o marcador BOM para garantir compatibilidade UTF-8 com o Excel
fwrite($output, "\xEF\xBB\xBF");

// Escreve os cabeçalhos, baseando-se nos campos esperados
$headers = [
    'id', 'hora_da_coleta', 'empresa', 'nome_computador', 'sistema_operacional', 
    'versao_sistema', 'arquitetura', 'processador', 'nucleos_fisicos', 'threads', 
    'frequencia_max_cpu', 'frequencia_max_memoria', 'placa_de_video', 
    'porcentagem_da_bateria', 'alimentacao_da_bateria', 'armazenamento_disco_total', 
    'armazenamento_disco_uso', 'armazenamento_disco_livre', 
    'armazenamento_porcentagem_uso', 'tipo_de_armazenamento', 
    'memoria_ram_total', 'memoria_ram_em_uso', 'memoria_ram_disponivel', 
    'percentual_uso_memoria', 'fabricante_placa_mae', 'nome_placa_mae', 
    'versao_placa_mae', 'numero_serie_placa_mae', 'endereco_mac', 
    'endereco_ip', 'firewall_dominio', 'firewall_publico', 
    'firewall_privado', 'rede_detalhada', 'observacoes', 'data_insercao'
];

// Lógica para formato PDF
if ($formato === 'pdf') {
    // Cria o objeto PDF
    $pdf = new FPDF('L', 'mm', 'A4'); // 'L' para paisagem
    $pdf->AddPage();

    // Define o cabeçalho
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetFillColor(200, 200, 200); // Cor cinza claro para cabeçalho

    // Define as larguras das colunas
    $colWidths = [
        10,  // id
        15,  // hora_da_coleta
        25,  // empresa
        25,  // nome_computador
        25,  // sistema_operacional
        25,  // versao_sistema
        15,  // arquitetura
        25,  // processador
        20,  // nucleos_fisicos
        15,  // threads
        20,  // frequencia_max_cpu
        20,  // frequencia_max_memoria
        25,  // placa_de_video
        20,  // porcentagem_da_bateria
        25,  // alimentacao_da_bateria
        25,  // armazenamento_disco_total
        25,  // armazenamento_disco_uso
        25,  // armazenamento_disco_livre
        25,  // armazenamento_porcentagem_uso
        25,  // tipo_de_armazenamento
        25,  // memoria_ram_total
        25,  // memoria_ram_em_uso
        25,  // memoria_ram_disponivel
        25,  // percentual_uso_memoria
        25,  // fabricante_placa_mae
        25,  // nome_placa_mae
        25,  // versao_placa_mae
        25,  // numero_serie_placa_mae
        25,  // endereco_mac
        25,  // endereco_ip
        20,  // firewall_dominio
        20,  // firewall_publico
        20,  // firewall_privado
        40,  // rede_detalhada
        25,  // observacoes
        25   // data_insercao
    ];

    // Desenha o cabeçalho
    // foreach ($headers as $header) {
    //     $pdf->Cell(25, 10, $header, 1, 0, 'C', true); // Cabeçalho com fundo cinza
    // }
    // $pdf->Ln();

    // Desenha o cabeçalho
    foreach ($headers as $index => $header) {
        $pdf->Cell($colWidths[$index], 9, $header, 1, 0, 'C', true); // Cabeçalho com fundo cinza
    }
    $pdf->Ln();

    // Preenche o PDF com os dados dos ativos, alternando as cores das linhas
    $pdf->SetFont('Arial', '', 7);
    $fill = false; // Variável para alternar a cor de fundo

    foreach ($ativos as $ativo) {
        // Alterna a cor de fundo a cada linha
        $pdf->SetFillColor($fill ? 230 : 255); // Cinza claro ou branco
        
        // Verifica o tamanho máximo de texto para garantir consistência
        foreach ($headers as $header) {
            $value = isset($ativo[$header]) ? $ativo[$header] : '';
            // Limita o tamanho do texto para evitar células muito altas
            $value = (strlen($value) > 20) ? substr($value, 0, 17) . '...' : $value; // Ajuste conforme necessário
            $pdf->Cell(25, 10, $value, 1, 0, 'L', $fill);
        }
        
        $pdf->Ln(); // Move para a próxima linha
        $fill = !$fill; // Alterna a cor de fundo
    }

    // Saída do PDF para download
    $pdf->Output('D', 'Relatorio_Ativos_' . date('Y-m-d') . '.pdf');
    exit;
}

 else {


// Escreve os cabeçalhos no CSV
fputcsv($output, $headers, ';');

// Escreve os dados dos ativos no CSV
foreach ($ativos as $ativo) {
    // Cria uma linha com os valores em sequência, respeitando a ordem dos cabeçalhos
    $row = [];

    foreach ($headers as $header) {
        // Adiciona o valor correspondente ao cabeçalho na linha
        $row[] = isset($ativo[$header]) ? $ativo[$header] : ''; // Se não existir, adiciona uma string vazia
    }

    // Escreve a linha no CSV
    fputcsv($output, $row,';');
}

// Fecha o arquivo CSV
fclose($output);
exit;
}
?>
