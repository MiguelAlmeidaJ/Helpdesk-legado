<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

if (isset($_POST['mkt_atd'])) {
    $mkt_atd = $_POST['mkt_atd'];
} else {
    echo "<div class='alert alert-warning'>Tarefa nao encontrada.</div>";
}

//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_tarefa_interacao = true;
$exibe_bt_tarefa_aceitar = false;
$exibe_bt_tarefa_devolver = false;
$exibe_bt_tarefa_espera = false;
$exibe_bt_tarefa_finalizar = false;
$exibe_bt_tarefa_retomar = false;

if ($m7_00 == 0) {
    header("Location: ../index.php");
}

// Conexão com o banco MKT
$pdoMkt = ConnectionMkt();
if (!$pdoMkt) {
    exit("Erro ao conectar ao banco de dados.");
}


if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'tarefa_finalizar') {


    $task_id = (int) $_POST['tarefa'];
    $descricao_encerramento = trim($_POST['desc_fechamento']);
    $staff_id = $user_id;
    $status_completo = 5; // ID do status "Completo"

    // Buscar a tarefa
    $stmt = $pdoMkt->prepare("SELECT rel_type, rel_id, name, visible_to_client, status FROM tbltasks WHERE id = ?");
    $stmt->execute([$task_id]);
    $task = $stmt->fetch(PDO::FETCH_OBJ);

    if (!$task) {
        die("Tarefa não encontrada.");
    }

    // Verifica se já está completa
    if ($task->status == $status_completo) {
        echo "Tarefa já está finalizada.";
        exit;
    }

    // Insere comentário antes de qualquer alteração
    if (!empty($descricao_encerramento)) {
        $stmt = $pdoMkt->prepare("INSERT INTO tbltask_comments (content, taskid, staffid, dateadded) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$descricao_encerramento, $task_id, $staff_id]);
    }

    // Atualiza status e data de finalização
    $stmt = $pdoMkt->prepare("UPDATE tbltasks SET status = ?, datefinished = NOW() WHERE id = ?");
    $stmt->execute([$status_completo, $task_id]);

    // Pega nomes dos status antigo e novo
    $stmt = $pdoMkt->prepare("SELECT id, name FROM tbltask_statuses WHERE id IN (?, ?)");
    $stmt->execute([$task->status, $status_completo]);
    $status_nomes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $nome_status_antigo = '';
    $nome_status_novo = '';
    $tipo_inter = null;

    foreach ($status_nomes as $s) {
        if ($s['id'] == $task->status) {
            $nome_status_antigo = $s['name'];
        }
        if ($s['id'] == $status_completo) {
            $nome_status_novo = $s['name'];
            switch ($s['id']) {
                case 1:
                case 54:
                case 50:
                    $tipo_inter = 1;
                    break;
                case 4:
                case 5:
                    $tipo_inter = 2;
                    break;
                case 51:
                    $tipo_inter = 3;
                    break;
                case 3:
                case 2:
                case 53:
                case 52:
                    $tipo_inter = 4;
                    break;
            }
        }
    }

    // Texto completo com o comentário
    $interacao = "Alterou o Status de {$nome_status_antigo} para {$nome_status_novo}.";
    if (!empty($descricao_encerramento)) {
        $interacao .= "<br><strong>Finalizado:</strong> {$descricao_encerramento}";
    }

    // Insere log de interação
    $stmt = $pdoMkt->prepare("INSERT INTO tblactivity_log_interacao (taskid, interacao, staffid, alterado_em, tipo_inter) VALUES (?, ?, ?, NOW(), ?)");
    $stmt->execute([$task_id, $interacao, $staff_id, $tipo_inter]);

    // Encerra timers
    $stmt = $pdoMkt->prepare("UPDATE tbltaskstimers SET end_time = UNIX_TIMESTAMP() WHERE task_id = ? AND end_time IS NULL");
    $stmt->execute([$task_id]);

    $mkt_atd = (int) $_POST['tarefa'] ?? null;

    echo "<script>
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = 'mkt_atd.php'; // ou a URL desejada
    
    // Cria o input hidden com o valor da variável PHP
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'mkt_atd';
    input.value = $mkt_atd;
    
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
</script>";
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'tarefa_new_inter') {

    $task_id = (int) $_POST['tarefa'];
    $descricao_interacao = trim($_POST['inter_desc']);
    $staff_id = $user_id; // ou $_SESSION['staffid'], dependendo de como você identifica o usuário
    $token = $_POST['token']; // Verifique a validade do token conforme a segurança necessária

    // Buscar a tarefa
    $stmt = $pdoMkt->prepare("SELECT id, name FROM tbltasks WHERE id = ?");
    $stmt->execute([$task_id]);
    $task = $stmt->fetch(PDO::FETCH_OBJ);

    if (!$task) {
        die("Tarefa não encontrada.");
    }

    // Insere comentário na tabela tbltask_comments
    if (!empty($descricao_interacao)) {
        $stmt = $pdoMkt->prepare("INSERT INTO tbltask_comments (content, taskid, staffid, dateadded) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$descricao_interacao, $task_id, $staff_id]);
    }

    $mkt_atd = (int) $_POST['tarefa'] ?? null;


    // var_dump($mkt_atd);


    echo "<script>
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = 'mkt_atd.php'; // ou a URL desejada
    
    // Cria o input hidden com o valor da variável PHP
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'mkt_atd';
    input.value = $mkt_atd;
    
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
</script>";
    exit;
}


?>

<!doctype html>
<html lang="pt-BR">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/timeline.css">
    <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">

    <title>Allterus</title>
    <style>
        body {
            zoom: 0.9;
            width: 100%;
            overflow-x: hidden;
        }

        .carregando,
        .carregando2,
        .carregando3,
        .carregando4 {
            color: #ff0000;
            display: none;
        }

        #catalogOptions {
            position: absolute;
            top: 100%;
            margin-left: 170px;
            z-index: 1000;
        }

        .catalog-item {
            cursor: pointer;
        }
    </style>
</head>

<body>
    <?php include_once("../all/sidebar.php"); ?>

    <?php
    $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $mkt_atd = filter_input(INPUT_POST, 'mkt_atd', FILTER_SANITIZE_NUMBER_INT);

    if (isset($mkt_atd)) {
        $consultaTarefa = $pdoMkt->prepare("
                SELECT 
                    t.id, t.name AS titulo, t.description, t.dateadded, t.startdate, t.duedate, t.datefinished,
                    t.priority, t.status, t.rel_type, t.rel_id,
                    s.firstname, s.lastname, 
                    c.company AS cliente_nome,
                    c.phonenumber AS telefone,
                    c.address AS endereco,
                    c.city AS cidade, 
                    c.state AS estado,
                    ts.name AS status_nome,
                    grupo.value AS grupo,
                    subgrupo.value AS subgrupo
                    FROM tbltasks t
                LEFT JOIN tbltask_assigned ta ON ta.taskid = t.id
                LEFT JOIN tblstaff s ON s.staffid = ta.staffid
                LEFT JOIN tblcustomfieldsvalues grupo ON grupo.relid = t.id AND grupo.fieldid = 6
                LEFT JOIN tblcustomfieldsvalues subgrupo ON subgrupo.relid = t.id AND subgrupo.fieldid = 7
                LEFT JOIN tbltask_statuses ts ON ts.id = t.status
                LEFT JOIN tblclients c ON t.rel_type = 'customer' AND c.userid = t.rel_id
                WHERE t.id = :id
            ");
        $consultaTarefa->bindParam(':id', $mkt_atd, PDO::PARAM_INT);
        $consultaTarefa->execute();
        $tarefa = $consultaTarefa->fetch(PDO::FETCH_ASSOC);

        if ($tarefa) {
    ?>

            <div class="container-fluid">
                <div class="row mt-2">
                    <div class="col-md-3 px-1">

                        <div class="card">
                            <div class="card-header py-1 h6 pt-2 pb-2">
                                <i class="fas fa-headset text-danger"></i> Demanda #<?php echo str_pad($tarefa['id'], 5, '0', STR_PAD_LEFT); ?>
                            </div>

                            <div class="card-body pt-1 pl-0 pr-0">
                                <ul class="list-unstyled">
                                    <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-building mr-2"></i><?php echo $tarefa['cliente_nome'] ?></li>
                                    <li class="pl-2 mt-0 d-flex align-items-center">
                                        <i class="far fa-building small ml-3 pl-3 mr-2"></i>
                                        <small><?php echo "{$tarefa['endereco']} - {$tarefa['cidade']} - {$tarefa['estado']}"; ?></small>
                                    </li>
                                    <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-mobile-alt small ml-3 pl-3 mr-2"></i></i>
                                        <small><?php echo $tarefa['telefone'] ?></small>
                                    </li>

                                    <hr class="p-0 mt-1 mb-0">
                                    <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-user-tie mr-2"></i> <?php echo $tarefa['firstname'] . ' ' . $tarefa['lastname'] ?></li>

                                    <hr class="p-0 mt-2 mb-0">
                                    <li class="mt-1 align-items-center">
                                        <div class="row px-0 mx-0 ">
                                            <div class="col-10 pt-1 small">
                                                <strong>Classificação da Demanda:</strong>
                                            </div>
                                            <?php if ($m3_01 == 3) { ?>
                                                <div class="col-2 text-right">
                                                    <button type="button" class="btn btn-outline-secondary btn-sm small" data-toggle="modal" data-target="#atd_edt"> <i class="far fa-edit"></i></button>
                                                </div>
                                            <?php } ?>
                                        </div>
                                    </li>
                                    <hr class="p-0 mt-1 mb-0">

                                    <!-- inicio exibindo prioridade -->
                                    <li class="pl-2 mt-1 d-flex align-items-center">
                                        <i class="fas fa-exclamation-circle mr-2"></i>
                                        Prioridade:
                                        <?php if ($tarefa['priority'] == 0) { ?>
                                            <span class="badge badge-secondary"> NA</span>
                                        <?php } elseif ($tarefa['priority'] == 1) { ?>
                                            <span class="badge badge-success"> Baixa</span>
                                        <?php } elseif ($tarefa['priority'] == 2) { ?>
                                            <span class="badge badge-warning"> Média</span>
                                        <?php } elseif ($tarefa['priority'] == 3) { ?>
                                            <span class="badge badge-alert" style="color: black; background-color: #FF8C00;"> Alta</span> <!-- Laranja mais forte -->
                                        <?php } elseif ($tarefa['priority'] == 4) { ?>
                                            <span class="badge badge-danger"> Urgente</span>
                                        <?php } ?>
                                    </li>

                                    <!-- fim exibindo prioridade -->

                                    <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-archive mr-2"></i><?php echo $tarefa['grupo']; ?></li>
                                    <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-folder-open ml-3 mr-2"></i><?php echo $tarefa['subgrupo']; ?></li>

                            </div>

                        </div>
                    </div>


                    <!-- card central Ações -->

                    <div class="col-md-6 px-1">
                        <div class="card">
                            <div class="h6 card-header py-1">
                                <div class="row">
                                    <div class="col-6 h6 pt-2 mb-0">
                                        <i class="fas fa-check"></i> Ações
                                    </div>
                                    <div class="col-6 text-right px-0">
                                        <?php if ($tarefa['status'] == 54) { ?>
                                            <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Atendimento Em Standby </button>
                                        <?php } ?>
                                        <?php if ($tarefa['status'] == 1) { ?>
                                            <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Atendimento Não Iniciado </button>
                                        <?php } ?>
                                        <?php if ($tarefa['status'] == 4) { ?>
                                            <button type="button" class="btn btn-primary btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Atendimento em Progresso </button>
                                        <?php } ?>
                                        <?php if ($tarefa['status'] == 2) { ?>
                                            <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Aguardando Aprovação Interna </button>
                                        <?php } ?>
                                        <?php if ($tarefa['status'] == 53) { ?>
                                            <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Aguardando Aprovação do Cliente </button>
                                        <?php } ?>
                                        <?php if ($tarefa['status'] == 50) { ?>
                                            <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Enviar ao Time de Designer </button>
                                        <?php } ?>
                                        <?php if ($tarefa['status'] == 5) { ?>
                                            <button type="button" class="btn btn-success btn-sm btn-block text-center text-dark"> <i class="fas fa-check"></i> Completa </button>
                                        <?php } ?>
                                    </div>
                                </div>
                            </div>

                            <div class="card-body py-1">

                                <div class="form-row">
                                    <div class="form-group col-sm-4 col-md-4">
                                        <label class="my-0 small">Abertura:</label>
                                        <input class="form-control form-control-sm" value="<?php echo date('d/m/y H:i', strtotime($tarefa['startdate'])); ?>" disabled="">
                                    </div>
                                    <div class="form-group col-sm-4 col-md-4">
                                        <label class="my-0 small">Prazo:</label>
                                        <input class="form-control form-control-sm" value="<?php echo date('d/m/y H:i', strtotime($tarefa['duedate'])); ?>" disabled="">
                                    </div>

                                    <div class="form-group col-sm-4 col-md-4">
                                        <label class="my-0 small">Tecnico:</label>
                                        <input class="form-control form-control-sm" value="<?php echo $tarefa['firstname'] . ' ' . $tarefa['lastname'] ?>" disabled="">
                                    </div>

                                </div>

                                <div class="form-row">
                                    <div class="form-group col-sm-12">
                                        <label class="my-0 small">Título:</label>
                                        <input class="form-control form-control-sm" value="<?= $tarefa['titulo'] ?>" disabled="">
                                    </div>
                                </div>

                                <div class="form-row">
                                    <div class="form-group col-sm-12">
                                        <label class="my-0 small">Descrição:</label>
                                        <textarea readonly class="form-control form-control-sm bg-light text-muted" style="white-space: pre-wrap;" rows="5" disabled=""><?= strip_tags($tarefa['description']) ?></textarea>
                                    </div>
                                </div>





                            </div>
                            <div class="card-body py-2">
                                <div class="row">
                                    <?php
                                    if ($tarefa['status'] != 5) {
                                        // $exibe_bt_atd_standby = false;
                                        // $exibe_bt_tarefa_interacao = true;
                                        $exibe_bt_tarefa_finalizar = true;
                                    }
                                    ?>

                                    <?php
                                    if ($tarefa['status'] == 5) {
                                        // $exibe_bt_atd_standby = false;
                                        $exibe_bt_tarefa_interacao = false;
                                        $exibe_bt_tarefa_finalizar = false;
                                    }
                                    ?>

                                    <?php if ($exibe_bt_tarefa_interacao == true) { ?>
                                        <div class="col-3 px-1 pb-1">
                                            <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_new_inter"> <i class="fas fa-headset"></i> Nova Interação </button>
                                        </div>
                                    <?php } ?>

                                    <?php if ($exibe_bt_tarefa_finalizar == true) { ?>
                                        <div class="col-3 px-1">
                                            <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_finalizar"> <i class="far fa-check-circle"></i> Finalizar </button>
                                        </div>
                                    <?php } ?>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3 px-1">
                        <div class="card">
                            <div class="card-header py-1 h6 pt-2 pb-2">
                                <i class="fas fa-list-ol"></i> Histórico da Tarefa #<?php echo str_pad($tarefa['id'], 5, '0', STR_PAD_LEFT); ?>
                            </div>

                            <div class="card-body">
                                <div class="col-md-9 px-0">
                                    <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_search">
                                        <i class="fas fa-filter"></i> Registros de Atendimentos </button>
                                </div>

                                <div class="timeline">
                                    <?php
                                    //sql para buscar as interacoes
                                    $interacoes = $pdoMkt->prepare("
                                    SELECT i.*, CONCAT(s.firstname, ' ', s.lastname) AS staff_nome
                                        FROM 
                                        tblactivity_log_interacao i
                                        LEFT JOIN tblstaff s ON s.staffid = i.staffid
                                        WHERE i.taskid = :taskid
                                        ORDER BY i.alterado_em DESC
                                    ");
                                    $interacoes->execute([':taskid' => $tarefa['id']]);


                                    while ($interacao = $interacoes->fetch(PDO::FETCH_ASSOC)) {
                                        $inter_data = $interacao["alterado_em"];
                                        $inter_desc = $interacao["interacao"];
                                        $inter_user = $interacao["staff_nome"];
                                        $inter_tipo = $interacao["tipo_inter"];

                                        //define cores de acordo com o tipo da interatividade
                                        if ($inter_tipo == 1) {
                                            $tl_dot_color = "b-primary";
                                            $tl_active_color = "active-primary";
                                        } //1 = Abertura de Atendimento
                                        if ($inter_tipo == 2) {
                                            $tl_dot_color = "b-success";
                                            $tl_active_color = "active-success";
                                        } //2 = Aceite de Atendimento
                                        if ($inter_tipo == 3) {
                                            $tl_dot_color = "b-danger";
                                            $tl_active_color = "active-danger";
                                        } //3 = Devolução de Atendimento
                                        if ($inter_tipo == 4) {
                                            $tl_dot_color = "b-warning";
                                            $tl_active_color = "active-warning";
                                        } //4 = Transferência de Atendim
                                        if ($inter_tipo == 5) {
                                            $tl_dot_color = "b-danger";
                                            $tl_active_color = "active-danger";
                                        } //5 = Envio para espera
                                        if ($inter_tipo == 6) {
                                            $tl_dot_color = "b-primary";
                                            $tl_active_color = "active-primary";
                                        } //6 = Retomada do atendimento
                                        if ($inter_tipo == 7) {
                                            $tl_dot_color = "b-primary";
                                            $tl_active_color = "active-primary";
                                        } //7 = Interação com o solicita
                                        if ($inter_tipo == 8) {
                                            $tl_dot_color = "b-success";
                                            $tl_active_color = "active-success";
                                        } //8 = Conclusão de Atendimento
                                        if ($inter_tipo == 9) {
                                            $tl_dot_color = "b-danger";
                                            $tl_active_color = "active-danger";
                                        } //9 = Edição da classificação do Atendimento
                                        if ($inter_tipo == 10) {
                                            $tl_dot_color = "b-warning";
                                            $tl_active_color = "active-warningr";
                                        } //10 = Concluído
                                    ?>

                                        <div class="tl-item <?php echo $tl_active_color; ?>">
                                            <div class="tl-dot <?php echo $tl_dot_color; ?>"></div>
                                            <div class="tl-content">
                                                <div class="tl-date text-muted"><i class="far fa-user"></i> <?php echo $inter_user; ?> <i class="far fa-clock"></i> <?php echo $dt1 = date('d/m/y H:i', strtotime($inter_data)); ?></div>
                                                <div class=""><?php echo $inter_desc; ?> </div>
                                            </div>
                                        </div>
                                    <?php } ?>
                                    <?php
                                    // Buscar dados da criação da tarefa
                                    $tarefa_criacao = $pdoMkt->prepare("
                                    SELECT t.dateadded, CONCAT(s.firstname, ' ', s.lastname) AS staff_nome
                                        FROM tbltasks t
                                        LEFT JOIN tblstaff s ON s.staffid = t.addedfrom
                                        WHERE t.id = :taskid
                                    ");
                                    $tarefa_criacao->execute([':taskid' => $tarefa['id']]);
                                    $criacao = $tarefa_criacao->fetch(PDO::FETCH_ASSOC);

                                    if ($criacao) {
                                        $inter_data = $criacao['dateadded'];
                                        $inter_desc = "Criou a Tarefa.";
                                        $inter_user = $criacao['staff_nome'];
                                        $inter_tipo = 1; // Defina um tipo padrão, se quiser aplicar cor

                                        // Definir as cores (você pode manter sua lógica anterior aqui também)
                                        $tl_dot_color = "b-primary";
                                        $tl_active_color = "active-primary";

                                        echo '
                                            <div class="tl-item ' . $tl_active_color . '">
                                                <div class="tl-dot ' . $tl_dot_color . '"></div>
                                                <div class="tl-content">
                                                    <div class="tl-date text-muted"><i class="far fa-user"></i> ' . $inter_user . ' <i class="far fa-clock"></i> ' . date('d/m/y H:i', strtotime($inter_data)) . '</div>
                                                    <div>' . $inter_desc . '</div>
                                                </div>
                                            </div>
                                        ';
                                    }


                                    ?>
                                </div>

                            </div>
                        </div>
                    </div>


                    <!-- MODAL NOVA INTERAÇÃO -->
                    <div class="modal fade" id="tarefa_new_inter" tabindex="-1" role="dialog">
                        <div class="modal-dialog" role="document">
                            <div class="modal-content">
                                <form action="#" method="POST">
                                    <div class="modal-header">
                                        <h6 class="modal-title"> <i class="fas fa-headset text-primary"></i> Nova Interação</h6>
                                        <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                                            <span aria-hidden="true">&times;</span>
                                        </button>
                                    </div>
                                    <div class="modal-body py-1">
                                        <div class="form-row">
                                            <div class="form-group col-sm-12">
                                                <label class="my-0 small">Descrição da interação:</label>
                                                <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <input type="hidden" name="tarefa" value="<?php echo $tarefa['id']; ?>">
                                        <input type="hidden" name="token" value="<?php echo $token; ?>">
                                        <input type="hidden" name="action" value="tarefa_new_inter">
                                        <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                                        <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <?php if ($exibe_bt_tarefa_finalizar == true) { ?>
                        <!-- MODAL FINALIZAR ATENDIMENTO -->
                        <div class="modal fade" id="tarefa_finalizar" tabindex="-1" role="dialog">
                            <div class="modal-dialog" role="document">
                                <div class="modal-content">
                                    <form action="#" method="POST">
                                        <div class="modal-header">
                                            <h6 class="modal-title"><i class="far fa-check-circle text-primary"></i> Finalizar</h6>
                                            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                                                <span aria-hidden="true">&times;</span>
                                            </button>
                                        </div>
                                        <div class="modal-body py-1">
                                            <div class="form-row">
                                                <div class="form-group col-sm-12">
                                                    <label class="my-0 small">Descrição de encerramento:</label>
                                                    <textarea name="desc_fechamento" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="modal-footer">
                                            <input type="hidden" name="tarefa" value="<?php echo $tarefa['id']; ?>">
                                            <input type="hidden" name="token" value="<?php echo $token; ?>">
                                            <input type="hidden" name="action" value="tarefa_finalizar">
                                            <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                                            <button type="submit" class="btn btn-sm btn-primary">Finalizar</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php } ?>

                </div>
            </div>
            </div>
            </div>

    <?php
        } else {
            echo "<div class='alert alert-warning'>Tarefa não encontrada.</div>";
        }
    }
    ?>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

</body>

</body>

</html>