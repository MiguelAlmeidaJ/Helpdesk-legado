<?php

/* session_cache_limiter('public'); */ // works too

session_start();

include_once("../all/seguranca.php");

include_once("../all/conect.php");

include_once("../all/permissoes.php");



if ($m3_00 == 0) {
  header("Location: ../index.php");
}



$hoje = date("Y-m-d");

$mensagem = filter_input(INPUT_POST, 'mensagem', FILTER_SANITIZE_FULL_SPECIAL_CHARS);



$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if ($action == "alterar_senha") {
  include_once("../all/update_senha.php");
}

// STATUS DAS TAREFAS
//0 == agendado
//1 == aguardando execução
//2 == em execução
//3 == em espera
//4 == finalizado
//5 == concluido

//FILTROS

//Todos (10)
//Abertos (11)
//Aguardando (1)
//Em execução (2)
//Em espera (3)
//Finalizado (4)
//Concluído (5)
//Agendados (0)


if (isset($_POST['f_sts'])) {
  $p_sts = $f_sts = $_POST['f_sts'];
} else {
  $f_sts = 11;
}

//Todos
if ($f_sts == 10) {
  $p_sts = "0,1,2,3,4";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 15 DAY)";
}

//Abertos
if ($f_sts == 11) {
  $p_sts = "0,1,2,3";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 90 DAY)";
}

//Aguardando
if ($f_sts == 1) {
  $p_sts = "1";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 60 DAY)";
}

//Em execução
if ($f_sts == 2) {
  $p_sts = "2";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 60 DAY)";
}

//Em espera
if ($f_sts == 3) {
  $p_sts = "3";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 90 DAY)";
}

//Finalizados
if ($f_sts == 4) {
  $p_sts = "4";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 15 DAY)";
}

//Concluidos
if ($f_sts == 5) {
  $p_sts = "5";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 15 DAY)";
}

//Agendados
if ($f_sts == 0) {
  $p_sts = "0";
  $dateInterval = "DATE_SUB(NOW(), INTERVAL 90 DAY)";
}




if (isset($_POST['f_sol'])) {
  $f_sol = $p_sol = $_POST['f_sol'];
} else {
  $f_sol = $p_sol = 0;
}

if ($f_sol == 0) {
  $p_sol = "%";
}



if (isset($_POST['f_clt'])) {
  $f_clt = $p_clt = $_POST['f_clt'];
} else {
  $f_clt = $p_clt = 0;
}

if ($f_clt == 0) {
  $p_clt = "%";
  $p_sol = "%";
}



if (isset($_POST['f_tec'])) {
  $f_tec = $p_tec = $_POST['f_tec'];
} else {
  $f_tec = $p_tec = "all";
}

if ($f_tec == "all") {
  $p_tec = "%";
}

//Moa

if (isset($_POST['f_id'])) {
  $f_id = $p_id = $_POST['f_id'];
} else {
  $f_id = $p_id = "all";
}

if ($f_id == "all") {
  $p_id = "%";
}



//if (isset($_POST['ord'])) {$ord = $_POST['ord'];} else {$ord = "cliente";}

if (isset($_POST['ord'])) {
  $ord = $_POST['ord'];
} else {
  $ord = "status";
}

if ($ord == "id") {
  $order_by = "atendimentos.id DESC";
}

if ($ord == "cliente") {
  $order_by = "clientes.clt_nomer ASC";
}

if ($ord == "abertura") {
  $order_by = "atendimentos.abertura DESC";
}

if ($ord == "tecnico") {
  $order_by = "tecnico_nome ASC";
}

if ($ord == "status") {
  $order_by = "atendimentos.`status` ASC";
}

if ($ord == "nivel") {
  $order_by = "atendimentos.`nivel` DESC";
}

if ($ord == "forma") {
  $order_by = "atendimentos.`forma` DESC";
}



//BUSCA INFORMAÇÕES DE CONFIGURAÇÃO DE TEMPO DE ATENDIMENTO

$pdo = ConnectionN3();

$show = $pdo->prepare("SELECT configuracao.* FROM configuracao");

$show->execute();

$row = $show->fetch(PDO::FETCH_ASSOC);

$tempo_alerta = $row["tempo_alerta"];

$sla_n1 = $row["sla_n1"];

$sla_n2 = $row["sla_n2"];

$sla_n3 = $row["sla_n3"];

$sla_n4 = $row["sla_n4"];

$sla_n5 = $row["sla_n5"];

$sla_n6=$row["sla_n12"];





?>

<?php

header("Refresh:60");

?>

<?php



//BUSCA TODOS OS ATENDIMENTOS QUE ESTÃO AGENDADOS (STATUS = 0)

//COMPARA DATA HORA DO AGENDAMENTO COM DATA HORA ATUAL

//SE DATA HORA ATUAL MAIOR QUE DATA HORA DE AGENDAMENTO

//ALTERA O STATUS DO ATENDIMENTO PARA 1 (AGUARDANDO EXECUÇÃO)

//REGISTRA ALTERAÇÃO NA TABELA DE INTERATIVIDADE

$time_now = date("Y-m-d H:i:s");

$pdo = ConnectionN3();

$show_atd = $pdo->prepare("SELECT atendimentos.id, atendimentos.abertura FROM atendimentos WHERE atendimentos.`status` = '0'");

$show_atd->execute();

while ($exibe = $show_atd->fetch(PDO::FETCH_ASSOC)) {

  $atd = $exibe["id"];

  $atd_agendamento = $exibe["abertura"];

  if (strtotime($time_now) > strtotime($atd_agendamento)) {

    //altera o status do atendimento para 1 (Aguardando execução)

    $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='1' WHERE  `id`='$atd';");

    if ($edt->execute()) {

      //insere o registro de uma nova interação 

      $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$atd', '1', '$time_now', 'Status do atendimento alterado automaticamente para Aguardando Execução.');");

      if ($adc->execute()) {
      } else {

        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";

        $mensagem_cor = "alert-danger";
      }
    }
  }
}

?>

<!doctype html>

<html lang="pt-BR">

<head>

  <meta charset="utf-8">

  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

  <link rel="icon" href="../img/favicon.ico">

  <link rel="stylesheet" href="../css/bootstrap.min.css">

  <link rel="stylesheet" href="../fontawesome/css/all.css">

  <link rel="stylesheet" href="../css/bootstrap-select.min.css">

  <link rel="stylesheet" href="../css/progress_bar.css">

  <link rel="stylesheet" href="../css/blink.css">

  <link rel="stylesheet" href="../css/help.css">

  <title>Allterus</title>

</head>
<style>
body {
  zoom: 0.9; /* Escala o conteúdo sem alterar o contexto de layout */
  width: 100%; /* Mantém o layout responsivo */
  overflow-x: hidden; /* Garante que não haja rolagem horizontal */
}
  

</style>

<body>

  <?php include_once("../all/loading.php"); ?>

  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid">
    <div class="row">
      <div class="col-md-12 mt-2">
        <div class="card">
          <div class="card-header py-1">
            <form action="#" method="POST">
              <div class="form-row align-items-center">
                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Cliente:</label>
                  <select name="f_clt" class="form-control form-control-sm " data-live-search="true" required="required" tabindex="1">
                    <option value="0">Todos os Clientes</option>
                    <?php
                    $pdo = ConnectionN3();
                    $filterEmpresas = null;
                    if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                      $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                    }
                    $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";
                    if ($filterEmpresas) {$sql .= $filterEmpresas;}
                    $sql .= "ORDER BY clientes.clt_nomef ASC";
                    $show_clt = $pdo->prepare($sql);
                    $show_clt->execute();
                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {$clt_id = $exibe["clt_id"];$clt_nome = $exibe["clt_nomef"];
                    ?><option value="<?php echo $clt_id; ?>" 
                    <?php if ($f_clt == $clt_id) {echo " selected";} ?>><?php echo $clt_nome; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <?php //se houver um cliente específico para a pesquisa, mostra a opção de solicitante no filtro

                if ($f_clt > 0) { ?>
                  <div class="col-auto col-form-label-sm">
                    <label class="my-0"> Solicitante:</label>
                    <select name="f_sol" class="form-control form-control-sm " data-live-search="true" required="required" tabindex="1">
                      <option value="0">Todos os Solicitantes</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT pessoas.pessoa_id, pessoas.pessoa_nom FROM pessoas WHERE pessoas.pessoa_clt = '$f_clt' ORDER BY pessoas.pessoa_nom ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $pessoa_id = $exibe["pessoa_id"];
                        $pessoa_nom = $exibe["pessoa_nom"];
                      ?><option value="<?php echo $pessoa_id; ?>" 
                      <?php if ($f_sol == $pessoa_id) {echo " selected";} ?>><?php echo $pessoa_nom; ?></option>
                      <?php } ?>
                    </select>
                  </div>

                <?php } ?>

                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Status:</label>
                  <select name="f_sts" class="form-control form-control-sm" tabindex="2">
                    <option value="10" <?php if (10 == $f_sts) {
                                          echo " selected";
                                        } ?>>Todos</option>
                    <option value="11" <?php if (11 == $f_sts) {
                                          echo " selected";
                                        } ?>>Abertas</option>
                    <option value="1" <?php if (1 == $f_sts) {
                                        echo " selected";
                                      } ?>>Aguardando</option>
                    <option value="2" <?php if (2 == $f_sts) {
                                        echo " selected";
                                      } ?>>Em execução</option>
                    <option value="3" <?php if (3 == $f_sts) {
                                        echo " selected";
                                      } ?>>Em espera</option>
                    <option value="4" <?php if (4 == $f_sts) {
                                        echo " selected";
                                      } ?>>Finalizado</option>
                    <option value="5" <?php if (5 == $f_sts) {
                                        echo " selected";
                                      } ?>>Concluído</option>
                    <option value="0" <?php if (0 == $f_sts) {
                                        echo " selected";
                                      } ?>>Agendados</option>
                  </select>
                </div>

                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> Tecnico:</label>
                  <select name="f_tec" class="form-control form-control-sm " data-live-search="true" required="required" tabindex="3">
                    <option value="all" <?php if ("all" == $f_sts) {echo " selected";} ?>>Todos</option>
                    <option value="0" <?php if (0 == $f_sts) {echo " selected";} ?>>Não determinado</option>
                    <?php
                    $pdo = ConnectionN3();
                    $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios ORDER BY usuarios.user_nome ASC");
                    $show_clt->execute();
                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                      $user_id = $exibe["user_id"];
                      $user_nome = $exibe["user_nome"];
                    ?>
                    <option value="<?php echo $user_id; ?>" 
                      <?php if ($user_id == $f_tec) {echo " selected";} ?>>
                      <?php echo $user_nome; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <div class="col-auto col-form-label-sm">
                  <label class="my-0"> ID:</label>
                  <select name="f_id" class="form-control form-control-sm " data-live-search="true" required="required" tabindex="3">
                    <option value="all" <?php if ("all" == $f_sts) {echo " selected";} ?>>Todos</option>
                    <option value="0" <?php if (0 == $f_sts) {echo " selected";} ?>>Não determinado</option><?php
                    $filterEmpresas = null;

                    if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                      $filterEmpresas .= " WHERE atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
                    }

                    $pdo = ConnectionN3();
                    $sql = "SELECT atendimentos.id FROM atendimentos";

                    if ($filterEmpresas) {$sql .= $filterEmpresas;}

                    $sql .= " ORDER BY atendimentos.id ASC";

                    $show_clt = $pdo->prepare($sql);
                    // aqui vamos filtrar pelo usuario logado
                    $show_clt->execute();
                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                      $id = $exibe["id"];

                    ?><option value="<?php echo $id; ?>" 
                    <?php if ($id == $f_id) {echo " selected";} ?>>
                    <?php echo $id; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <div class="col-auto pt-3">
                  <a href="./srhome.php"><i class="fa fa-toggle-on"></i> Desligar</a>
                </div>
                <div class="col-auto pt-3">
                </div>
                <div class="col-auto pt-3">
                  <button type="submit" class="btn btn-sm btn-primary" tabindex="4">Filtrar</button>
                </div>
              </div>
            </form>
          </div>



          <div class="card-body p-0">

            <table class="table table-hover small">

              <thead>

                <tr>

                  <th class="p-1">

                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="f_id" value="<?php echo $f_id; ?>">
                      <input type="hidden" name="ord" value="id">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> ID</button>
                    </form>
                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="f_id" value="<?php echo $f_id; ?>">
                      <input type="hidden" name="ord" value="cliente">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Cliente</button>
                    </form>

                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="f_id" value="<?php echo $f_id; ?>">
                      <input type="hidden" name="ord" value="abertura">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Abertura</button>
                    </form>
                  </th>

                  <th class="p-1">
                    <button type="submit" class="btn btn-light btn-sm btn-block">Categoria</button>
                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="f_id" value="<?php echo $f_id; ?>">
                      <input type="hidden" name="ord" value="nivel">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i></button>
                    </form>
                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="f_id" value="<?php echo $f_id; ?>">
                      <input type="hidden" name="ord" value="forma">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i></button>
                    </form>
                  </th>

                  <th class="p-1">
                    <button type="submit" class="btn btn-light btn-sm btn-block">Prazo para Conclusão</button>
                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="f_id" value="<?php echo $f_id; ?>">
                      <input type="hidden" name="ord" value="tecnico">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Tecnico</button>
                    </form>
                  </th>

                  <th class="p-1">
                    <form action="#" method="POST">
                      <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                      <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                      <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                      <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                      <input type="hidden" name="f_id" value="<?php echo $f_id; ?>">
                      <input type="hidden" name="ord" value="status">
                      <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Status</button>
                    </form>
                  </th>

                  <th class="p-1"></th>

                </tr>
              </thead>
              <tbody>

                <?php
                $pdo = ConnectionN3();
                $filterEmpresas = null;

                if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                  $filterEmpresas .= " AND atendimentos.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
                }

                
                // MODIFICAÇÃO PARA TENTAR DIMINUIR O TEMPO DE EXECução DO filtro

                // // Define o intervalo de datas (últimos 30 dias)
                // $dateInterval = "DATE_SUB(NOW(), INTERVAL 30 DAY)";

                // se $dateInterval for null, o filtro ficará vazio


                $sql ="SELECT atendimentos.id, atendimentos.cliente, atendimentos.`area`, atendimentos.`tipo`, atendimentos.`local`, atendimentos.nivel, atendimentos.forma, atendimentos.desc_abertura, atendimentos.desc_fechamento, atendimentos.abertura, atendimentos.fechamento, atendimentos.tecnico, atendimentos.reincidente, atendimentos.`status`,
                              clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
                              pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
                              locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
                              categorias.cat_nome,
                              subcategorias.scat_nome,
                              itens.itens_nome,
                              usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
                              FROM atendimentos 
                              INNER JOIN clientes ON clientes.clt_id = atendimentos.cliente
                              LEFT JOIN pessoas ON pessoas.pessoa_id = atendimentos.pessoa
                              LEFT JOIN locais ON locais.local_id = atendimentos.`local`
                              LEFT JOIN categorias ON categorias.cat_id = atendimentos.categoria
                              LEFT JOIN subcategorias ON subcategorias.scat_id = atendimentos.subcategoria
                              LEFT JOIN itens ON itens.itens_id = atendimentos.item
                              LEFT JOIN usuarios ON usuarios.user_id = atendimentos.tecnico
                              WHERE atendimentos.`status` IN ($p_sts)
                              AND clientes.clt_id LIKE '$p_clt'
                              AND atendimentos.tecnico LIKE '$p_tec'  
                              AND atendimentos.pessoa LIKE '$p_sol'  
                              AND atendimentos.id LIKE '$p_id'
                              AND atendimentos.abertura >= $dateInterval"; // Adiciona o filtro de intervalo de datas

                if ($filterEmpresas) {$sql .= $filterEmpresas;
                }
                  $sql .= "ORDER BY $order_by";                
                  $show_atd = $pdo->prepare($sql);                
                  $show_atd->execute();

                while ($row = $show_atd->fetch(PDO::FETCH_ASSOC)) {

                  $atd = $row["id"];
                  $atd_desc_abertura = $row["desc_abertura"];
                  $atd_desc_fechamento = $row["desc_fechamento"];
                  $atd_hora_abertura = $row["abertura"];
                  $atd_hora_fechamento = $row["fechamento"];
                  $atd_reincidente = $row["reincidente"];
                  $atd_status = $row["status"];
                  $atd_tipo = $row["tipo"];
                  if ($atd_tipo == 1) {$atd_tipo = "Falha";}

                  if ($atd_tipo == 2) {
                    $atd_tipo = "Requisição de Serviços";
                  }

                  if ($atd_tipo == 3) {
                    $atd_tipo = "Requisição de informação";
                  }

                  if ($atd_tipo == 4) {
                    $atd_tipo = "Notificação de monitoramento";
                  }

                  if ($atd_tipo == 0) {
                    $atd_tipo = "Não informado";
                  }

                  $atd_nivel = $row["nivel"];

                  if ($atd_nivel == 0) {
                    $atd_niveln = "Não informado";
                    $sla = $sla_n1;
                  }

                  if ($atd_nivel == 1) {
                    $atd_niveln = "Nível 1";
                    $sla = $sla_n1;
                  }

                  if ($atd_nivel == 2) {
                    $atd_niveln = "Nível 2";
                    $sla = $sla_n2;
                  }

                  if ($atd_nivel == 3) {
                    $atd_niveln = "Nível 3";
                    $sla = $sla_n3;
                  }

                  if ($atd_nivel == 4) {
                    $atd_niveln = "Rotina";
                    $sla = $sla_n4;
                  }

                  if ($atd_nivel == 5) {
                    $atd_niveln = "Rotina";
                    $sla = $sla_n5;
                  }

                  if($atd_nivel==6){
                    $atd_niveln ="Tarefa";
                    $sla = $sla_n6;
                  }

                  $atd_forma = $row["forma"];
                  $clt_id = $row["clt_id"];
                  $clt_nomer = $row["clt_nomer"];
                  $clt_nomef = $row["clt_nomef"];
                  $clt_cnpj = $row["clt_cnpj"];
                  $pessoa_nom = $row["pessoa_nom"];
                  $pessoa_cargo = $row["pessoa_cargo"];
                  $pessoa_tel = $row["pessoa_tel"];
                  $pessoa_mail = $row["pessoa_mail"];
                  $local = $row["local"];
                  $local_nom = $row["local_nom"];

                  if ($local == 0) {$local_nom = "Não informado";}
                  $local_end = $row["local_end"];
                  $local_city = $row["local_city"];
                  $local_uf = $row["local_uf"];
                  $cat_nome = $row["cat_nome"];
                  $scat_nome = $row["scat_nome"];
                  $itens_nome = $row["itens_nome"];
                  $tecnico = $row["tecnico"];
                  $tecnico_nome = $row["tecnico_nome"];

                  if ($tecnico == 0) {
                    $tecnico_nome = "Não direcionado";
                  }

                  //TIME TO CLOSE
                  //calcula hora limite para o fechamento do atendimento: Abertura + SLA

                  $time_limit_to_close = date("Y-m-d H:i:s", strtotime($atd_hora_abertura . " +$sla minutes"));

                  //hora atual

                  $time_now = date("Y-m-d H:i:s");
                  $start_date = new DateTime($time_now);

                  //$end_date = new DateTime($time_limit_to_close);



                  //TRABALHA O TEMPO DE ESPERA
                  //SOMA TEMPO TOTAL EM QUE O ATENDIMENTO FICOU EM ESPERA

                  $pdo = ConnectionN3();
                  $show_espera = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, espera_start, espera_end)) AS segundos FROM espera WHERE espera.espera_atd = '$atd'");
                  $show_espera->execute();
                  $conta_espera = $show_espera->rowCount();
                  $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
                  $espera_tempo_total = $exibe_espera["segundos"];

                  //SE NºO TIVER RETORNO, ATRIBUI 0 SEGUNDOS AO TEMPO DE ESPERA

                  if ($espera_tempo_total == "") {
                    $espera_tempo_total = 0;
                  }

                  //SOMA O TEMPO TOTAL DE ESPERA AO PRAZO PARA O FECHAMENTO DO ATENDIMENTO

                  $end_date0 = date("Y-m-d H:i:s", strtotime($time_limit_to_close . " +$espera_tempo_total SECOND"));
                  $end_date = new DateTime($end_date0);



                  //SE ATENDIMENTO ESTIVER EM ESPERA

                  //BUSCA A DATA HORA QUE FOI COLOCADO EM ESPERA

                  //BUSCA A DATA HORA QUE ELE DEVE VOLTAR PARA O ATENDIMENTO

                  if ($atd_status == 3) {
                    $pdo = ConnectionN3();
                    $show_espera = $pdo->prepare("SELECT espera.espera_start, espera.espera_prev FROM espera WHERE espera.espera_atd = '$atd' ORDER BY espera_id DESC LIMIT 0,1");
                    $show_espera->execute();
                    $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
                    $espera_start = $exibe_espera["espera_start"];
                    $espera_prev = $exibe_espera["espera_prev"];



                    //VERIFICA DE DATA HORA ATUAL FOR MAIOR DO QUE DATA HORA PREVISTA PARA RETOMADA
                    //SE POSITIVO:

                    if (strtotime($time_now) > strtotime($espera_prev)) {

                      //MUDA STATUS DO PEDIDO PARA 2 (EM EXECUÇÃO)
                      //ALTERA A INFORMAÇÃO DE ESPERA NA TABELA DE ESPERAS
                      //INSERE REGISTRO DE INTERAÇÃO NA TABELA DE INTERAÇÃO

                      $pdo = ConnectionN3();

                      //altera o status do atendimento para 2 (Em execução)

                      $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='2' WHERE  `id`='$atd';");

                      if ($edt->execute()) {

                      //busca o ID do registro de espera, na tabela espera

                        $show_espera = $pdo->prepare("SELECT espera.espera_id FROM espera WHERE espera.espera_atd = '$atd' ORDER BY espera.espera_id DESC LIMIT 0,1");
                        $show_espera->execute();
                        $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
                        $espera_id = $exibe["espera_id"];



                        //registra A data hora final de espera, na tabela espera

                        $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$time_now' WHERE `espera_id`='$espera_id';");

                        if ($edt_espera->execute()) {

                          //insere o registro de uma nova interação 

                          $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$atd', '1', '$time_now', 'Status do atendimento alterado automaticamente para Em Execução.');");

                          if ($adc->execute()) {
                          } else {

                            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
                            $mensagem_cor = "alert-danger";
                          }
                        } else {

                          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
                          $mensagem_cor = "alert-danger";
                        }
                      } else {

                        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o atendimento!";
                        $mensagem_cor = "alert-danger";
                      }
                    } else {

                      //SE NEGATIVO:
                      //DEFINE A DATA HORA DO INÍCIO DA ESPERA COMO A DATA HORA ATUAL PARA CALCULAR QUANTO TEMPO FALTA PARA ENCERRAR O PRAZO DE ATENDIMENTO 

                      $time_now = $espera_start;
                      $start_date = new DateTime($espera_start);
                    }
                  }


                  //verifica se ainda existe prazo para atendimento

                  if ($start_date < $end_date) {

                    //calcula a diferença entre o prazo de fechamento e a hora atual

                    $interval = $start_date->diff($end_date);
                    $hours   = $interval->format('%h');
                    $minutes = $interval->format('%i');
                    $progress_color = "blue";
                    $tag = $hours . "h " . $minutes . "m";

                    //calcula o tamanho da barra de progresso do chamado

                    $minutos_restantes = $hours * 60 + $minutes;
                    $progress_width = (110 - ($minutos_restantes / 180 * 100));

                    if ($progress_width > 92) {
                      $progress_color = "orange";
                    }
                  } else {

                    $progress_color = "orange";
                    $progress_width = "100";
                    $tag = "Vencido";
                  }

                  //se atendimento concluído

                  if ($atd_status == 4) {
                    $progress_color = "green";
                    $progress_width = "100";
                    $tag = "ok";
                  }



                  //BUSCA A ÚLTIMA INTERAÇÃO QUE HOUVE NO CHAMADO

                  $pdo = ConnectionN3();
                  $show_inter = $pdo->prepare("SELECT interatividade.inter_data FROM interatividade WHERE interatividade.inter_atd = '$atd' AND interatividade.inter_tipo > '0' ORDER BY inter_id DESC LIMIT 0,1");
                  $show_inter->execute();
                  $exibe_inter = $show_inter->fetch(PDO::FETCH_ASSOC);
                  $last_inter_data = isset($exibe_inter["inter_data"]) ? $exibe_inter["inter_data"] : '';
                  $end_date = new DateTime($time_now);
                  $start_date = new DateTime("$last_inter_data");
                  $interval = $start_date->diff($end_date);
                  $hours   = $interval->format('%h');
                  $minutes = $interval->format('%i');
                  $time_last_inter = $hours * 60 + $minutes;
                ?>

                  <tr>
                    <th class="align-middle">
                      <?php echo str_pad($atd, 5, '0', STR_PAD_LEFT); ?>
                      <!-- <button type="button" class="btn btn-outline-light btn-sm" data-container="body" data-toggle="popover" data-trigger="focus" data-placement="right" data-content=""><i class="fas fa-comment-alt text-warning"></i></button> -->
                      <!-- echo $atd_desc_abertura; -->
                      <?php if ($atd_reincidente == 1) { ?>
                        <i class="fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
                      <?php } ?>
                    </th>

                    <td class="align-middle">
                      <strong><?php echo substr($clt_nomer, 0, 35); ?></strong>
                      <?php if ($pessoa_nom != "") { ?> <br> <i class="far fa-user mr-1"></i> <?php echo $pessoa_nom;                                                                                            } ?>
                    </td>

                    <td class="align-middle text-left" style="width: 20%">
                      <?php echo $dt2 = date('H:i', strtotime($atd_hora_abertura)); ?> h
                      <?php echo $dt1 = date('d/m/y', strtotime($atd_hora_abertura)) . " às " . $dt2; ?>
                      <br>
                      <?php echo $atd_desc_abertura; ?>


                    </td>

                    <td class="align-middle text-center" style="width: 20%">
                      <?php echo $cat_nome; ?> <br /> <?php echo $scat_nome; ?> <br /> <?php echo $itens_nome; ?>

                    </td>

                    <th class="align-middle">
                      <?php if ($atd_nivel == 0) { ?> <span class="badge badge-danger"> NA </span> <?php } ?>
                      <?php if ($atd_nivel == 1) { ?> <span class="badge badge-secondary">Nível 1</span> <?php } ?>
                      <?php if ($atd_nivel == 2) { ?> <span class="badge badge-info">Nível 2</span> <?php } ?>
                      <?php if ($atd_nivel == 3) { ?> <span class="badge badge-primary">Nível 3</span> <?php } ?>
                      <?php if ($atd_nivel == 4) { ?> <span class="badge badge-primary">Rotina</span> <?php } ?>                      
                      <?php if ($atd_nivel == 6) { ?> <span class="badge badge-primary">Tarefa</span> <?php } ?>
                    </th>

                    <th class="align-middle">
                      <?php if ($atd_forma == 1) { ?> <i class="fas fa-laptop-house text-primary" title="Remoto"></i> <?php } ?>
                      <?php if ($atd_forma == 2) { ?> <i class="fas fa-briefcase text-danger" title="Presencial"></i> <?php } ?>
                      <?php if ($atd_forma == 3) { ?> <i class="fas fa-laptop-house text-primary" title="Remoto - Plantão"></i> <?php } ?>
                      <?php if ($atd_forma == 4) { ?> <i class="fas fa-briefcase text-danger" title="Presencial - Plantão"></i> <?php } ?>
                    </th>

                    <td class="align-middle">
                      <?php if ($atd_status > 0) { ?>
                        <div class="progress <?php echo $progress_color; ?>">
                          <div class="progress-bar" style="width:<?php echo $progress_width; ?>%;">
                            <div class="progress-value"><?php echo $tag; ?></div>
                          </div>
                        </div>
                      <?php } ?>
                    </td>

                    <td class="align-middle">
                      <?php //se atendimento aberto com mais de 40 minutos e menos de 80 min,sem interação, mostra sino piscando verde
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 0 && $time_last_inter < 20) { ?>
                        <i class="fas fa-bell fa-2x blinkkkk"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 40 minutos e menos de 80 min,sem interação, mostra sino piscando verde
                      if ($atd_status == 1 && $time_last_inter >= 20) { ?>
                        <i class="fas fa-bell fa-2x blinkk"></i>
                      <?php } elseif ($atd_status == 1 && $time_last_inter < 20) { ?>
                        <i class="fas fa-bell fa-2x blinkkkk"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 80 minutos e menos de 120 min,sem interação, mostra sino piscando amarelo
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 20 && $time_last_inter < 40) { ?>
                        <i class="fas fa-bell fa-2x blink"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 120 minutos e menos de 160 min,sem interação, mostra sino piscando vermelho
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 40 && $time_last_inter < 60) { ?>
                        <i class="fas fa-bell fa-2x blinkkk"></i>

                      <?php } ?>

                      <?php //se atendimento aberto com mais de 160 minutos sem interação, mostra sino piscando preto
                      if ($atd_status > 1 && $atd_status < 3 && $time_last_inter >= 60) { ?>
                        <i class="fas fa-bell fa-2x blinkk"></i>

                      <?php } ?>

                      <?php echo $tecnico_nome; ?>
                    </td>

                    <td class="align-middle">

                      <?php if ($atd_status == 0) { ?>
                        <i class="far fa-clock"></i> Agendado

                      <?php } ?>

                      <?php if ($atd_status == 1) { ?>
                        <i class="fas fa-hourglass-half"></i> Aguardando

                      <?php } ?>

                      <?php if ($atd_status == 2) { ?>
                        <i class="fas fa-magic"></i> Em Execução

                      <?php } ?>

                      <?php if ($atd_status == 3) { ?>
                        <i class="far fa-pause-circle"></i> Em Espera

                      <?php } ?>

                      <?php if ($atd_status == 5) { ?>
                        <i class="fas fa-check"></i> Concluído

                      <?php } ?>

                      <?php if ($atd_status == 4) { ?>
                        <i class="fas fa-check"></i> Finalizado

                      <?php } ?>
                    </td>

                    <td class="align-middle p-1">
                      <form action="atd.php" method="POST">
                        <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                        <button type="submit" class="btn btn-light btn-sm p-1"><i class="far fa-folder-open"></i></button>
                      </form>
                    </td>
                  </tr>
                <?php } ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE AJUDA PARA A LISTA DE ATENDIMENTO -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Lista de atendimento</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>

          <div class="modal-body">
            <p><strong>Os atendimentos são marcados com os seguintes status:</strong></p>
            <ul class="list">
              <li><i class="far fa-clock"></i> Agendado
                <ul>
                  <li class="small">São atendimentos cadastrados com Data/Hora futura.</li>
                  <li class="small">Eles podem ser listados na tela através das opçães do filtro.</li>
                  <li class="small">Quando for a Data/Hora do agendamento o Atendimento terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-hourglass-half"></i> Aguardando Execução</span>.</li>
                </ul>
              </li>

              <li class="pt-1"><i class="fas fa-hourglass-half"></i> Aguardando Execução
                <ul>
                  <li class="small">São atendimentos que devem ser executados pelos tecnicos.</li>
                  <li class="small">Cada atendimento tem um prazo para ser atendido.</li>
                  <li class="small">Caso o atendimento fique por mais de 20 minutos sem uma interação, será exibido o seguinte alerta: <i class="fas fa-bell blink"></i>.</li>
                  <li class="small">Quando um técnico iniciar o Atendimento, terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
                </ul>
              </li>

              <li class="pt-1"><i class="fas fa-magic"></i> Em Execução
                <ul>
                  <li class="small">São atendimentos que estão sob responsabilidade de um técnico.</li>
                  <li class="small">O técnico responsóvel tem autonomia para transferir, colocar em espera e finalizar o atendimento.</li>
                </ul>
              </li>

              <li class="pt-1"><i class="far fa-pause-circle"></i> Em Espera
                <ul>
                  <li class="small">São atendimentos que estão aguardando uma resposta de alguém externo a Nível 3.</li>
                  <li class="small">Durante o período de espera o prazo para atendimento é <em>pausado</em>.</li>
                  <li class="small">Toda espera tem um prazo (Data/Hora).</li>
                  <li class="small">Quando o prazo da espera vencer o Atendimento terá seu status alterado automaticamente para <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
                </ul>
              </li>

              <li class="pt-1"><i class="fas fa-check"></i> Finalizada
                <ul>
                  <li class="small">São atendimentos concluídos.</li>
                </ul>
              </li>
            </ul>

            <p><strong>Os atendimentos serão classificados de forma automática como:</strong></p>
            <ul class="list">
              <li><i class="fas fa-exclamation-triangle text-danger"></i> Reincidente
                <ul>
                  <li class="small">Quando já tiver sido registrado um atendimento para o mesmo cliente, a mesma categoria e a mesma sub-categoria em um período de 30 dias.</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <?php if (isset($mensagem)) { ?>
    <div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
      <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
        <?php echo $mensagem; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>

  <?php } ?>

  <?php
    $pdo = ConnectionN3();
    $recor = $pdo->prepare("SELECT * FROM atendimentos WHERE recorrente = '2'");
    $recor->execute();
    $conta_recorrentes = $recor->rowCount();
    if ($conta_recorrentes > 0) {
      /* var_dump($conta_recorrentes); */
      while ($row = $recor->fetch(PDO::FETCH_ASSOC)) {
        $idR = $row["id"];
        $areaR = $row["area"];
        $clienteR = $row["cliente"];
        $pessoaR = $row["pessoa"];
        $localR = $row["local"];
        $tipoR = $row["tipo"];
        $categoriaR = $row["categoria"];
        $subcategoriaR = $row["subcategoria"];
        $itemR = $row["item"];
        $nivelR = $row["nivel"];
        $formaR = $row["forma"];
        $desc_aberturaR = $row["desc_abertura"];
        $aberturaR = $row["abertura"];
        $tecnicoR = $row["tecnico"];
        $reincidenteR = $row["reincidente"];
        $statusR = 0;
        $recorrenteR = $row["recorrente"];
        $data_recorrenteR = $row["data_recorrencia"];
        $vezes_reabrirR = $row["vezes_reabrir"];
        $vezes = $row["vezes"];
        $semana_real = $row["semana"];
        $vezes = $vezes - 1;
        $dia = false;
  
        /*  $dataRRRRRR = new DateTime($data_recorrenteR);
        $dataRRRRRR = $dataRRRRRR->format("Y-m-d"); */
      }
      if ($aberturaR != $data_recorrenteR && $vezes != -1) {
        if ($vezes_reabrirR == 1) {
          $dataRR = new DateTime($data_recorrenteR);
          $dataRR->modify('+1 day');
          $dataRRR = $dataRR->format("Y-m-d H:i:s");
          $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes);");
          $adc->bindParam(':cliente', $clienteR);
          $adc->bindParam(':pessoa', $pessoaR);
          $adc->bindParam(':local', $localR);
          $adc->bindParam(':tipo', $tipoR);
          $adc->bindParam(':categoria', $categoriaR);
          $adc->bindParam(':subcategoria', $subcategoriaR);
          $adc->bindParam(':item', $itemR);
          $adc->bindParam(':nivel', $nivelR);
          $adc->bindParam(':forma', $formaR);
          $adc->bindParam(':desc_abertura', $desc_aberturaR);
          $adc->bindParam(':abertura', $data_recorrenteR);
          $adc->bindParam(':tecnico', $tecnicoR);
          $adc->bindParam(':recorrente', $recorrenteR);
          $adc->bindParam(':data_recorrente', $dataRRR);
          $adc->bindParam(':reincidente', $reincidenteR);
          $adc->bindParam(':status', $statusR);
          $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
          $adc->bindParam(':vezes', $vezes);
          $adc->execute();
        }
        //TODO MES
        elseif ($vezes_reabrirR == 2) {
          $dataRR = new DateTime($data_recorrenteR);
          $dataRR->modify('+1 month');
          $dataRRR = $dataRR->format("Y-m-d H:i:s");
          $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes);");
          $adc->bindParam(':cliente', $clienteR);
          $adc->bindParam(':pessoa', $pessoaR);
          $adc->bindParam(':local', $localR);
          $adc->bindParam(':tipo', $tipoR);
          $adc->bindParam(':categoria', $categoriaR);
          $adc->bindParam(':subcategoria', $subcategoriaR);
          $adc->bindParam(':item', $itemR);
          $adc->bindParam(':nivel', $nivelR);
          $adc->bindParam(':forma', $formaR);
          $adc->bindParam(':desc_abertura', $desc_aberturaR);
          $adc->bindParam(':abertura', $data_recorrenteR);
          $adc->bindParam(':tecnico', $tecnicoR);
          $adc->bindParam(':recorrente', $recorrenteR);
          $adc->bindParam(':data_recorrente', $dataRRR);
          $adc->bindParam(':reincidente', $reincidenteR);
          $adc->bindParam(':status', $statusR);
          $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
          $adc->bindParam(':vezes', $vezes);
          $adc->execute();
        } //3 EM 3 MESES
        elseif ($vezes_reabrirR == 3) {
          $dataRR = new DateTime($data_recorrenteR);
          $dataRR->modify('+3 month');
          $dataRRR = $dataRR->format("Y-m-d H:i:s");
          $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes);");
          $adc->bindParam(':cliente', $clienteR);
          $adc->bindParam(':pessoa', $pessoaR);
          $adc->bindParam(':local', $localR);
          $adc->bindParam(':tipo', $tipoR);
          $adc->bindParam(':categoria', $categoriaR);
          $adc->bindParam(':subcategoria', $subcategoriaR);
          $adc->bindParam(':item', $itemR);
          $adc->bindParam(':nivel', $nivelR);
          $adc->bindParam(':forma', $formaR);
          $adc->bindParam(':desc_abertura', $desc_aberturaR);
          $adc->bindParam(':abertura', $data_recorrenteR);
          $adc->bindParam(':tecnico', $tecnicoR);
          $adc->bindParam(':recorrente', $recorrenteR);
          $adc->bindParam(':data_recorrente', $dataRRR);
          $adc->bindParam(':reincidente', $reincidenteR);
          $adc->bindParam(':status', $statusR);
          $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
          $adc->bindParam(':vezes', $vezes);
          $adc->execute();
        } //6 EM 6 MESES
        elseif ($vezes_reabrirR == 4) {
          $dataRR = new DateTime($data_recorrenteR);
          $dataRR->modify('+6 month');
          $dataRRR = $dataRR->format("Y-m-d H:i:s");
          $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes);");
          $adc->bindParam(':cliente', $clienteR);
          $adc->bindParam(':pessoa', $pessoaR);
          $adc->bindParam(':local', $localR);
          $adc->bindParam(':tipo', $tipoR);
          $adc->bindParam(':categoria', $categoriaR);
          $adc->bindParam(':subcategoria', $subcategoriaR);
          $adc->bindParam(':item', $itemR);
          $adc->bindParam(':nivel', $nivelR);
          $adc->bindParam(':forma', $formaR);
          $adc->bindParam(':desc_abertura', $desc_aberturaR);
          $adc->bindParam(':abertura', $data_recorrenteR);
          $adc->bindParam(':tecnico', $tecnicoR);
          $adc->bindParam(':recorrente', $recorrenteR);
          $adc->bindParam(':data_recorrente', $dataRRR);
          $adc->bindParam(':reincidente', $reincidenteR);
          $adc->bindParam(':status', $statusR);
          $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
          $adc->bindParam(':vezes', $vezes);
          $adc->execute();
        } //12 EM 12 MESES
        elseif ($vezes_reabrirR == 5) {
          $dataRR = new DateTime($data_recorrenteR);
          $dataRR->modify('+12 month');
          $dataRRR = $dataRR->format("Y-m-d H:i:s");
          $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes);");
          $adc->bindParam(':cliente', $clienteR);
          $adc->bindParam(':pessoa', $pessoaR);
          $adc->bindParam(':local', $localR);
          $adc->bindParam(':tipo', $tipoR);
          $adc->bindParam(':categoria', $categoriaR);
          $adc->bindParam(':subcategoria', $subcategoriaR);
          $adc->bindParam(':item', $itemR);
          $adc->bindParam(':nivel', $nivelR);
          $adc->bindParam(':forma', $formaR);
          $adc->bindParam(':desc_abertura', $desc_aberturaR);
          $adc->bindParam(':abertura', $data_recorrenteR);
          $adc->bindParam(':tecnico', $tecnicoR);
          $adc->bindParam(':recorrente', $recorrenteR);
          $adc->bindParam(':data_recorrente', $dataRRR);
          $adc->bindParam(':reincidente', $reincidenteR);
          $adc->bindParam(':status', $statusR);
          $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
          $adc->bindParam(':vezes', $vezes);
          $adc->execute();
        } elseif ($vezes_reabrirR == 6) {
          $dataRR = new DateTime($data_recorrenteR);
          $dataRR->modify('+1 week');
          $dataRRR = $dataRR->format("Y-m-d H:i:s");
          $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes);");
          $adc->bindParam(':cliente', $clienteR);
          $adc->bindParam(':pessoa', $pessoaR);
          $adc->bindParam(':local', $localR);
          $adc->bindParam(':tipo', $tipoR);
          $adc->bindParam(':categoria', $categoriaR);
          $adc->bindParam(':subcategoria', $subcategoriaR);
          $adc->bindParam(':item', $itemR);
          $adc->bindParam(':nivel', $nivelR);
          $adc->bindParam(':forma', $formaR);
          $adc->bindParam(':desc_abertura', $desc_aberturaR);
          $adc->bindParam(':abertura', $data_recorrenteR);
          $adc->bindParam(':tecnico', $tecnicoR);
          $adc->bindParam(':recorrente', $recorrenteR);
          $adc->bindParam(':data_recorrente', $dataRRR);
          $adc->bindParam(':reincidente', $reincidenteR);
          $adc->bindParam(':status', $statusR);
          $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
          $adc->bindParam(':vezes', $vezes);
          $adc->execute();
        } elseif ($vezes_reabrirR == 7) {
          $dataRR = new DateTime($data_recorrenteR);
          $data_dia_original = date_format($dataRR, 'w');
          $data_mes_real = date_format($dataRR, 'm');
          $data_ano_real = date_format($dataRR, 'y');
          $data_dia_real = date_format($dataRR, 'd');
          $dataRR->modify('+1 month');
          $data_mes_2 = date_format($dataRR, 'm');
          $data_ano_2 = date_format($dataRR, 'y');
          $data_dia_2 = date_format($dataRR, 'd');
          $dataRRR = $dataRR->format("Y-m-d H:i:s");
          $dia_mes_2 = date_format(date_create($dataRRR), 'd');
          $semana_mes_2 = ceil($dia_mes_2 / 7);
          $data_dia = date_format($dataRR, 'w');
  
          if ($semana_real == 0) {
            $dia_referencia = $data_dia_real;
            $mes = $data_mes_real;
            $ano = $data_ano_real;
            $referencia = new DateTime("$ano-$mes-$dia_referencia"); 
            $ultimo_dia_mes = $referencia->format('t');
            $ultima_semana = ceil($ultimo_dia_mes / 7); 
            $dia_referencia_2 = $data_dia_2;
            $mes_2 = $data_mes_2;
            $ano_2 = $data_ano_2;
            $referencia_2 = new DateTime("$ano_2-$mes_2-$dia_referencia_2");
            $ultimo_dia_mes_2 = $referencia->format('t');
            $ultima_semana_2 = ceil($ultimo_dia_mes_2 / 7);
  
            if ($ultima_semana == $ultima_semana_2) {
              echo "ultima semana";
              while ($dia == false) {
                if ($data_dia_original < $data_dia) {
                  $dataRR->modify('-1 day');
                  $data_mes_2 = date_format($dataRR, 'm');
                  $dataRRR = $dataRR->format("Y-m-d H:i:s");
                  $data_dia = date_format($dataRR, 'w');
                  $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                  $semana_mes_2 = ceil($dia_mes_2 / 7);
                } elseif ($data_dia_original > $data_dia) {
                  $dataRR->modify('+1 day');
                  $data_mes_2 = date_format($dataRR, 'm');
                  $dataRRR = $dataRR->format("Y-m-d H:i:s");
                  $data_dia = date_format($dataRR, 'w');
                  $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                  $semana_mes_2 = ceil($dia_mes_2 / 7);
                } elseif ($data_dia_original == $data_dia && $semana_mes_2 < 4) {
                  $dataRR->modify('-1 week');
                  $dataRRR = $dataRR->format("Y-m-d H:i:s");
                  $data_dia = date_format($dataRR, 'w');
                  $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                  $semana_mes_2 = ceil($dia_mes_2 / 7);
                  $dia = true;
                }
                elseif ($data_dia_original == $data_dia && $semana_mes_2 > 4) {
                  $dataRR->modify('+1 week');
                  $dataRRR = $dataRR->format("Y-m-d H:i:s");
                  $data_dia = date_format($dataRR, 'w');
                  $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                  $semana_mes_2 = ceil($dia_mes_2 / 7);
                  $dia = true;
                }else {
                  $dia = true;
                }
              }
            }
          }
  
  
          if ($semana_real == $semana_mes_2) {
            while ($dia == false) {
              if ($data_dia_original < $data_dia) {
                $dataRR->modify('-1 day');
                $data_mes_2 = date_format($dataRR, 'm');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
                if ($data_mes_real == $data_mes_2) {
                  $dataRR->modify('+1 week');
                  $dataRRR = $dataRR->format("Y-m-d H:i:s");
                }
              } elseif ($data_dia_original > $data_dia) {
                $dataRR->modify('+1 day');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
              } elseif ($data_dia_original == $data_dia && $semana_real > $semana_mes_2) {
                $dataRR->modify('+1 week');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
                $dia = true;
              } else {
                $dia = true;
              }
            }
          }
  
  
          if ($semana_real > $semana_mes_2) {
            while ($dia == false) {
              if ($data_dia_original < $data_dia) {
                $dataRR->modify('-1 day');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
              } elseif ($data_dia_original > $data_dia) {
                $dataRR->modify('+1 day');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
              } elseif ($data_dia_original == $data_dia) {
                $dataRR->modify('+1 week');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
                $dia = true;
              } else {
                $dia = true;
              }
            }
          }
  
  
          if ($semana_real < $semana_mes_2) {
            while ($dia == false) {
              if ($data_dia_original < $data_dia) {
                $dataRR->modify('-1 day');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
              } elseif ($data_dia_original > $data_dia) {
                $dataRR->modify('+1 day');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $data_dia = date_format($dataRR, 'w');
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
              } elseif ($data_dia_original == $data_dia) {
                $dataRR->modify('-1 week');
                $dataRRR = $dataRR->format("Y-m-d H:i:s");
                $dia_mes_2 = date_format(date_create($dataRRR), 'd');
                $semana_mes_2 = ceil($dia_mes_2 / 7);
                $dia = true;
              } else {
                $dia = true;
              }
            }
          }
  
          $data_mes_real = date_format($dataRR, 'm');
          if ($dia) {
            $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir` , `vezes`,`semana`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, :reincidente, :status,:recorrente,:data_recorrente,:vezes_reabrir,:vezes,:semana);");
            $adc->bindParam(':cliente', $clienteR);
            $adc->bindParam(':pessoa', $pessoaR);
            $adc->bindParam(':local', $localR);
            $adc->bindParam(':tipo', $tipoR);
            $adc->bindParam(':categoria', $categoriaR);
            $adc->bindParam(':subcategoria', $subcategoriaR);
            $adc->bindParam(':item', $itemR);
            $adc->bindParam(':nivel', $nivelR);
            $adc->bindParam(':forma', $formaR);
            $adc->bindParam(':desc_abertura', $desc_aberturaR);
            $adc->bindParam(':abertura', $data_recorrenteR);
            $adc->bindParam(':tecnico', $tecnicoR);
            $adc->bindParam(':recorrente', $recorrenteR);
            $adc->bindParam(':data_recorrente', $dataRRR);
            $adc->bindParam(':reincidente', $reincidenteR);
            $adc->bindParam(':status', $statusR);
            $adc->bindParam(':vezes_reabrir', $vezes_reabrirR);
            $adc->bindParam(':vezes', $vezes);
            $adc->bindParam(':semana', $semana_real);
            $adc->execute();
          }
        }
      }
    }
  ?>

  <?php include_once("../all/update_pass.php"); ?>
  <script src="../js/bootstrap.min.js"></script>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <!--    <script src="../js/bootstrap.bundle.min.js"></script>    -->
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>

  <?php if (isset($mensagem)) { ?>
    <script>
      window.setTimeout(function() {$(".alert").alert('close');}, 4000);
    </script>
  <?php } ?>

  <script>
    $(document).ready(function() {$('[data-toggle="popover"]').popover();});
  </script>

  <script>
    $('.popover-dismiss').popover({trigger: 'focus'})
  </script>

</body>
</html>