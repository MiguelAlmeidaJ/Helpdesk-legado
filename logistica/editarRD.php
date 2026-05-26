<?php
// ARQUIVO ATUALIZADO NOVO FINANCEIRO

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");

if ($_SERVER["REQUEST_METHOD"] != "POST") {
    header("Location: rd.php");
    exit;
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id_despesa = intval($_POST['id']);
    $user_id = intval($_POST['user_id']);
    $amount = floatval($_POST['amount']);
    $category_id = intval($_POST['category_id']);
    $pix_type = $_POST['pix_type'] ?? '';
    $pix = !empty($_POST['pix']) ? $_POST['pix'] : ($_POST['chavepix_default'] ?? '');
    $cliente_id = $_POST['cliente_id'] ?? '';
    $remarks = $_POST['remarks'] ?? '';
    $anexos_novos_json = !empty($_POST['anexos_novos_json']) ? $_POST['anexos_novos_json'] : null;
}


$id_despesa = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id_despesa) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Ocorreu um erro ao localizar a despesa.'];
    header("Location: rd.php");
    exit;
}

$pdo = ConnectionN3();

try {
    // ======================================================================
    // ## INÍCIO DA LÓGICA DE EXCLUSÃO DE ARQUIVOS ##
    // ======================================================================

    // 1. Busca a lista de anexos ANTIGOS, antes de qualquer alteração
    $stmt_antigos = $pdo->prepare("SELECT anexos FROM running_balance WHERE id = :id");
    $stmt_antigos->execute([':id' => $id_despesa]);
    $resultado = $stmt_antigos->fetch(PDO::FETCH_ASSOC);
    $anexos_antigos = $resultado ? json_decode($resultado['anexos'], true) : [];
    if (!is_array($anexos_antigos)) $anexos_antigos = [];

    // 2. Cria uma lista simples com as URLs dos anexos que o usuário quer MANTER
    $urls_para_manter = [];
    if (isset($_POST['anexos_existentes']) && is_array($_POST['anexos_existentes'])) {
        foreach ($_POST['anexos_existentes'] as $anexo_json) {
            $anexo = json_decode($anexo_json, true);
            if ($anexo && isset($anexo['url'])) {
                $urls_para_manter[] = $anexo['url'];
            }
        }
    }

    // 3. Compara a lista antiga com a nova e apaga os arquivos desmarcados
    if (!empty($anexos_antigos)) {
        foreach ($anexos_antigos as $anexo_antigo) {
            // Se a URL antiga NÃO ESTÁ na lista de URLs para manter, o arquivo deve ser excluído
            if (isset($anexo_antigo['url']) && !in_array($anexo_antigo['url'], $urls_para_manter)) {

                // Converte a URL (http://...) em um caminho físico no servidor (C:/xampp/...)
                $caminho_arquivo_fisico = $_SERVER['DOCUMENT_ROOT'] . parse_url($anexo_antigo['url'], PHP_URL_PATH);

                // Verifica se o arquivo existe e o apaga
                if (file_exists($caminho_arquivo_fisico)) {
                    unlink($caminho_arquivo_fisico);
                }
            }
        }
    }

    // ======================================================================
    // ## FIM DA LÓGICA DE EXCLUSÃO ##
    // ======================================================================

    // 4. Monta a lista final de anexos para salvar no banco de dados
    $anexos_finais = [];
    foreach ($urls_para_manter as $url) {
        foreach ($anexos_antigos as $anexo_antigo) {
            if (isset($anexo_antigo['url']) && $anexo_antigo['url'] === $url) {
                $anexos_finais[] = $anexo_antigo;
                break;
            }
        }
    }

    if (!empty($_POST['anexos_novos_json'])) {
        $anexos_novos = json_decode($_POST['anexos_novos_json'], true);
        if (is_array($anexos_novos)) {
            $anexos_finais = array_merge($anexos_finais, $anexos_novos);
        }
    }
    $anexos_finais_json = !empty($anexos_finais) ? json_encode($anexos_finais) : null;


    $cliente_nome = null;
    if (!empty($cliente_id)) {
        $sql_busca_cliente = "SELECT clt_nomef as nome FROM clientes WHERE clt_id = ?";
        $stmt_busca = $pdo->prepare($sql_busca_cliente);
        $stmt_busca->execute([$cliente_id]);
        $cliente = $stmt_busca->fetch(PDO::FETCH_ASSOC);
        if ($cliente) {
            $cliente_nome = $cliente['nome'];
        }
    }

    //data de hoje
    $data_hoje = date('Y-m-d H:i:s');

    // 5. Atualiza o banco de dados com os outros dados e a lista final de anexos
    $sql = "UPDATE running_balance SET
                amount = :amount, category_id = :category_id, pix_type = :pix_type,
                pix = :pix, clt_id = :cliente_id, cliente = :cliente, remarks = :remarks, date_updated = :data_hoje, anexos = :anexos
            WHERE id = :id_despesa AND status = 1";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':amount' => $_POST['amount'],
        ':category_id' => $_POST['category_id'],
        ':pix_type' => $_POST['pix_type'],
        ':pix' => $_POST['pix'],
        ':cliente_id' => $_POST['cliente_id'],    
        ':cliente' => $cliente_nome,
        ':remarks' => $_POST['remarks'],
        ':data_hoje' => $data_hoje,
        ':anexos' => $anexos_finais_json,
        ':id_despesa' => $id_despesa
    ]);

    $_SESSION['alert_message'] = ['type' => 'success', 'text' => 'Despesa atualizada com sucesso!'];
} catch (PDOException $e) {
    // Em caso de erro, pode ser útil logar o erro: error_log($e->getMessage());
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Ocorreu um erro ao atualizar a despesa.'];
}

header("Location: rd.php");
exit;
