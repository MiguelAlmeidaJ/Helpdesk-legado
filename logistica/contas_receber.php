<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// if ($m9_02 < 1) { header("Location: ../home.php"); exit; }

//status= 
// 1 = 'A vencer', 
// 2 = 'Parcialmente Recebido', 
// 3 = 'Recebido', 
// 4 = 'vencido', 
// 5 = 'Inadiplente',



$pdo = ConnectionN3();
$mensagem = '';
$action = $_POST['action'] ?? $_GET['action'] ?? '';


// --- AÇÃO PARA BUSCAR HISTÓRICO DE RECEBIMENTOS (AJAX) ---
if ($action === 'get_recebimentos' && isset($_POST['id_conta'])) {
    header('Content-Type: application/json');
    $idConta = (int)$_POST['id_conta'];

    // Busca todos os recebimentos dessa conta, juntando o nome da agência
    $sql = "SELECT 
            r.id as id_recebimento,
            r.valor_recebido, 
            r.data_recebimento, 
            r.observacao, 
            a.ag_nome 
        FROM recebimentos r
        LEFT JOIN agenciasbancarias a ON r.id_agBancaria = a.id
        WHERE r.id_conta_receber = ?
        ORDER BY r.data_recebimento ASC";


    $stmt = $pdo->prepare($sql);
    $stmt->execute([$idConta]);
    $recebimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $recebimentos]);
    exit; // Termina o script aqui para não enviar o HTML
}

// --- EDITAR RECEBIMENTO DE CONTA ---
if ($action === 'editar_recebimento') {
    $id = (int)$_POST['id_recebimento'];
    $valor = floatval($_POST['valor']);
    $agencia = $_POST['agencia'];
    $obs = $_POST['observacao'];

    $sql = "UPDATE recebimentos SET valor_recebido=?, observacao=?, id_agBancaria=(SELECT id FROM agenciasbancarias WHERE ag_nome=?) WHERE id=?";
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([$valor, $obs, $agencia, $id]);

    echo json_encode(['success' => $success]);
    exit;
}

// --- EXCLUIR RECEBIMENTO DE CONTA ---
if ($action === 'excluir_recebimento') {
    try {
        $pdo->beginTransaction();

        $id_recebimento = (int)$_POST['id_recebimento'];

        // Buscar o id da conta vinculada
        $stmt = $pdo->prepare("SELECT id_conta FROM recebimentos WHERE id = ?");
        $stmt->execute([$id_recebimento]);
        $id_conta = $stmt->fetchColumn();
        if (!$id_conta) throw new Exception('Conta não encontrada para o recebimento.');

        // Excluir o recebimento
        $stmt = $pdo->prepare("DELETE FROM recebimentos WHERE id = ?");
        $stmt->execute([$id_recebimento]);

        // Buscar dados da conta
        $stmt = $pdo->prepare("SELECT valor_total, data_vencimento FROM contas_receber WHERE id = ?");
        $stmt->execute([$id_conta]);
        $conta = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$conta) throw new Exception('Conta não encontrada na tabela contas_receber.');

        $valor_total = (float)$conta['valor_total'];
        $data_vencimento = $conta['data_vencimento'];
        $hoje = date('Y-m-d');

        // Somar recebimentos restantes
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(valor_recebido), 0) FROM recebimentos WHERE id_conta = ?");
        $stmt->execute([$id_conta]);
        $total_recebido = (float)$stmt->fetchColumn();

        $saldo = $valor_total - $total_recebido;

        // Determinar o novo status_id direto
        $mesVencimento = (int)date('m', strtotime($data_vencimento));
        $anoVencimento = (int)date('Y', strtotime($data_vencimento));
        $mesAtual = (int)date('m');
        $anoAtual = (int)date('Y');

        if ($total_recebido >= $valor_total) {
            $novo_status_id = 3; // Recebido
        } elseif ($total_recebido > 0 && $total_recebido < $valor_total) {
            $novo_status_id = 2; // Parcialmente Recebido
        } elseif ($total_recebido == 0 && (($anoVencimento < $anoAtual) || ($anoVencimento == $anoAtual && $mesVencimento < $mesAtual))) {
            $novo_status_id = 5; // Inadimplente
        } elseif ($total_recebido == 0 && $data_vencimento < $hoje) {
            $novo_status_id = 4; // Vencido
        } else {
            $novo_status_id = 1; // A vencer
        }

        // Atualizar conta
        $stmt = $pdo->prepare("UPDATE contas_receber SET saldo = ?, status_id = ? WHERE id = ?");
        $stmt->execute([$saldo, $novo_status_id, $id_conta]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'status_id' => $novo_status_id,
            'saldo' => $saldo,
            'id_conta' => $id_conta
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// --- ADICIONAR CONTA A RECEBER ---
if ($action === 'add_conta_receber' && $_SERVER['REQUEST_METHOD'] === 'POST') {



    if (empty($_POST['descricao']) || empty($_POST['valor_total']) || empty($_POST['data_vencimento']) || empty($_POST['id_cliente']) || empty($_POST['id_grupo']) || empty($_POST['id_subgrupo']) || empty($_POST['id_classificacao'])) {
        $_SESSION['mensagem_erro'] = 'Erro: Campos obrigatórios não foram preenchidos.';
        header("Location: contas_receber.php");
        exit;
    }

    $soma_percentual =
        (int)($_POST['percent_ti'] ?? 0) +
        (int)($_POST['percent_devops'] ?? 0) +
        (int)($_POST['percent_marketing'] ?? 0);

    if ($soma_percentual !== 100) {
        $_SESSION['mensagem_erro'] = 'Erro: A soma dos percentuais da divisão por setores deve ser exatamente 100%.';
        header("Location: contas_receber.php");
        exit;
    }

    $pdo->beginTransaction();
    try {
        // --- Parte 1: Captura de Dados (sem alterações) ---
        $id_cliente = $_POST['id_cliente'];
        $descricao = $_POST['descricao'];
        $valor_total = str_replace(',', '.', $_POST['valor_total']);
        $dataVencimento = $_POST['data_vencimento'];
        $unidadeNegocio = $_POST['unidade_negocio'];
        $id_grupo = $_POST['id_grupo'];
        $id_subgrupo = $_POST['id_subgrupo'];
        $id_classificacao = $_POST['id_classificacao'];
        $id_tipo_documento = empty($_POST['id_tipo_documento']) ? null : $_POST['id_tipo_documento'];
        $id_usuario_logado = $_SESSION['allterusN3Id'];
        $percent_ti = (int)($_POST['percent_ti'] ?? 0);
        $percent_devops = (int)($_POST['percent_devops'] ?? 0);
        $percent_mkt = (int)($_POST['percent_marketing'] ?? 0);

        // --- Parte 2: Inserir em contas_receber (sem alterações) ---
        $sql = "INSERT INTO contas_receber (id_cliente, descricao, valor_total, saldo, data_vencimento, unidade_negocio, id_grupo, id_subgrupo, id_classificacao, id_tipo_documento, id_usuario, status_id) 
                VALUES (:id_cliente, :descricao, :valor_total, :saldo, :data_vencimento, :unidade_negocio, :id_grupo, :id_subgrupo, :id_classificacao, :id_tipo_documento, :id_usuario, :status_id)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id_cliente' => $id_cliente, ':descricao' => $descricao, ':valor_total' => $valor_total, ':saldo' => $valor_total, ':data_vencimento' => $dataVencimento, ':unidade_negocio' => $unidadeNegocio, ':id_grupo' => $id_grupo, ':id_subgrupo' => $id_subgrupo, ':id_classificacao' => $id_classificacao, ':id_tipo_documento' => $id_tipo_documento, ':id_usuario' => $id_usuario_logado, ':status_id' => 1 // 1 = A vencer
        ]);
        $lastId = $pdo->lastInsertId(); // ID da conta que acabou de ser criada

        // --- Parte 3: Inserir em contas_receber_divisao (sem alterações) ---
        $sqlDivisao = "INSERT INTO contas_receber_divisao (id_conta_receber, percentual_ti, percentual_devops, percentual_marketing) VALUES (?, ?, ?, ?)";
        $stmtDivisao = $pdo->prepare($sqlDivisao);
        $stmtDivisao->execute([$lastId, $percent_ti, $percent_devops, $percent_mkt]);

        // --- Parte 4: Salvar a recorrência (LÓGICA CORRIGIDA E SIMPLIFICADA) ---
        if (isset($_POST['salvar_recorrencia']) && $_POST['salvar_recorrencia'] == '1') {

            // ## CORREÇÃO: Monta o array de parâmetros completo, incluindo o vínculo
            $paramsRecorrencia = [
                ':id_conta_origem' => $lastId, // Vínculo com a conta que acabou de ser criada
                ':tipo' => 'Receber',
                ':id_cliente' => $id_cliente,
                ':fornecedor_padrao' => null, // O campo existe na tabela, então precisa ser passado como nulo
                ':descricao_padrao' => $descricao,
                ':valor_padrao' => $valor_total,
                ':dia_vencimento' => date('d', strtotime($dataVencimento)),
                ':id_usuario' => $id_usuario_logado,
                ':ativo' => 1,
                ':unidade_negocio_padrao' => $unidadeNegocio,
                ':id_grupo_padrao' => $id_grupo,
                ':id_subgrupo_padrao' => $id_subgrupo,
                ':id_classificacao_padrao' => $id_classificacao,
                ':id_tipo_documento' => $id_tipo_documento,
                ':percentual_ti_padrao' => $percent_ti,
                ':percentual_devops_padrao' => $percent_devops,
                ':percentual_marketing_padrao' => $percent_mkt
            ];

            // ## CORREÇÃO: Remove a validação desnecessária e sempre executa um INSERT ##
            $insertRecSql = "INSERT INTO recorrencias (
                id_conta_origem, tipo, id_cliente, fornecedor_padrao, descricao_padrao, valor_padrao, dia_vencimento, id_usuario, ativo, 
                unidade_negocio_padrao, id_grupo_padrao, id_subgrupo_padrao, id_classificacao_padrao, id_tipo_documento,
                percentual_ti_padrao, percentual_devops_padrao, percentual_marketing_padrao
            ) VALUES (
                :id_conta_origem, :tipo, :id_cliente, :fornecedor_padrao, :descricao_padrao, :valor_padrao, :dia_vencimento, :id_usuario, :ativo, 
                :unidade_negocio_padrao, :id_grupo_padrao, :id_subgrupo_padrao, :id_classificacao_padrao, :id_tipo_documento,
                :percentual_ti_padrao, :percentual_devops_padrao, :percentual_marketing_padrao
            )";
            $pdo->prepare($insertRecSql)->execute($paramsRecorrencia);
        }

        $pdo->commit();
        $_SESSION['mensagem_sucesso'] = 'Conta a receber lançada com sucesso!';
    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['mensagem_erro'] = 'Erro ao lançar conta: ' . $e->getMessage();
        // A linha abaixo é útil para debug, mas pode ser removida em produção
        // die("ERRO NO BANCO DE DADOS: " . $e->getMessage()); 
    }
    header("Location: contas_receber.php");
    exit;
}

// --- EDITAR CONTA A RECEBER ---
if ($action === 'edit_conta_receber' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    // (Seu bloco de validação if (empty(...)) continua aqui)
    if (empty($_POST['id']) || empty($_POST['descricao']) || empty($_POST['valor_total']) || empty($_POST['data_vencimento']) || empty($_POST['id_cliente']) || empty($_POST['id_grupo']) || empty($_POST['id_subgrupo'])) {
        $_SESSION['mensagem_erro'] = 'Erro: Campos obrigatórios não foram preenchidos na edição.';
        header("Location: contas_a_receber.php");
        exit;
    }

    $pdo->beginTransaction();
    try {


        $id_fatura = $_POST['id'];
        $id_cliente = $_POST['id_cliente'];
        $dataVencimento = $_POST['data_vencimento'];
        $descricao = $_POST['descricao'];
        $valor_total = str_replace(',', '.', $_POST['valor_total']);
        $unidadeNegocio = $_POST['unidade_negocio'];
        $id_grupo = $_POST['id_grupo'];
        $id_subgrupo = $_POST['id_subgrupo'];
        $id_classificacao = $_POST['id_classificacao'];
        $id_tipo_documento = empty($_POST['id_tipo_documento']) ? null : $_POST['id_tipo_documento'];
        $p_ti = $_POST['percent_ti'] ?? 0;
        $p_devops = $_POST['percent_devops'] ?? 0;
        $p_mkt = $_POST['percent_marketing'] ?? 0;
        $salvar_recorrencia = isset($_POST['salvar_recorrencia']);
        $id_usuario_logado = $_SESSION['allterusN3Id'];
        $id_conta_origem = $_POST['id'];

        // Recalcula o saldo, que pode ter mudado se o valor_total foi alterado
        $stmtRecebidos = $pdo->prepare("SELECT COALESCE(SUM(valor_recebido), 0) AS total_recebido FROM recebimentos WHERE id_conta_receber = ?");
        $stmtRecebidos->execute([$id_fatura]);
        $total_recebido = $stmtRecebidos->fetchColumn();

        $novo_saldo = $valor_total - $total_recebido;
        if ($novo_saldo < 0) $novo_saldo = 0;

        if ($total_recebido >= $valor_total) {
            $novo_status_id = 3; // Recebido
        } elseif ($total_recebido > 0 && $total_recebido < $valor_total) {
            $novo_status_id = 2; // Parcialmente Recebido
        } elseif ($total_recebido == 0 && (($anoVencimento < $anoAtual) || ($anoVencimento == $anoAtual && $mesVencimento < $mesAtual))) {
            $novo_status_id = 5; // Inadimplente
        } elseif ($total_recebido == 0 && $dataVencimento < $hoje) {
            $novo_status_id = 4; // Vencido
        } else {
            $novo_status_id = 1; // A vencer
        }

        // Atualizar conta
        $sql = "UPDATE contas_receber SET id_cliente=?, descricao=?, valor_total=?, saldo=?, status_id=?, data_vencimento=?, id_grupo=?, id_subgrupo=?, id_classificacao=?, id_tipo_documento=?, id_usuario=? WHERE id=?";
        $pdo->prepare($sql)->execute([$id_cliente, $descricao, $valor_total, $novo_saldo, $novo_status_id, $dataVencimento, $id_grupo, $id_subgrupo, $id_classificacao, $id_tipo_documento, $id_usuario_logado, $id_fatura]);


        $sqlDiv = "UPDATE contas_receber_divisao SET percentual_ti=?, percentual_devops=?, percentual_marketing=? WHERE id_conta_receber=?";
        $pdo->prepare($sqlDiv)->execute([$p_ti, $p_devops, $p_mkt, $id_fatura]);

        $stmtRec = $pdo->prepare("SELECT id FROM recorrencias WHERE id_conta_origem = ? AND tipo = 'Receber'");
        $stmtRec->execute([$id_fatura]);
        $recorrenciaExistente = $stmtRec->fetch(PDO::FETCH_ASSOC);

        $diaVencimento = date('d', strtotime($dataVencimento));

        if ($salvar_recorrencia) {

            if ($recorrenciaExistente) {
                // Se marcou e Já EXISTE, ATUALIZA
                $updateRecSql = "UPDATE recorrencias SET descricao_padrao = ?,id_cliente = ?, valor_padrao = ?, dia_vencimento = ? ,unidade_negocio_padrao = ?, id_grupo_padrao = ?,id_subgrupo_padrao = ?, id_classificacao_padrao = ?,  id_usuario = ?, id_tipo_documento = ?, ativo = 1, percentual_ti_padrao = ?, percentual_devops_padrao = ?, percentual_marketing_padrao = ? WHERE id = ?";
                $pdo->prepare($updateRecSql)->execute([
                    $descricao, $id_cliente, $valor_total, $diaVencimento,
                    $unidadeNegocio, $id_grupo, $id_subgrupo, $id_classificacao, $id_usuario_logado, $id_tipo_documento, $p_ti, $p_devops, $p_mkt, $recorrenciaExistente['id']
                ]);
            } else {
                // Se marcou e NºO EXISTE, CRIA
                $sqlInsRec = "INSERT INTO recorrencias (tipo, id_conta_origem, id_cliente, descricao_padrao, unidade_negocio_padrao, id_grupo_padrao, id_subgrupo_padrao, id_classificacao_padrao, id_tipo_documento, valor_padrao, dia_vencimento, id_usuario, percentual_ti_padrao, percentual_devops_padrao, percentual_marketing_padrao) VALUES ('Receber', ?, ?, ?, ?, ? , ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $pdo->prepare($sqlInsRec)->execute([$id_conta_origem, $id_cliente, $descricao, $unidadeNegocio, $id_grupo, $id_subgrupo, $id_classificacao, $id_tipo_documento, $valor_total, $diaVencimento, $id_usuario_logado, $p_ti, $p_devops, $p_mkt]);
            }
        } else {
            if ($recorrenciaExistente) {
                // Se DESMARCOU e EXISTE, APAGA
                $pdo->prepare("DELETE FROM recorrencias WHERE id = ? AND tipo = 'Receber")->execute([$recorrenciaExistente['id']]);
            }
        }

        $pdo->commit();
        $_SESSION['mensagem_sucesso'] = 'Fatura atualizada com sucesso!';
    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['mensagem_erro'] = 'Erro ao atualizar fatura: ' . $e->getMessage();
    }

    header("Location: contas_receber.php");
    exit;
}

// --- REGISTRAR RECEBIMENTO (PARCIAL OU TOTAL) ---
if ($action === 'registrar_recebimento' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    $idConta = filter_input(INPUT_POST, 'id_conta', FILTER_VALIDATE_INT);
    $dataRecebimento = $_POST['data_recebimento'] . ' 00:00:00';
    $valorRecebido = str_replace(',', '.', $_POST['valor_recebido']);
    $id_agBancaria = $_POST['id_agBancaria'];
    $obsRecebimento = $_POST['observacao_recebimento'];
    $id_usuario_logado = $_SESSION['allterusN3Id'];

    if ($idConta && $dataRecebimento && $valorRecebido > 0) {
        $pdo->beginTransaction();
        try {
            // 1. Insere o pagamento na tabela de recebimentos
            $sqlPag = "INSERT INTO recebimentos (id_conta_receber, valor_recebido,  data_recebimento, observacao, id_usuario, id_agBancaria) VALUES (?, ?, ?, ?, ?, ?)";
            $pdo->prepare($sqlPag)->execute([$idConta, $valorRecebido,  $dataRecebimento, $obsRecebimento, $id_usuario_logado, $id_agBancaria]);

            // 2. Busca o valor total da fatura e o novo total recebido
            $stmtTotal = $pdo->prepare("SELECT valor_total, (SELECT SUM(valor_recebido) FROM recebimentos WHERE id_conta_receber = ?) AS total_recebido FROM contas_receber WHERE id = ?");
            $stmtTotal->execute([$idConta, $idConta]);
            $valores = $stmtTotal->fetch();

            $total_recebido_atualizado = $valores['total_recebido'];
            $valor_total_fatura = $valores['valor_total'];

            // 3. CALCULA O NOVO SALDO (O QUE FALTA PAGAR)
            $novoSaldo = $valor_total_fatura - $total_recebido_atualizado;
            if ($novoSaldo < 0) {
                $novoSaldo = 0; // Evita saldo negativo
            }

            // 4. Decide o novo status da conta
            $hoje = date('Y-m-d');
            $mesVencimento = (int)date('m', strtotime($data_vencimento));
            $anoVencimento = (int)date('Y', strtotime($data_vencimento));
            $mesAtual = (int)date('m');
            $anoAtual = (int)date('Y');

            if ($total_recebido_atualizado >= $valor_total_fatura) {
                $novo_status_id = 3; // Recebido
                $novoSaldo = 0;
            } elseif ($total_recebido_atualizado > 0 && $total_recebido_atualizado < $valor_total_fatura) {
                $novo_status_id = 2; // Parcialmente Recebido
            } elseif ($total_recebido_atualizado == 0 && (($anoVencimento < $anoAtual) || ($anoVencimento == $anoAtual && $mesVencimento < $mesAtual))) {
                $novo_status_id = 5; // Inadimplente
            } elseif ($total_recebido_atualizado == 0 && $data_vencimento < $hoje) {
                $novo_status_id = 4; // Vencido
            } else {
                $novo_status_id = 1; // A vencer
            }

            // 5. ATUALIZA o status E o saldo da conta principal
            $stmtUpdate = $pdo->prepare("UPDATE contas_receber SET saldo = ?, status_id = ? WHERE id = ?");
            $stmtUpdate->execute([$novoSaldo, $novo_status_id, $idConta]);

            $pdo->commit();
            $_SESSION['mensagem_sucesso'] = 'Recebimento registrado com sucesso!';
        } catch (Exception $e) {
            $pdo->rollBack();
            die($e->getMessage());
            $_SESSION['mensagem_erro'] = 'Erro ao registrar recebimento: ' . $e->getMessage();
        }
    } else {
        $_SESSION['mensagem_erro'] = 'Dados inválidos para registrar recebimento.';
    }
    header("Location: contas_receber.php");
    exit;
}

// --- EXCLUIR CONTA SIMPLES (NºO RECORRENTE) ---
if ($action === 'excluir_conta_simples' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if ($id) {
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM recebimentos WHERE id_conta_receber = ?");
        $stmtCheck->execute([$id]);
        if ($stmtCheck->fetchColumn() > 0) {
            $_SESSION['mensagem_erro'] = 'Não à possível excluir uma fatura que já possui recebimentos.';
        } else {
            $pdo->beginTransaction();
            try {
                $pdo->prepare("DELETE FROM contas_receber_divisao WHERE id_conta_receber = ?")->execute([$id]);
                $pdo->prepare("DELETE FROM contas_receber WHERE id = ?")->execute([$id]);
                $pdo->commit();
                $_SESSION['mensagem_sucesso'] = 'Conta a receber excluída com sucesso!';
            } catch (Exception $e) {
                $pdo->rollBack();
                $_SESSION['mensagem_erro'] = 'Erro ao excluir conta: ' . $e->getMessage();
            }
        }
    }
    header("Location: contas_receber.php");
    exit;
}

// --- EXCLUIR CONTA COM OPÇÃO DE RECORRÊNCIA ---
if ($action === 'excluir_conta_com_recorrencia' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    $excluirRecorrencia = isset($_POST['excluir_recorrencia']);

    if ($id) {
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM recebimentos WHERE id_conta_receber = ?");
        $stmtCheck->execute([$id]);
        if ($stmtCheck->fetchColumn() > 0) {
            $_SESSION['mensagem_erro'] = 'Não à possível excluir uma fatura que já possui recebimentos.';
        } else {
            $pdo->beginTransaction();
            try {
                // Pega os dados da fatura ANTES de apagar, para saber qual recorrência apagar
                $stmtFatura = $pdo->prepare("SELECT id_cliente, descricao FROM contas_receber WHERE id = ?");
                $stmtFatura->execute([$id]);
                $fatura = $stmtFatura->fetch();

                // Apaga o lançamento do mês
                $pdo->prepare("DELETE FROM contas_receber_divisao WHERE id_conta_receber = ?")->execute([$id]);
                $pdo->prepare("DELETE FROM contas_receber WHERE id = ?")->execute([$id]);

                // Se o usuário marcou a caixa, apaga também a regra de recorrência
                if ($excluirRecorrencia && $fatura) {
                    $sqlDelRec = "DELETE FROM recorrencias WHERE tipo = 'Receber' AND id_cliente = ? AND descricao_padrao = ?";
                    $pdo->prepare($sqlDelRec)->execute([$fatura['id_cliente'], $fatura['descricao']]);
                }

                $pdo->commit();
                $_SESSION['mensagem_sucesso'] = 'Operação de exclusáo realizada com sucesso!';
            } catch (Exception $e) {
                $pdo->rollBack();
                $_SESSION['mensagem_erro'] = 'Erro ao excluir conta: ' . $e->getMessage();
            }
        }
    }
    header("Location: contas_receber.php");
    exit;
}


$params = [];
$whereConditions = [];


$data_inicial_base = date('Y-m-01');
$data_final_base = date('Y-m-t');

$filtro_status = $_GET['filtro_status'] ?? 'todos';
$filtro_texto = $_GET['filtro_texto'] ?? '';
$filtro_data_inicio = $_GET['filtro_data_inicio'] ?? $data_inicial_base;
$filtro_data_fim = $_GET['filtro_data_fim'] ?? $data_final_base;

// --- FILTRO DE STATUS ---
if ($filtro_status !== 'todos') {
    $whereConditions[] = "cr.status_id = :status_id";
    $params[':status_id'] = (int)$filtro_status;
}


// --- FILTRO DE TEXTO ---
if (!empty($filtro_texto)) {
    $whereConditions[] = "(cr.descricao LIKE :texto OR c.clt_nomef LIKE :texto)";
    $params[':texto'] = '%' . $filtro_texto . '%';
}

// --- FILTROS DE DATA ---
if (!empty($filtro_data_inicio)) {
    $whereConditions[] = "cr.data_vencimento >= :data_inicio";
    $params[':data_inicio'] = $filtro_data_inicio;
}
if (!empty($filtro_data_fim)) {
    $whereConditions[] = "cr.data_vencimento <= :data_fim";
    $params[':data_fim'] = $filtro_data_fim;
}

// --- ORDENACAO ---
$orderBy = $_GET['orderBy'] ?? 'data_vencimento';
$orderDir = $_GET['orderDir'] ?? 'ASC';
$colunasPermitidas = ['nome_cliente', 'descricao', 'data_vencimento', 'valor_total', 'data_recebimento', 'saldo', 'status_id'];
if (!in_array($orderBy, $colunasPermitidas)) $orderBy = 'data_vencimento';
$orderDir = strtoupper($orderDir) === 'ASC' ? 'ASC' : 'DESC';

// --- MENSAGENS ---
if (isset($_SESSION['mensagem_sucesso'])) {
    $mensagem = '<div class="alert alert-success">' . $_SESSION['mensagem_sucesso'] . '</div>';
    unset($_SESSION['mensagem_sucesso']);
}
if (isset($_SESSION['mensagem_erro'])) {
    $mensagem = '<div class="alert alert-danger">' . $_SESSION['mensagem_erro'] . '</div>';
    unset($_SESSION['mensagem_erro']);
}

// --- CLIENTES ---
$clientes = $pdo->query("SELECT clt_id, clt_nomef FROM clientes WHERE clt_sts = 1 ORDER BY clt_nomef ASC")->fetchAll(PDO::FETCH_ASSOC);

// --- CONSULTA PRINCIPAL ---
$sql = "
SELECT 
    cr.*, 
    cr.id AS fatura_id,
    c.clt_nomef AS nome_cliente,
    crd.percentual_ti,
    crd.percentual_devops,
    crd.percentual_marketing,
    un.nome_unid AS nome_unid,

    (
        SELECT MAX(data_recebimento)
        FROM recebimentos
        WHERE id_conta_receber = cr.id
    ) AS data_recebimento,

    (
        SELECT SUM(valor_recebido)
        FROM recebimentos
        WHERE id_conta_receber = cr.id
    ) AS total_recebido,

    (
        SELECT observacao
        FROM recebimentos
        WHERE id_conta_receber = cr.id
        ORDER BY data_recebimento DESC
        LIMIT 1
    ) AS observacao,

    EXISTS(
        SELECT 1 
        FROM recorrencias 
        WHERE tipo = 'Receber' 
        AND id_cliente = cr.id_cliente 
        AND descricao_padrao = cr.descricao
    ) AS is_recorrente,

    s.nome AS nome_status

FROM contas_receber AS cr

JOIN clientes AS c 
    ON cr.id_cliente = c.clt_id

LEFT JOIN contas_receber_divisao AS crd 
    ON cr.id = crd.id_conta_receber

LEFT JOIN unidade_negocio AS un 
    ON cr.unidade_negocio = un.id

LEFT JOIN status_contas AS s 
    ON cr.status_id = s.id
";


if (!empty($whereConditions)) {
    $sql .= " WHERE " . implode(' AND ', $whereConditions);
}

$sql .= " ORDER BY $orderBy $orderDir";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$contas_a_receber = $stmt->fetchAll(PDO::FETCH_ASSOC);

// --- Modal detalhe (ordenado por data de vencimento) ---
$contas_modal_detalhe = $contas_a_receber;
usort($contas_modal_detalhe, function ($a, $b) {
    return strtotime($a['data_vencimento']) <=> strtotime($b['data_vencimento']);
});



$sqlResumo = "
    SELECT 
        SUM(cr.valor_total) AS total_faturado,
        SUM(cr.saldo) AS total_saldo, 
        COUNT(cr.id) AS total_faturas
    FROM contas_receber AS cr
    JOIN clientes AS c ON cr.id_cliente = c.clt_id
    LEFT JOIN status_contas AS s ON cr.status_id = s.id
    LEFT JOIN unidade_negocio AS un ON cr.unidade_negocio = un.id
";
if (!empty($whereConditions)) {
    $sqlResumo .= " WHERE " . implode(' AND ', $whereConditions);
}
$stmtResumo = $pdo->prepare($sqlResumo);
$stmtResumo->execute($params);
$resumoFiltro = $stmtResumo->fetch(PDO::FETCH_ASSOC);


$sqlInadimplentesGlobal = "
    SELECT 
        SUM(cr.saldo) AS valor_total_inadimplente_global,
        COUNT(cr.id) AS count_inadimplente_global
    FROM contas_receber AS cr
    JOIN status_contas AS s ON cr.status_id = s.id
    WHERE s.nome = 'Inadimplente' AND cr.saldo > 0
";
$stmtInadimplentesGlobal = $pdo->prepare($sqlInadimplentesGlobal);
$stmtInadimplentesGlobal->execute();
$resumoInadimplentesGlobal = $stmtInadimplentesGlobal->fetch(PDO::FETCH_ASSOC);


// --- Calcula os valores para os CARDS ---
$totalFaturadoFiltrado = $resumoFiltro['total_faturado'] ?? 0;
$totalSaldoFiltrado = $resumoFiltro['total_saldo'] ?? 0;
$totalRecebidoFiltrado = $totalFaturadoFiltrado - $totalSaldoFiltrado;
$totalFaturasFiltradas = $resumoFiltro['total_faturas'] ?? 0;

// Valores GLOBAIS (para o card de "Meses Anteriores")
$totalInadimplenteGlobal = $resumoInadimplentesGlobal['valor_total_inadimplente_global'] ?? 0;
$contasInadimplentesGlobal = $resumoInadimplentesGlobal['count_inadimplente_global'] ?? 0;

// Carrega os status (para os nomes dos filtros)
$statusContas = $pdo->query("SELECT id, nome FROM status_contas where id IN (1,2,3,4,5) ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);


// ## NOVA LÓGICA PARA FILTROS EM LINHA ##
$filtrosAtivosHTML = [];
if ($filtro_status !== 'todos') {
    // Procura o nome do status no array de status
    $nomeStatus = '';
    foreach ($statusContas as $status) {
        if ($status['id'] == $filtro_status) {
            $nomeStatus = $status['nome'];
            break;
        }
    }
    if ($nomeStatus) {
        $filtrosAtivosHTML[] = '<strong>Status:</strong> ' . htmlspecialchars($nomeStatus);
    }
}


if (!empty($filtro_texto)) {
    $filtrosAtivosHTML[] = '<strong>Busca:</strong> "' . htmlspecialchars($filtro_texto) . '"';
}
if (!empty($filtro_data_inicio)) {
    $filtrosAtivosHTML[] = '<strong>Início:</strong> ' . date('d/m/Y', strtotime($filtro_data_inicio));
}
if (!empty($filtro_data_fim)) {
    $filtrosAtivosHTML[] = '<strong>Fim:</strong> ' . date('d/m/Y', strtotime($filtro_data_fim));
}
// ## FIM DAS NOVAS LÓGICAS ##


$grupos = $pdo->query("SELECT * FROM categorias_grupo WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$subgrupos = $pdo->query("SELECT * FROM categorias_subgrupo WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$classificacoes = $pdo->query("SELECT * FROM categorias_classificacao WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$documentos = $pdo->query("SELECT * FROM categorias_tipo_documento WHERE status = 1 ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
$agenciasBancarias = $pdo->query("SELECT * FROM agenciasbancarias  ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
$unidadesNegocio = $pdo->query("SELECT * FROM unidade_negocio WHERE sts_unid = 1")->fetchAll(PDO::FETCH_ASSOC);



function sortLink($label, $column, $currentOrderBy, $currentOrderDir)
{
    $newOrderDir = ($currentOrderBy === $column && $currentOrderDir === 'DESC') ? 'ASC' : 'DESC';
    $icon = '';
    if ($currentOrderBy === $column) {
        $icon = $currentOrderDir === 'ASC' ? ' <i class="fas fa-sort-up"></i>' : ' <i class="fas fa-sort-down"></i>';
    }
    $queryString = http_build_query(array_merge($_GET, ['orderBy' => $column, 'orderDir' => $newOrderDir]));
    return "<a href=\"?{$queryString}\">{$label}{$icon}</a>";
}
?>
<?php
// --- Calcular inadimplentes ---
$totalInadimplente = 0;
$contasInadimplentes = 0;

foreach ($contas_modal_detalhe as $item) {
    $status = $item['status'];
    $dataVenc = $item['data_vencimento'];
    $saldo = $item['saldo'] ?? 0;

    $mesVenc = (int)date('m', strtotime($dataVenc));
    $anoVenc = (int)date('Y', strtotime($dataVenc));
    $mesAtual = (int)date('m');
    $anoAtual = (int)date('Y');

    $isInadimplente = $status != 'Recebido' && ($anoVenc < $anoAtual || ($anoVenc == $anoAtual && $mesVenc < $mesAtual));

    if ($isInadimplente && $saldo > 0.01) {
        $totalInadimplente += $saldo;
        $contasInadimplentes++;
    }
}
?>

<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <title>Contas a Receber</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.25/css/dataTables.bootstrap4.min.css" />
    <style>
        body {
            zoom: 0.9;
            overflow: hidden;
        }

        .card-principal {
            height: calc(100vh - 70px);
            overflow-y: auto;
        }

        .table td,
        .table th {
            padding: 0.3rem 0.6rem;
            font-size: 0.9rem;
            vertical-align: middle;
        }

        .table-vencido {
            background-color: #ffe5e5 !important;
        }

        .table-recebido {
            background-color: #e5ffe7 !important;
        }

        .table-parcial {
            background-color: #e3f2fd !important;
        }

        thead a {
            color: white;
        }

        thead a {
            color: white;
            text-decoration: none;
        }

        thead a:hover {
            color: #ddd;
        }

        .form-check-input {
            width: 20px;
            height: 20px;
        }

        .btn-registrar-recebimento,
        .btn-exibir-recebimentos,
        .btn-edit-conta-receber,
        .btn-excluir {
            width: 30px;
            height: 30px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 3px;
            line-height: 0;
        }
    </style>
</head>


<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="container-fluid mt-2">
        <?php
        if (isset($_SESSION['alert_message'])) {
            $alert = $_SESSION['alert_message'];
            echo "<div class='alert alert-{$alert['type']}'>{$alert['text']}</div>";
            unset($_SESSION['alert_message']);
        }
        ?>
        <div class="card mt-2">
            <div class="card-header d-flex justify-content-between align-items-center py-2">
                <div class="col-md-6 mt-1 mb-0 row align-items-center">
                    <h5 class="m-0 font-weight-bold">Gestão de Contas a Receber - Competência</h5>

                    <a href="gestaoRD.php" class="ml-4"><i class="fas fa-home" style="font-size: 25px;" data-toggle="tooltip" title="Home RD"></i></a>
                </div>
                <div class="d-flex align-items-center">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-toggle="modal" data-target="#modalResumoFiltro" title="Ver Resumo do Filtro">
                        <i class="fas fa-chart-pie"> </i> Resumo
                    </button>
                    <button class="btn btn-outline-secondary btn-sm ml-3" type="button" data-toggle="collapse" data-target="#filtroCollapse">
                        <i class="fas fa-filter"></i> Filtrar
                    </button>
                    <button type="button" class="btn btn-success btn-sm ml-3" data-toggle="modal" data-target="#modalAddContaReceber">
                        <i class="fas fa-plus"></i> Novo Lancamento
                    </button>
                </div>
            </div>


            <div class="card-body py-2 card-principal">
                <?php
                $isFiltroAtivo = !empty($filtro_status) && $filtro_status !== 'todos' || !empty($filtro_texto) || !empty($filtro_data_inicio) || !empty($filtro_data_fim);
                $collapseShowClass = $isFiltroAtivo ? 'show' : '';
                ?>
                <div class="collapse <?= $collapseShowClass ?>" id="filtroCollapse">
                    <div class="card card-body mb-2 py-2">
                        <form method="GET" class="mb-0">
                            <div class="row">
                                <div class="col-md-2">
                                    <label class="small mb-1">Status</label>
                                    <select name="filtro_status" class="form-control form-control-sm">
                                        <option value="todos" <?= ($filtro_status ?? '') === 'todos' ? 'selected' : '' ?>>Todos</option>
                                        <?php
                                        foreach ($statusContas as $status) {
                                            $selected = ($filtro_status ?? '') == $status['id'] ? 'selected' : '';
                                            echo "<option value=\"{$status['id']}\" $selected>{$status['nome']}</option>";
                                        }
                                        ?>
                                    </select>
                                </div>

                                <div class="col-md-3">
                                    <label class="small mb-1">Cliente ou Descrição</label>
                                    <input type="text" name="filtro_texto" class="form-control form-control-sm" value="<?= htmlspecialchars($filtro_texto) ?>" placeholder="Buscar...">
                                </div>
                                <div class="col-md-2">
                                    <label class="small mb-1">Vencimento De</label>
                                    <input type="date" name="filtro_data_inicio" class="form-control form-control-sm" value="<?= htmlspecialchars($filtro_data_inicio) ?>">
                                </div>
                                <div class="col-md-2">
                                    <label class="small mb-1">Vencimento Até</label>
                                    <input type="date" name="filtro_data_fim" class="form-control form-control-sm" value="<?= htmlspecialchars($filtro_data_fim) ?>">
                                </div>
                                <div class="col-md-2 align-self-end">
                                    <div class="btn-group w-100">
                                        <button type="submit" class="btn btn-secondary btn-sm mr-2" title="Filtrar"><i class="fas fa-filter"></i> </button>
                                        <a href="contas_receber.php" class="btn btn-outline-secondary btn-sm" title="Limpar Filtros"><i class="fas fa-eraser"></i></a>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-sm table-bordered table-striped table-hover">
                        <thead class="thead-dark">
                            <tr>
                                <th class="text-center">ID</th>
                                <th><?= sortLink('Cliente', 'nome_cliente', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Descrição', 'descricao', $orderBy, $orderDir) ?></th>
                                <th style="width:140px" class="text-center" style="width: 130px;"><?= sortLink('Dt. Vencimento', 'data_vencimento', $orderBy, $orderDir) ?></th>
                                <th><?= sortLink('Valor Total', 'valor_total', $orderBy, $orderDir) ?></th>
                                <!-- <th><?= sortLink('Dt. Recebimento', 'data_recebimento', $orderBy, $orderDir) ?></th> -->
                                <th>Recebido</th>
                                <th><?= sortLink('A Receber', 'saldo', $orderBy, $orderDir) ?></th>
                                <th class="text-center"><?= sortLink('Status', 'status_id', $orderBy, $orderDir) ?></th>
                                <th class="text-center">Açães</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($contas_a_receber)) : ?>
                                <tr>
                                    <td colspan="9" class="text-center">Nenhum lançamento encontrado.</td>
                                </tr>
                                <?php else : foreach ($contas_a_receber as $item) : ?>
                                    <tr class="<?=
                                                $item['status_id'] == 3 ? 'table-recebido' : ($item['status_id'] == 2 ? 'table-parcial' : '')
                                                ?>">
                                        <td><?= htmlspecialchars($item['id']) ?></td>
                                        <td><?= $item['nome_cliente'] ?></td>
                                        <td><?= $item['descricao'] ?></td>
                                        <td class="text-center"><?= date('d/m/Y', strtotime($item['data_vencimento'])) ?></td>
                                        <td style="min-width: 120px">R$ <?= number_format($item['valor_total'], 2, ',', '.') ?></td>
                                        <!-- <td><?= $item['data_recebimento'] ? date('d/m/Y', strtotime($item['data_recebimento'])) : '' ?></td> -->
                                        <td style="min-width: 120px">R$ <?= number_format($item['total_recebido'] ?? 0, 2, ',', '.') ?></td>
                                        <td style="min-width: 120px">R$ <?= number_format($item['saldo'], 2, ',', '.') ?></td>

                                        <td class="text-center">
                                            <?php
                                            $status_id = $item['status_id'];
                                            $status_nome = $item['nome_status'];
                                            $dataVenc = $item['data_vencimento'];

                                            $hoje = date('Y-m-d');
                                            $mesVenc = (int)date('m', strtotime($dataVenc));
                                            $anoVenc = (int)date('Y', strtotime($dataVenc));
                                            $mesAtual = (int)date('m');
                                            $anoAtual = (int)date('Y');

                                            // Determinar se está vencido
                                            $isVencido = strtotime($dataVenc) < time() && $status_id != 3;

                                            // Determinar se é inadimplente (mês anterior ao atual e ainda não recebido)
                                            $isInadimplente = $status_id != 3 && ($anoVenc < $anoAtual || ($anoVenc == $anoAtual && $mesVenc < $mesAtual));

                                            // Exibir badge conforme o status real
                                            if ($status_id == 3) { // Recebido
                                                echo '<span class="badge badge-success">Recebido</span>';
                                            } elseif ($status_id == 2) { // Parcialmente Recebido
                                                echo '<span class="badge badge-info">Parcial</span>';
                                            } elseif ($status_id == 5) { // Inadimplente
                                                echo '<span class="badge badge-dark">Inadimplente</span>';
                                            } elseif ($isVencido) {
                                                echo '<span class="badge badge-danger">Vencido</span>';
                                            } else {
                                                echo '<span class="badge badge-warning">A Vencer</span>';
                                            }
                                            ?>
                                        </td>


                                        <td class="text-right">
                                            <div class="d-flex justify-content-end align-items-center">
                                                <?php if ($item['status_id'] != '3') : ?>
                                                    <button type="button" class="btn btn-sm btn-success btn-registrar-recebimento" data-toggle="modal" data-target="#modalRegistrarRecebimento" data-id="<?= $item['fatura_id'] ?>" data-descricao="<?= htmlspecialchars($item['descricao']) ?>" data-valor_total="<?= number_format($item['valor_total'], 2, ',', '.') ?>" data-valor_recebido="<?= number_format(($item['valor_total'] ?? 0) - ($item['saldo'] ?? 0), 2, ',', '.') ?>" data-saldo="<?= number_format($item['saldo'], 2, ',', '.') ?>" data-vencimento="<?= date('d/m/Y', strtotime($item['data_vencimento'])) ?>" data-nome_cliente="<?= htmlspecialchars($item['nome_cliente']) ?>" title="Registrar Recebimento">
                                                        <i class="fas fa-dollar-sign"></i>
                                                    </button>
                                                <?php endif; ?>


                                                <button type="button" class="btn btn-sm btn-info btn-exibir-recebimentos" data-toggle="modal" data-target="#modalExibirRecebimentos" data-id="<?= $item['fatura_id'] ?>" data-nome_cliente="<?= htmlspecialchars($item['nome_cliente']) ?>" title="Exibir Recebimentos">
                                                    <i class="fas fa-list"></i>
                                                </button>


                                                <button type="button" class="btn btn-sm btn-warning btn-edit-conta-receber" data-toggle="modal" data-target="#modalEditContaReceber" data-id="<?= $item['fatura_id'] ?>" data-id_cliente="<?= $item['id_cliente'] ?>" data-descricao="<?= htmlspecialchars($item['descricao']) ?>" data-valor_total="<?= $item['valor_total'] ?>" data-vencimento="<?= $item['data_vencimento'] ?>" data-unidade_negocio="<?= $item['unidade_negocio'] ?>" data-id_grupo="<?= $item['id_grupo'] ?>" data-id_subgrupo="<?= $item['id_subgrupo'] ?>" data-id_classificacao="<?= $item['id_classificacao'] ?>" data-id_tipo_documento="<?= $item['id_tipo_documento'] ?>" data-percentual_ti="<?= $item['percentual_ti'] ?? 0 ?>" data-percentual_devops="<?= $item['percentual_devops'] ?? 0 ?>" data-percentual_marketing="<?= $item['percentual_marketing'] ?? 0 ?>" data-is_recorrente="<?= $item['is_recorrente'] ?>" title="Editar Conta">
                                                    <i class="fas fa-edit"></i>
                                                </button>

                                                <!-- <button type="button" class="btn btn-sm btn-danger btn-excluir" data-id="<?= $item['fatura_id'] ?>" data-descricao="<?= htmlspecialchars($item['descricao']) ?>" data-recorrente="<?= $item['is_recorrente'] ?>" title="Excluir">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button> -->

                                                <button type="button" class="btn btn-sm btn-danger btn-excluir" data-id="<?= $item['fatura_id'] ?>" data-descricao="<?= htmlspecialchars($item['descricao']) ?>" data-recorrente="<?= $item['is_recorrente'] ?>" data-valor-total="<?= $item['valor_total'] ?>" data-saldo="<?= $item['saldo'] ?>" title="Excluir">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                            <?php endforeach;
                            endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal gerir recebimentos-->
    <div class="modal fade" id="modalExibirRecebimento" tabindex="-1" role="dialog" aria-labelledby="tituloModal" aria-hidden="true">
        <div class="modal-dialog modal-xl" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="tituloModal">Histórico de Recebimentos</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <label class="mt-0 ml-3 mr-3"> Recebimentos do Cliente: </label>
                        <h5 class="mt-0"> <strong id="rec_detalhe_titulo"> </strong></h5>
                    </div>
                    <div class="table-responsive" style="max-height: 400px;">
                        <table class="table table-sm table-striped">
                            <thead class="thead-light" style="position: sticky; top: 0;">
                                <tr>
                                    <th style="width: 150px">Data Recebimento</th>
                                    <th class="text-center" style="width: 150px">Valor Recebido</th>
                                    <th class="text-center" style="width: 180px">Agência / Banco</th>
                                    <th>Observação</th>
                                    <th class="text-center" style="width: 150px">Açães</th>
                                </tr>
                            </thead>
                            <tbody id="lista_recebimentos_body"></tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Resumo Filtro -->
    <div class="modal fade" id="modalResumoFiltro" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Resumo do Filtro Atual (Contas a Receber)</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">

                    <!--Filtros Ativos -->
                    <div class="card p-2 mb-3 bg-light" style="font-size: 0.85rem;">
                        <span class="text-muted">
                            <strong>Filtros Ativos:</strong>
                            <?php
                            if (empty($filtrosAtivosHTML)) {
                                echo 'Nenhum filtro aplicado.';
                            } else {
                                echo implode(' <span class="mx-2 text-black-50">|</span> ', $filtrosAtivosHTML);
                            }
                            ?>
                        </span>
                    </div>

                    <div class="row">

                        <div class="col-md-4">
                            <h6 class="text-center text-muted mb-3">Resumo Financeiro (A receber)</h6>

                            <div class="card shadow-sm mb-3">
                                <div class="card-body text-center py-2">
                                    <h6 class="card-title text-muted mb-1">TOTAL FATURADO</h6>
                                    <h3 class="font-weight-bold text-primary mb-0">R$ <?= number_format($totalFaturadoFiltrado, 2, ',', '.') ?></h3>
                                </div>
                            </div>

                            <div class="card shadow-sm mb-3">
                                <div class="card-body text-center py-2">
                                    <h6 class="card-title text-muted mb-1">TOTAL RECEBIDO</h6>
                                    <h3 class="font-weight-bold text-success mb-0">R$ <?= number_format($totalRecebidoFiltrado, 2, ',', '.') ?></h3>
                                </div>
                            </div>

                            <div class="card shadow-sm mb-3">
                                <div class="card-body text-center py-2">
                                    <h6 class="card-title text-muted mb-1">SALDO A RECEBER (do período)</h6>
                                    <h3 class="font-weight-bold text-warning mb-0">R$ <?= number_format($totalSaldoFiltrado, 2, ',', '.') ?></h3>
                                </div>
                            </div>

                            <p class="text-center text-muted mt-2">
                                Total de <strong><?= $totalFaturasFiltradas ?></strong> fatura(s) encontradas no período.
                            </p>

                            <div class="card shadow-sm border-dark mt-4">
                                <div class="card-body text-center py-2 bg-light">
                                    <h6 class="card-title text-muted mb-1">?? TOTAL INADIMPLENTE (Geral)</h6>
                                    <h3 class="font-weight-bold text-dark mb-0">R$ <?= number_format($totalInadimplenteGlobal, 2, ',', '.') ?></h3>
                                    <small class="text-muted"><?= $contasInadimplentesGlobal ?> fatura(s) de meses anteriores</small>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-8">
                            <h6 class="text-center text-muted mb-3">Detalhamento do Saldo Pendente de Recebimento</h6>

                            <?php

                            $contasPendentesFiltradas = [];
                            foreach ($contas_modal_detalhe as $item) {
                                $statusNome = $item['nome_status'];
                                $saldo = $item['saldo'] ?? 0;
                                if ($saldo > 0.01 && $statusNome != 'Recebido' && $statusNome != 'Inadimplente') {
                                    $contasPendentesFiltradas[] = $item;
                                }
                            }

                            // Lista GLOBAL de inadimplentes (ignora filtros)
                            $sqlInadimplentesGlobalLista = "
                            SELECT cr.*, c.clt_nomef AS nome_cliente, s.nome AS nome_status
                            FROM contas_receber AS cr
                            JOIN clientes AS c ON cr.id_cliente = c.clt_id
                            JOIN status_contas AS s ON cr.status_id = s.id
                            WHERE s.nome = 'Inadimplente' AND cr.saldo > 0
                            ORDER BY cr.data_vencimento ASC
                        ";
                            $stmtInadimplentesGlobalLista = $pdo->prepare($sqlInadimplentesGlobalLista);
                            $stmtInadimplentesGlobalLista->execute();
                            $contasInadimplentesArrGlobal = $stmtInadimplentesGlobalLista->fetchAll(PDO::FETCH_ASSOC);

                            function renderTabelaContas($contas)
                            {
                                if (empty($contas)) {
                                    echo '<tr><td colspan="4" class="text-center text-muted py-3">Nenhum registro encontrado.</td></tr>';
                                    return;
                                }
                                foreach ($contas as $item) {
                                    $statusNome = $item['nome_status'];
                                    $dataVenc = $item['data_vencimento'];
                                    $saldo = $item['saldo'];
                            ?>
                                    <tr>
                                        <td><?= $item['nome_cliente'] ?></td>
                                        <td class="text-center">
                                            <?php
                                            if ($statusNome == 'Recebido') {
                                                echo '<span class="badge badge-success">Recebido</span>';
                                            } elseif ($statusNome == 'Parcialmente Recebido') {
                                                echo '<span class="badge badge-info">Parcial</span>';
                                            } elseif ($statusNome == 'Inadimplente') {
                                                echo '<span class="badge badge-dark">Inadimplente</span>';
                                            } elseif ($statusNome == 'Vencido') {
                                                echo '<span class="badge badge-danger">Vencido</span>';
                                            } else {
                                                echo '<span class="badge badge-warning">' . htmlspecialchars($statusNome) . '</span>';
                                            }
                                            ?>
                                        </td>
                                        <td class="text-right"><?= date('d/m/Y', strtotime($dataVenc)) ?></td>
                                        <td class="text-right text-danger font-weight-bold">
                                            <?= number_format($saldo, 2, ',', '.') ?>
                                        </td>
                                    </tr>
                            <?php
                                }
                            }
                            ?>

                            <div class="card shadow-sm mb-3">
                                <div class="card-header bg-primary text-white py-2 text-left">
                                    <strong>Pendentes (do Período Filtrado)</strong>
                                </div>
                                <div class="card-body p-0" style="max-height: 250px; overflow-y: auto;">
                                    <table class="table table-sm table-striped table-hover mb-0" id="tabelaPendentesFiltradas">
                                        <thead style="position: sticky; top: 0; background-color: #f8f9fa;">
                                            <tr>
                                                <th>Cliente</th>
                                                <th class="text-center">Status</th>
                                                <th class="text-right">Vencimento</th>
                                                <th class="text-right">Saldo (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php renderTabelaContas($contasPendentesFiltradas); ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="card shadow-sm border-dark">
                                <div class="card-header bg-dark text-white py-2 text-left">
                                    <strong>?? Inadimplentes (Geral / Meses Anteriores)</strong>
                                </div>
                                <div class="card-body p-0" style="max-height: 220px; overflow-y: auto;">
                                    <table class="table table-sm table-striped table-hover mb-0" id="tabelaInadimplentesGlobal">
                                        <thead style="position: sticky; top: 0; background-color: #f8f9fa;">
                                            <tr>
                                                <th>Cliente</th>
                                                <th class="text-center">Status</th>
                                                <th class="text-right">Vencimento</th>
                                                <th class="text-right">Saldo (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php renderTabelaContas($contasInadimplentesArrGlobal); ?>
                                        </tbody>
                                    </table>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Add Recebimento -->
    <div class="modal fade" id="modalAddContaReceber" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <form method="POST" id="form-add-conta">
                    <input type="hidden" name="action" value="add_conta_receber">
                    <div class="modal-header">
                        <h5 class="modal-title">Nova Conta a Receber</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="form-group col-md-12 mb-2">
                                <label class="small mb-1">Descrição</label><input type="text" name="descricao" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="form-group col-md-6 ">
                                <label class="small mb-1">Cliente</label>
                                <select name="id_cliente" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option><?php foreach ($clientes as $cliente) : ?><option value="<?= $cliente['clt_id'] ?>"><?= $cliente['clt_nomef'] ?></option><?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-3 ">
                                <label class="small mb-1">Data de Vencimento</label>
                                <input type="date" name="data_vencimento" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Valor Total (R$)</label>
                                <input type="number" step="0.01" name="valor_total" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <hr class="my-2">
                        <h6><strong>Classificação da Receita</strong></h6>
                        <div class="form-row">
                            <!-- Unidade de Negocio -->
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Unidade de Negócio:</label>
                                <select name="unidade_negocio" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($unidadesNegocio as $unidadeNegocio) : ?>
                                        <option value="<?= $unidadeNegocio['id'] ?>">
                                            <?= htmlspecialchars($unidadeNegocio['nome_unid']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <!-- Grupo -->
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Grupo:</label>
                                <select name="id_grupo" id="select_grupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option><?php foreach ($grupos as $grupo) : ?><option value="<?= $grupo['id'] ?>"><?= htmlspecialchars($grupo['nome']) ?></option><?php endforeach; ?>
                                </select>
                            </div>

                            <!-- Subgrupo -->
                            <div class="form-group col-md-2">
                                <label class="small mb-1">Subgrupo:</label>
                                <select name="id_subgrupo" id="select_subgrupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione um grupo</option>
                                </select>
                            </div>

                            <div class="form-group col-md-2 mb-2">
                                <label class="small mb-1">Classificação</label><select name="id_classificacao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option><?php foreach ($classificacoes as $item) : ?><option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option><?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2 mb-2"><label class="small mb-1">Tipo de Documento</label><select name="id_tipo_documento" class="form-control form-control-sm">
                                    <option value="">Nenhum</option><?php foreach ($documentos as $item) : ?><option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option><?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <hr class="my-2">
                        <h6><strong>Divisão por Setores (%)</strong></h6>
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                <label class="small mb-1">TI</label>
                                <input type="number" name="percent_ti" class="form-control form-control-sm percent-input" value="100" min="0" max="100">
                            </div>
                            <div class="col-md-2">
                                <label class="small mb-1">DevOps</label>
                                <input type="number" name="percent_devops" class="form-control form-control-sm percent-input" value="0" min="0" max="100">
                            </div>
                            <div class="col-md-2">
                                <label class="small mb-1">Marketing</label>
                                <input type="number" name="percent_marketing" class="form-control form-control-sm percent-input" value="0" min="0" max="100">
                            </div>
                            <div class="col-md-3 mt-4">
                                <strong id="percent-total">Total: 0%</strong>
                            </div>
                        </div>
                        <hr class="my-3">
                        <div class="form-group form-check mr-2 ml-2 text-right">
                            <input type="checkbox" class="form-check-input " name="salvar_recorrencia" id="salvar_recorrencia" value="1">
                            <label class="form-check-label ml-2" for="salvar_recorrencia"><b>Registrar como Conta Recorrente</b></label>
                        </div>
                    </div>
                    <div class="modal-footer py-2 mb-3"><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-primary btn-sm" id="btn-salvar">Salvar</button></div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Editar Conta a Receber -->
    <div class="modal fade" id="modalEditContaReceber" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <form method="POST" id="form-edit-conta">
                    <input type="hidden" name="action" value="edit_conta_receber">
                    <input type="hidden" name="id" id="edit_id_conta">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Conta a Receber</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="form-group col-md-8">
                                <label class="small mb-1">Cliente</label>
                                <select name="id_cliente" id="edit_id_cliente" class="form-control form-control-sm" required>
                                    <?php foreach ($clientes as $cliente) : ?>
                                        <option value="<?= $cliente['clt_id'] ?>"><?= htmlspecialchars($cliente['clt_nomef']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="small mb-1">Data de Vencimento</label>
                                <input type="date" name="data_vencimento" id="edit_data_vencimento" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="form-group col-md-8">
                                <label class="small mb-1">Descrição</label>
                                <input type="text" name="descricao" id="edit_descricao" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-4">
                                <label class="small mb-1">Valor Total (R$)</label>
                                <input type="number" step="0.01" name="valor_total" id="edit_valor_total" class="form-control form-control-sm" required>
                            </div>
                        </div>
                        <hr class="my-2">
                        <h6><strong>Classificação da Receita</strong></h6>
                        <div class="form-row">
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Unidade de Negócio:</label>
                                <select name="unidade_negocio" id="edit_unidade_negocio" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($unidadesNegocio as $unidadeNegocio) : ?>
                                        <option value="<?= $unidadeNegocio['id'] ?>">
                                            <?= htmlspecialchars($unidadeNegocio['nome_unid']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-3">
                                <label class="small mb-1">Grupo:</label>
                                <select name="id_grupo" id="edit_id_grupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($grupos as $grupo) : ?>
                                        <option value="<?= $grupo['id'] ?>">
                                            <?= htmlspecialchars($grupo['nome']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2">
                                <label class="small mb-1">Subgrupo:</label>
                                <select name="id_subgrupo" id="edit_id_subgrupo" class="form-control form-control-sm" required>
                                    <option value="">Selecione um grupo</option>
                                </select>
                            </div>

                            <div class="form-group col-md-2 mb-2">
                                <label class="small mb-1">Classificação</label>
                                <select name="id_classificacao" id="edit_id_classificacao" class="form-control form-control-sm" required>
                                    <option value="">Selecione...</option>
                                    <?php foreach ($classificacoes as $item) : ?>
                                        <option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group col-md-2 mb-2">
                                <label class="small mb-1">Tipo de Documento</label>
                                <select name="id_tipo_documento" id="edit_id_tipo_documento" class="form-control form-control-sm">
                                    <option value="">Nenhum</option>
                                    <?php foreach ($documentos as $item) : ?>
                                        <option value="<?= $item['id'] ?>"><?= htmlspecialchars($item['nome']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <hr class="my-2">
                        <h6><strong>Divisão por Setores (%)</strong></h6>
                        <div class="row align-items-center">
                            <div class="col-md-2">
                                <label class="small mb-1">TI</label>
                                <input type="number" id="edit_percent_ti" name="percent_ti" class="form-control form-control-sm percent-input" value="100" min="0" max="100">
                            </div>
                            <div class="col-md-2">
                                <label class="small mb-1">DevOps</label>
                                <input type="number" id="edit_percent_devops" name="percent_devops" class="form-control form-control-sm percent-input" value="0" min="0" max="100">
                            </div>
                            <div class="col-md-2">
                                <label class="small mb-1">Marketing</label>
                                <input type="number" id="edit_percent_marketing" name="percent_marketing" class="form-control form-control-sm percent-input" value="0" min="0" max="100">
                            </div>
                            <div class="col-md-3 mt-4">
                                <strong id="percent-total">Total: 0%</strong>
                            </div>
                        </div>
                        <div class="form-group form-check mr-2 ml-2 text-right">
                            <input type="checkbox" class="form-check-input mr-5" name="salvar_recorrencia" id="edit_salvar_recorrencia" value="1">
                            <label class="form-check-label ml-2 mr-2" for="edit_salvar_recorrencia"><b>Manter como Recebimento Recorrente</b></label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="edit-btn-salvar">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Excluir Conta Simples -->
    <!-- <div class="modal fade" id="modalExcluirSimples" tabindex="-1">
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="excluir_conta_simples">
                    <input type="hidden" name="id" id="excluir_id_simples">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirmar Exclusão</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Tem certeza que deseja excluir a fatura <strong id="excluir_desc_simples"></strong>? Esta ação não pode ser desfeita.</p>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-danger">Excluir</button></div>
                </form>
            </div>
        </div>
    </div> -->

    <!-- Modal Excluir Conta com Recorrencia -->
    <!-- <div class="modal fade" id="modalExcluirComRecorrencia" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="excluir_conta_com_recorrencia">
                    <input type="hidden" name="id" id="excluir_id_com_rec">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirmar Exclusão</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>A fatura <strong id="excluir_desc_com_rec"></strong> é uma conta recorrente.</p>
                        <p>Deseja excluir apenas este lançamento ou também a regra de recorrência futura?</p>
                        <hr>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="excluir_recorrencia" value="1" id="checkExcluirRecorrencia">
                            <label class="form-check-label" for="checkExcluirRecorrencia">
                                <strong>Sim, desejo excluir também a regra de recorrência mensal.</strong>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="submit" class="btn btn-danger">Excluir</button></div>
                </form>
            </div>
        </div>
    </div> -->

    <!-- Modal Excluir Conta Simples -->
    <div class="modal fade" id="modalExcluirSimples" tabindex="-1">
        <div class="modal-dialog ">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="excluir_conta_simples">
                    <input type="hidden" name="id" id="excluir_id_simples">

                    <div class="modal-header">
                        <h5 class="modal-title" id="titulo_modal_simples">Confirmar Exclusão</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>

                    <div class="modal-body">
                        <!-- Aviso de bloqueio -->
                        <div id="aviso_bloqueio_simples" class="aviso-bloqueio alert-danger p-3 rounded border" style="display:none;">
                            ?? <strong>Atenção!</strong><br>
                            Esta conta já possui recebimentos.<br>
                            Exclua primeiro qualquer recebimento<br>
                            para depois apagar a conta.
                        </div>

                        <!-- Conteúdo normal -->
                        <div id="corpo_normal_simples">
                            <p>Tem certeza que deseja excluir a fatura <strong id="excluir_desc_simples"></strong>?</p>
                            <p>Esta ação não pode ser desfeita.</p>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" id="btn_cancelar_simples" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button type="submit" id="btn_excluir_simples" class="btn btn-danger">Excluir</button>
                    </div>
                </form>
            </div>
        </div>
    </div>


    <!-- Modal Excluir Conta com Recorrencia -->
    <div class="modal fade" id="modalExcluirComRecorrencia" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="excluir_conta_com_recorrencia">
                    <input type="hidden" name="id" id="excluir_id_com_rec">

                    <div class="modal-header">
                        <h5 class="modal-title" id="titulo_modal_rec">Confirmar Exclusão</h5>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>

                    <div class="modal-body">
                        <!-- Aviso de bloqueio -->
                        <div id="aviso_bloqueio_rec" class="aviso-bloqueio alert-danger p-3 rounded border" style="display:none;">
                            ?? <strong>Atenção!</strong><br>
                            Esta conta já possui recebimentos.<br>
                            Exclua primeiro qualquer recebimento<br>
                            para depois apagar a conta.
                        </div>

                        <!-- Conteúdo normal -->
                        <div id="corpo_normal_rec">
                            <p>A fatura <strong id="excluir_desc_com_rec"></strong> é uma conta recorrente.</p>
                            <p>Deseja excluir apenas este lançamento ou também a regra de recorrência futura?</p>
                            <hr>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="excluir_recorrencia" value="1" id="checkExcluirRecorrencia">
                                <label class="form-check-label" for="checkExcluirRecorrencia">
                                    <strong>Sim, desejo excluir também a regra de recorrência mensal.</strong>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" id="btn_cancelar_rec" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                        <button type="submit" id="btn_excluir_rec" class="btn btn-danger">Excluir</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Registrar Recebimento -->
    <div class="modal fade" id="modalRegistrarRecebimento" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="registrar_recebimento">
                    <input type="hidden" name="id_conta" id="rec_id_conta">
                    <div class="modal-header">
                        <h5 class="modal-title">Registrar Recebimento</h5><button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <label>Registrando recebimento para:</label>
                        <h5><strong><span id="rec_cliente"></span> - <span id="rec_descricao"></span></strong></h5>
                        <h6 class="text-danger">Valor Total: <strong class="text-danger">R$ <span id="rec_total"></span></strong></h6>
                        <h6 class="text-danger">Valor Recebido: <strong class="text-danger">R$ <span id="rec_recebido"></span></strong></h6>

                        <h6>Saldo a receber: <strong class="text-danger">R$ <span id="rec_saldo"></span></strong></h6>
                        <h6>Data de Vencimento: <strong><span id="rec_vencimento"></span></strong></h6>
                        <hr>
                        <div class="form-row">
                            <div class="form-group col-md-4">
                                <label>Valor Recebido</label>
                                <input type="number" step="0.01" name="valor_recebido" class="form-control form-control-sm" required>
                            </div>
                            <div class="form-group col-md-4">
                                <label>Data do Recebimento</label>
                                <input type="date" name="data_recebimento" class="form-control form-control-sm" value="<?= date('Y-m-d') ?>" required>
                            </div>
                            <!-- AGENCIA / BANCO -->
                            <div class="form-group col-md-4">
                                <label>Agência / Banco</label>
                                <select name="id_agBancaria" class="form-control form-control-sm">
                                    <option value="">Selecione</option>
                                    <?php
                                    foreach ($agenciasBancarias as $agencia) {
                                        echo '<option value="' . $agencia['id'] . '">' . $agencia['ag_nome'] . '</option>';
                                    }
                                    ?>
                                </select>
                            </div>
                            <div class="form-group col-md-12">
                                <label>Observações</label>
                                <textarea name="observacao_recebimento" class="form-control" rows="2" placeholder="Ex: Pagamento da 1º parcela..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                            <button type="submit" class="btn btn-success">Registrar</button>
                        </div>
                </form>
            </div>
        </div>
    </div>


    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js"></script>

    <script>
        $(document).ready(function() {
            const subgrupos = <?= json_encode($subgrupos, JSON_NUMERIC_CHECK) ?>;

            function popularSubgrupos(grupoId, selectSubgrupo, subgrupoSelecionadoId = null) {
                const subgruposFiltrados = subgrupos.filter(sg => sg.id_grupo === grupoId);
                $(selectSubgrupo).empty().append('<option value="">Selecione...</option>');
                subgruposFiltrados.forEach(sg => {
                    const selected = sg.id === subgrupoSelecionadoId ? ' selected' : '';
                    $(selectSubgrupo).append(`<option value="${sg.id}"${selected}>${sg.nome}</option>`);
                });

            }

            $('#select_grupo').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#select_subgrupo');
            });

            $('#edit_id_grupo').on('change', function() {
                popularSubgrupos(parseInt($(this).val(), 10), '#edit_id_subgrupo');
            });


            function validarPercentual(formSelector, totalSelector, buttonSelector) {
                let total = 0;
                $(`${formSelector} .percent-input`).each(function() {
                    total += parseInt($(this).val(), 10) || 0;
                });

                $(totalSelector).text('Total: ' + total + '%');
                const isSuccess = (total === 100);


                $(totalSelector).toggleClass('text-danger', !isSuccess);
                $(totalSelector).toggleClass('text-success', isSuccess);;
                $(buttonSelector).prop('disabled', !isSuccess);
            }

            $('#form-add-conta .percent-input').on('input', () => validarPercentual('#form-add-conta', '#percent-total', '#btn-salvar'));
            $('#form-edit-conta .percent-input').on('input', () => validarPercentual('#form-edit-conta', '#edit-percent-total', '#edit-btn-salvar'));

            // --- Modal: Registrar Recebimento ---
            $('.btn-registrar-recebimento').on('click', function() {
                const id = $(this).data('id');
                const descricao = $(this).data('descricao');
                const saldo = $(this).data('saldo');
                const vencimento = $(this).data('vencimento');
                const nome_cliente = $(this).data('nome_cliente');
                const valor_total = $(this).data('valor_total');
                const valor_recebido = $(this).data('valor_recebido');

                // Preenche os campos do modal 
                $('#rec_id_conta').val(id);
                $('#rec_cliente').text(nome_cliente);
                $('#rec_descricao').text(descricao);
                $('#rec_vencimento').text(vencimento);
                $('#rec_saldo').text(saldo);
                $('#rec_total').text(valor_total);
                $('#rec_recebido').text(valor_recebido);

            });

            // --- Modal: Editar Conta a Receber (BLOCO CORRIGIDO) ---
            $('.btn-edit-conta-receber').on('click', function() {
                const id = $(this).data('id');
                const id_cliente = $(this).data('id_cliente');
                const descricao = $(this).data('descricao');
                const valor_total = $(this).data('valor_total');
                const vencimento = $(this).data('vencimento');
                const unidade_negocio = $(this).data('unidade_negocio');
                const id_grupo = parseInt($(this).data('id_grupo'), 10);
                const id_subgrupo = parseInt($(this).data('id_subgrupo'), 10);
                const id_classificacao = $(this).data('id_classificacao');
                const id_tipo_documento = $(this).data('id_tipo_documento');
                const p_ti = $(this).data('percentual_ti');
                const p_devops = $(this).data('percentual_devops');
                const p_mkt = $(this).data('percentual_marketing');

                const isRecorrente = $(this).data('is_recorrente') == 1;

                $('#edit_id_conta').val(id);
                $('#edit_id_cliente').val(id_cliente);
                $('#edit_descricao').val(descricao);
                $('#edit_valor_total').val(valor_total);
                $('#edit_data_vencimento').val(vencimento);
                $('#edit_unidade_negocio').val(unidade_negocio);
                $('#edit_id_classificacao').val(id_classificacao);
                $('#edit_id_tipo_documento').val(id_tipo_documento);
                $('#edit_percent_ti').val(p_ti);
                $('#edit_percent_devops').val(p_devops);
                $('#edit_percent_marketing').val(p_mkt);
                $('#edit_salvar_recorrencia').prop('checked', isRecorrente);

                $('#edit_id_grupo').val(id_grupo);
                popularSubgrupos(id_grupo, '#edit_id_subgrupo', id_subgrupo);

                validarPercentual('#form-edit-conta', '#edit-percent-total', '#edit-btn-salvar');

            });

            // --- Modal: Excluir Conta / excluir recorrencia ---

            $('.btn-excluir').on('click', function() {
                const id = $(this).data('id');
                const descricao = $(this).data('descricao');
                const isRecorrente = $(this).data('recorrente') == 1;

                if (isRecorrente) {
                    // Se for recorrente, preenche e abre o modal complexo
                    $('#excluir_id_com_rec').val(id);
                    $('#excluir_desc_com_rec').text(descricao);
                    $('#checkExcluirRecorrencia').prop('checked', false); // Sempre começa desmarcado
                    $('#modalExcluirComRecorrencia').modal('show');
                } else {
                    // Se não for, preenche e abre o modal simples
                    $('#excluir_id_simples').val(id);
                    $('#excluir_desc_simples').text(descricao);
                    $('#modalExcluirSimples').modal('show');
                }
            });


            $('.btn-exibir-recebimentos').on('click', function() {
                const contaId = $(this).data('id');
                const contaDescricao = $(this).data('descricao');
                const nomeCliente = $(this).data('nome_cliente');

                const modalBody = $('#lista_recebimentos_body');
                const modalTituloDisplay = $('#rec_detalhe_titulo');
                const modalTitulo = $('#rec_detalhe_titulo');
                const agenciasBancarias = <?= json_encode($agenciasBancarias) ?>;

                // modalTitulo.text(contaDescricao);
                modalTituloDisplay.text(nomeCliente || 'Cliente não informado');
                modalBody.html('<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>');

                $('#modalExibirRecebimento').modal('show');

                $.post('contas_receber.php', {
                    action: 'get_recebimentos',
                    id_conta: contaId
                }, function(response) {
                    if (response.success && response.data.length > 0) {
                        modalBody.empty();

                        response.data.forEach(function(rec) {
                            const valorFormatado = parseFloat(rec.valor_recebido).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            });
                            const dataFormatada = new Date(rec.data_recebimento).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });

                            const opcoesAgencia = agenciasBancarias.map(ag => {
                                const isSelected = ag.id == rec.id_agBancaria ? 'selected' : '';
                                return `<option value="${ag.id}" ${isSelected}>${ag.ag_nome}</option>`;
                            }).join('');

                            modalBody.append(`
                    <tr data-id="${rec.id_recebimento}">
                        <td>${dataFormatada}</td>
                        <td class="text-right">
                            <input type="number" step="0.01" class="form-control form-control-sm valor-recebido" value="${rec.valor_recebido}">
                        </td>
                        <td>
                            <select class="form-control form-control-sm agencia" name="id_agBancaria">
                                <option value="">${rec.ag_nome}</option>
                                ${opcoesAgencia}
                            </select>
                        </td>  
                        <td>  
                            <input type="text" class="form-control form-control-sm observacao mt-1" value="${rec.observacao || ''}" placeholder="Observação">
                            </td> 
                        <td class="text-center">
                            <button class="btn btn-sm btn-success btn-salvar-recebimento">Salvar</button>
                            <button class="btn btn-sm btn-danger btn-excluir-recebimento">Excluir</button>
                        </td>
                    </tr>
                `);
                        });

                    } else {
                        modalBody.html('<tr><td colspan="5" class="text-center text-muted">Nenhum recebimento registrado para esta conta.</td></tr>');
                    }
                }, 'json').fail(function() {
                    modalBody.html('<tr><td colspan="5" class="text-center text-danger">Erro ao carregar os dados. Tente novamente.</td></tr>');
                });
            });


            // Salvar alterações
            $(document).on('click', '.btn-salvar-recebimento', function() {
                const row = $(this).closest('tr');
                const idRecebimento = row.data('id');
                const valor = row.find('.valor-recebido').val();
                const idAgencia = row.find('.agencia').val();
                const observacao = row.find('.observacao').val();

                $.post('contas_receber.php', {
                    action: 'editar_recebimento',
                    id_recebimento: idRecebimento,
                    valor: valor,
                    id_agencia: idAgencia,
                    observacao: observacao
                }, function(resp) {
                    if (resp.success) {
                        window.location.reload();
                        alert('Recebimento atualizado!');
                    } else {
                        alert('Erro ao atualizar recebimento!');
                    }
                }, 'json');
            });

            // Excluir recebimento
            let bloqueioRecorrente = false;
            let bloqueioSimples = false;

            $('.btn-excluir').on('click', function() {
                const id = $(this).data('id');
                const descricao = $(this).data('descricao');
                const isRecorrente = $(this).data('recorrente') == 1;
                const valorTotal = parseFloat($(this).data('valor-total')) || 0;
                const saldo = parseFloat($(this).data('saldo')) || 0;

                const bloqueado = (valorTotal - saldo) > 0.01;


                if (isRecorrente) {
                    // modal recorrente
                    $('#excluir_id_com_rec').val(id);
                    $('#excluir_desc_com_rec').text(descricao);
                    $('#checkExcluirRecorrencia').prop('checked', false);

                    bloqueioRecorrente = bloqueado;

                    $('#modalExcluirComRecorrencia').modal('show');
                } else {
                    // modal simples
                    $('#excluir_id_simples').val(id);
                    $('#excluir_desc_simples').text(descricao);

                    bloqueioSimples = bloqueado;

                    $('#modalExcluirSimples').modal('show');
                }
            });


            // =========================
            // exclusao de conta RECORRENTE
            // =========================
            $('#modalExcluirComRecorrencia').on('shown.bs.modal', function() {
                console.log('Modal recorrente aberto. bloqueioRecorrente =', bloqueioRecorrente);

                if (bloqueioRecorrente) {
                    $('#titulo_modal_rec').text('Exclusão bloqueada');
                    $('#aviso_bloqueio_rec').show();
                    $('#corpo_normal_rec').hide();
                    $('#btn_excluir_rec').hide();
                    $('#btn_cancelar_rec').text('Fechar');
                } else {
                    $('#titulo_modal_rec').text('Confirmar Exclusão');
                    $('#aviso_bloqueio_rec').hide();
                    $('#corpo_normal_rec').show();
                    $('#btn_excluir_rec').show();
                    $('#btn_cancelar_rec').text('Cancelar');
                }
            });

            $('#modalExcluirComRecorrencia').on('hidden.bs.modal', function() {
                $('#titulo_modal_rec').text('Confirmar Exclusão');
                $('#aviso_bloqueio_rec').hide();
                $('#corpo_normal_rec').show();
                $('#btn_excluir_rec').show();
                $('#btn_cancelar_rec').text('Cancelar');
                $('#checkExcluirRecorrencia').prop('checked', false);

                bloqueioRecorrente = false;
            });


            // =========================
            // exclusao de conta SIMPLES
            // =========================
            $('#modalExcluirSimples').on('shown.bs.modal', function() {
                console.log('Modal simples aberto. bloqueioSimples =', bloqueioSimples);

                if (bloqueioSimples) {
                    $('#titulo_modal_simples').text('Exclusão bloqueada');
                    $('#aviso_bloqueio_simples').show();
                    $('#corpo_normal_simples').hide();
                    $('#btn_excluir_simples').hide();
                    $('#btn_cancelar_simples').text('Fechar');
                } else {
                    $('#titulo_modal_simples').text('Confirmar Exclusão');
                    $('#aviso_bloqueio_simples').hide();
                    $('#corpo_normal_simples').show();
                    $('#btn_excluir_simples').show();
                    $('#btn_cancelar_simples').text('Cancelar');
                }
            });

            $('#modalExcluirSimples').on('hidden.bs.modal', function() {
                $('#titulo_modal_simples').text('Confirmar Exclusão');
                $('#aviso_bloqueio_simples').hide();
                $('#corpo_normal_simples').show();
                $('#btn_excluir_simples').show();
                $('#btn_cancelar_simples').text('Cancelar');

                bloqueioSimples = false;
            });

            jQuery.fn.dataTable.ext.type.order['date-br-pre'] = function(d) {
                if (!d) return 0;
                // Divide a data "10/11/2025" em [10, 11, 2025]
                var parts = d.split('/');
                if (parts.length < 3) return 0;
                // Retorna "20251110" (YYYYMMDD), que é um número que o DataTables sabe ordenar
                return parts[2] + parts[1] + parts[0];
            };

            // Plugin para "ensinar" o DataTables a ordenar moeda (ex: "R$ 14.835,32")
            jQuery.fn.dataTable.ext.type.order['num-fmt-pre'] = function(d) {
                if (typeof d !== 'string') return 0;
                // Remove "R$", tira os pontos "." e troca a vírgula "," por um ponto decimal "."
                var num = d.replace(/R\$\s*/, '').replace(/\./g, '').replace(/,/, '.');
                // Converte o texto "14835.32" para um número
                return parseFloat(num) || 0;
            };



            // tabelas do modal
            var dataTableOptions = {
                "language": {
                    "url": "https://cdn.datatables.net/plug-ins/1.10.25/i18n/Portuguese-Brasil.json"
                },
                "paging": false,
                "searching": false,
                "info": false,
                "order": [
                    [3, "desc"]
                ],
                "columnDefs": [
                    // Colunas 1 (Status):
                    {
                        "orderable": false,
                        "targets": 1
                    },

                    // Coluna 2 (Vencimento):
                    {
                        "type": "date-br",
                        "targets": 2
                    },

                    // Coluna 3 (Saldo):
                    {
                        "type": "num-fmt",
                        "targets": 3
                    }
                ]
            };

            $('#tabelaPendentesFiltradas').DataTable(dataTableOptions);
            $('#tabelaInadimplentesGlobal').DataTable(dataTableOptions);


            $('#modalResumoFiltro').on('shown.bs.modal', function(e) {
                $($.fn.dataTable.tables(true)).DataTable().columns.adjust();
            });



            window.setTimeout(function() {
                $(".alert").fadeOut(500, function() {
                    $(this).remove();
                });
            }, 3000);
        });
    </script>


</body>

</html>