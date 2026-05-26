<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// Validações iniciais
if ($m9_00 == 0) {
    header("Location: ../home.php");
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id'])) {
    header("Location: rd.php");
    exit;
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'ID da despesa inválido.'];
    header('Location: rd.php');
    exit;
}

$pdo = ConnectionN3();
if (!$pdo) {
    $_SESSION['alert_message'] = ['type' => 'danger', 'text' => 'Erro de conexão com o banco de dados.'];
    header('Location: rd.php');
    exit;
}

try {
    // 1. ANTES DE DELETAR: Busca o registro no banco para pegar a lista de anexos
    $stmt_select = $pdo->prepare("SELECT anexos FROM running_balance WHERE id = :id");
    $stmt_select->execute([':id' => $id]);
    $despesa = $stmt_select->fetch(PDO::FETCH_ASSOC);

    // 2. APAGA OS ARQUIVOS FÍSICOS DO SERVIDOR
    if ($despesa && !empty($despesa['anexos'])) {
        $anexos = json_decode($despesa['anexos'], true);
        if (is_array($anexos)) {
            foreach ($anexos as $anexo) {
                if (isset($anexo['url'])) {
                    // Converte a URL (http://...) em um caminho físico no servidor (C:/xampp/...)
                    $caminho_arquivo = $_SERVER['DOCUMENT_ROOT'] . parse_url($anexo['url'], PHP_URL_PATH);
                    
                    // Se o arquivo existir, apaga
                    if (file_exists($caminho_arquivo)) {
                        unlink($caminho_arquivo);
                    }
                }
            }
        }
    }

    // 3. AGORA SIM, DELETA O REGISTRO DO BANCO DE DADOS
    $stmt_delete = $pdo->prepare("DELETE FROM running_balance WHERE id = :id");
    $stmt_delete->execute([':id' => $id]);

    if ($stmt_delete->rowCount() > 0) {
        $_SESSION['alert_message'] = [
            'type' => 'success',
            'text' => 'Despesa e seus anexos foram excluídos com sucesso!'
        ];
    } else {
        $_SESSION['alert_message'] = [
            'type' => 'warning',
            'text' => 'Nenhuma despesa foi encontrada com este ID.'
        ];
    }

} catch (PDOException $e) {
    $_SESSION['alert_message'] = [
        'type' => 'danger',
        'text' => 'Ocorreu um erro no banco de dados ao tentar excluir a despesa.'
    ];
}

header('Location: rd.php');
exit;
?>