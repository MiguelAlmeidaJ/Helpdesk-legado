<?php
// Arquivo: auxPDF.php (Versão Corrigida para a nova estrutura de dados)

// Verifica se a requisição é do tipo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Se alguém tentar acessar o script diretamente pelo navegador (GET)
    header("HTTP/1.1 405 Method Not Allowed");
    echo "Erro: Este script só pode ser acessado via POST.";
    exit;
}

// Aumenta o tempo máximo de execução, pois o script Python pode demorar
set_time_limit(300); 

// --- INÍCIO DA CORREÇÃO ---

// Recebe os dados do formulário AJAX
$clientes_data = $_POST['clientes'] ?? [];
$data_inicio = $_POST['data_inicio'] ?? '';
$data_fim = $_POST['data_fim'] ?? '';

// Validação inicial dos dados recebidos
if (empty($clientes_data) || empty($data_inicio) || empty($data_fim)) {
    http_response_code(400); // Bad Request
    echo "Erro: Parâmetros ausentes. Todos os campos são obrigatórios.";
    exit;
}

// Processa o array de clientes para separar IDs e Nomes
$cliente_ids = [];
$nomes_clientes = [];
foreach ($clientes_data as $cliente) {
    if (isset($cliente['id']) && isset($cliente['nome'])) {
        $cliente_ids[] = $cliente['id'];
        $nomes_clientes[] = $cliente['nome'];
    }
}

// Se, após o processamento, as listas estiverem vazias, há um erro de formato
if (empty($cliente_ids)) {
     http_response_code(400); // Bad Request
     echo "Erro: Formato de dados do cliente inválido.";
     exit;
}

// --- FIM DA CORREÇÃO ---

// Transforma os arrays em strings para a linha de comando
$ids_string = implode(',', $cliente_ids);
// MUDANÇA: Usar um separador que não seja comum em nomes de clientes, como ':::'
$nomes_string = implode(':::', $nomes_clientes); 

// ATENÇÃO: Verifique se este é o caminho completo para o seu executável do Python NO SERVIDOR
// $caminho_python = "C:\Python313\python.exe"; // Ajuste para a sua versão e ambiente
$caminho_python = "C:\Users\Administrador\AppData\Local\Programs\Python\Python312\python.exe";

// Define o caminho para o script Python
$script_python = __DIR__ . DIRECTORY_SEPARATOR . "gerador_PDF.py";

// Monta o comando para executar o script Python de forma segura
$comando = '"' . $caminho_python . '" "' . $script_python . '" ' .
           escapeshellarg($ids_string) . ' ' .
           escapeshellarg($nomes_string) . ' ' .
           escapeshellarg($data_inicio) . ' ' .
           escapeshellarg($data_fim);

// Executa o comando e captura toda a saída (prints e erros)
// O "2>&1" no final é crucial para capturar mensagens de erro do Python
$output = shell_exec($comando . " 2>&1");

// Retorna a saída do script Python para o JavaScript (idealmente em formato JSON)
header('Content-Type: application/json');

if ($output === null) {
    // Erro na execução do shell_exec
    echo json_encode(['success' => false, 'message' => 'Erro ao executar o comando no servidor. Verifique as permissões.']);
} else {
    // Sucesso na execução, retorna a saída do script Python
    echo json_encode(['success' => true, 'output' => htmlspecialchars($output)]);
}
