<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
// include_once("../all/permissoes.php"); // Descomente se houver permissões específicas

$pdo = ConnectionN3();
if (!$pdo) {
    // Se a requisição for AJAX, retorna um erro JSON
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Erro de conexão com o banco de dados.']);
        exit;
    }
    // Senão, redireciona com mensagem de erro
    $_SESSION['mensagem_erro'] = 'Erro: Falha na conexão com o banco de dados.';
    header("Location: contas_pagar.php");
    exit;
}

$action = $_POST['action'] ?? null;

// --- AÇÃO 1: SALVAR O CONJUNTO DE ANEXOS (VEM DO SUBMIT DO MODAL) ---
if ($action === 'salvar_anexos') {
    $contaId = filter_input(INPUT_POST, 'conta_id', FILTER_VALIDATE_INT);
    $tipoConta = filter_input(INPUT_POST, 'tipo_conta', FILTER_SANITIZE_STRING);
    $anexosJson = $_POST['anexos_json'] ?? '[]';
    
    $redirectPage = ($tipoConta === 'pagar') ? 'contas_pagar.php' : 'contas_receber.php';

    if (!$contaId || !in_array($tipoConta, ['pagar', 'receber'])) {
        $_SESSION['mensagem_erro'] = 'Erro: Dados inválidos para salvar anexos.';
        header("Location: " . $redirectPage);
        exit;
    }

    json_decode($anexosJson);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $anexosJson = '[]';
    }

    $tabela = ($tipoConta === 'pagar') ? 'contas_pagar' : 'contas_receber';

    try {
        $sql = "UPDATE `$tabela` SET anexos = :anexos WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':anexos' => $anexosJson, ':id' => $contaId]);
        $_SESSION['mensagem_sucesso'] = 'Anexos atualizados com sucesso!';
    } catch (PDOException $e) {
        $_SESSION['mensagem_erro'] = 'Erro ao salvar anexos: ' . $e->getMessage();
    }

    header("Location: " . $redirectPage);
    exit;
}


// --- AÇÃO 2: EXCLUIR UM ANEXO INDIVIDUAL (VEM DE UMA CHAMADA AJAX) ---
if ($action === 'excluir_anexo') {
    header('Content-Type: application/json');

    $contaId = filter_input(INPUT_POST, 'conta_id', FILTER_VALIDATE_INT);
    $tipoConta = filter_input(INPUT_POST, 'tipo_conta', FILTER_SANITIZE_STRING);
    $nomeArquivo = $_POST['nome_arquivo'] ?? null;

    if (!$contaId || !$tipoConta || !$nomeArquivo) {
        echo json_encode(['success' => false, 'message' => 'Dados insuficientes para exclusão.']);
        exit;
    }
    
    $tabela = ($tipoConta === 'pagar') ? 'contas_pagar' : 'contas_receber';

    try {
        // 1. Pega o JSON atual do banco
        $stmt = $pdo->prepare("SELECT anexos FROM `$tabela` WHERE id = ?");
        $stmt->execute([$contaId]);
        $anexosJson = $stmt->fetchColumn();
        
        $anexos = json_decode($anexosJson, true);
        $novoAnexos = [];
        $urlArquivoParaExcluir = null;

        if (is_array($anexos)) {
            // 2. Cria um novo array sem o arquivo que será excluído
            foreach ($anexos as $anexo) {
                if ($anexo['nome'] === $nomeArquivo) {
                    $urlArquivoParaExcluir = $anexo['url'];
                } else {
                    $novoAnexos[] = $anexo;
                }
            }
        }
        
        // 3. Atualiza o banco de dados com o novo JSON
        $novoAnexosJson = json_encode($novoAnexos);
        $updateStmt = $pdo->prepare("UPDATE `$tabela` SET anexos = ? WHERE id = ?");
        $updateStmt->execute([$novoAnexosJson, $contaId]);

        // 4. Exclui o arquivo físico do servidor
        if ($urlArquivoParaExcluir) {
            // Converte a URL para um caminho de arquivo no servidor
            $caminhoRelativo = parse_url($urlArquivoParaExcluir, PHP_URL_PATH);
            // IMPORTANTE: Ajuste o '/n3ti' se o caminho no seu servidor for diferente
            $caminhoFisico = $_SERVER['DOCUMENT_ROOT'] . str_replace('/n3ti', '', $caminhoRelativo); 

            if (file_exists($caminhoFisico)) {
                unlink($caminhoFisico);
            }
        }
        
        echo json_encode(['success' => true, 'message' => 'Anexo excluído com sucesso.']);

    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erro de banco de dados: ' . $e->getMessage()]);
    }
    exit;
}

// Se nenhuma ação válida for encontrada
header("Location: index.php");
exit;