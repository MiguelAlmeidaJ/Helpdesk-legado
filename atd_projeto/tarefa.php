<?php

session_start();
ob_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");

$pdo = ConnectionN3();

$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_tarefa_interacao = true;
$exibe_bt_tarefa_aceitar = false;
$exibe_bt_tarefa_devolver = false;
$exibe_bt_tarefa_espera = false;
$exibe_bt_tarefa_finalizar = false;
$exibe_bt_tarefa_retomar = false;

/**
 * Normalização de variáveis vindas dos includes.
 * Evita alerta do Intelephense e previne erro caso algum include falhe.
 */
$user_id_logado = (int)($_SESSION['allterusN3Id'] ?? 0);
$user_nome_logado = $_SESSION['allterusN3Nome'] ?? '';

$user_id = $user_id_logado;
$user_nome = $user_nome_logado;
$user_login = $user_login ?? ($_SESSION['allterusN3Login'] ?? '');

$usar_token = $usar_token ?? 'false';
$token = $token ?? '';

$m3_00 = (int)($m3_00 ?? 0);
$m3_01 = (int)($m3_01 ?? 0);
$m3_02 = (int)($m3_02 ?? 0);
$m3_03 = (int)($m3_03 ?? 0);
$m3_04 = (int)($m3_04 ?? 0);
$m3_05 = (int)($m3_05 ?? 0);

$m5_00 = (int)($m5_00 ?? 0);
$m5_01 = (int)($m5_01 ?? 0);
$m5_02 = (int)($m5_02 ?? 0);
$m5_03 = (int)($m5_03 ?? 0);
$m5_04 = (int)($m5_04 ?? 0);
$m5_05 = (int)($m5_05 ?? 0);
if ($m5_00 == 0) {
  header("Location: ../home.php");
}

// var_dump($_SESSION);
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
  <link rel="stylesheet" href="css/tarefa.css">
  <link rel="stylesheet" href="css/projeto_modern.css">
  <link rel="stylesheet" href="../css/n3-detalhe-padrao.css">

  <title>Allterus</title>
</head>

<body class="n3-detail-page n3-tarefa-page">
  <!-- <?php include_once("../all/loading.php"); ?> -->
  <?php include_once("../all/sidebar.php"); ?>

  <?php if (!empty($_SESSION['mensagem'])): ?>
    <div class="container-fluid mt-3">
      <div class="alert <?php echo $_SESSION['mensagem_cor'] ?? 'alert-info'; ?> alert-dismissible fade show" role="alert">
        <?php echo $_SESSION['mensagem']; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Fechar">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
    <?php
      unset($_SESSION['mensagem']);
      unset($_SESSION['mensagem_cor']);
    ?>
  <?php endif; ?>


  <?php
  //verifico se existe alguma requisição POST chamada action
  $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

  //verifico se existe alguma requisição via post/get chamada tarefa
  $tarefa = (int)($_POST['tarefa'] ?? $_GET['tarefa'] ?? 0);


  if ($action == "alterar_senha") {
    include_once("../all/update_senha.php");
  }

  if ($action && $action !== "alterar_senha") {
    $actionTarefaTecnico = null;

    if ($tarefa > 0 && $action !== "tarefa_adc") {
      $pdoPerm = ConnectionN3();
      $stmtPerm = $pdoPerm->prepare("SELECT tecnico FROM tarefas WHERE id = :id LIMIT 1");
      $stmtPerm->execute([':id' => $tarefa]);
      $permRow = $stmtPerm->fetch(PDO::FETCH_ASSOC);
      if (!$permRow) {
        n3_forbidden('Tarefa nao encontrada.', 404);
      }
      $actionTarefaTecnico = (int)$permRow['tecnico'];
    }

    $allowedAction = true;
    switch ($action) {
      case 'tarefa_adc':
        $allowedAction = ((int)$m5_01 >= 2);
        break;
      case 'tarefa_edt':
        $allowedAction = ((int)$m5_01 >= 3 || (int)$m5_05 >= 2);
        break;
      case 'tarefa_new_inter':
      case 'tarefa_porcentagem':
        $allowedAction = ((int)$m5_00 >= 1);
        break;
      case 'tarefa_aceitar':
      case 'tarefa_retomar':
      case 'tarefa_finalizar':
        $allowedAction = (
          (int)$m5_05 >= 2 ||
          (
            (int)$m5_02 >= 2 &&
            (int)$actionTarefaTecnico === (int)$user_id_logado
          )
        );
        break;
      case 'tarefa_espera':
        $allowedAction = ((int)$m5_03 >= 2 && n3_can_project_execute_owner_or_manager($actionTarefaTecnico));
        break;
      case 'tarefa_recusar':
        $allowedAction = ((int)$m5_04 >= 2 || (int)$m5_05 >= 2);
        break;
      default:
        $allowedAction = false;
        break;
    }

    $_SESSION['mensagem'] =
      "DEBUG permissao: tecnico_tarefa={$actionTarefaTecnico} | user_id={$user_id} | user_id_logado={$user_id_logado} | m5_02={$m5_02} | m5_05={$m5_05} | action={$action}";
    $_SESSION['mensagem_cor'] = "alert-warning";

    if (!$allowedAction) {
      $_SESSION['mensagem'] = "<i class=\"fas fa-exclamation-triangle\"></i> Você não tem permissão para executar esta ação na tarefa.";
      $_SESSION['mensagem_cor'] = "alert-danger";

      $redirect_url = !empty($tarefa) ? 'tarefa.php?tarefa=' . urlencode((string)$tarefa) : 'tarefa.php';

      if (ob_get_length()) {
        ob_clean();
      }

      header('Location: ' . $redirect_url);
      exit;
    }
  }

  if ($usar_token == "true") {
    if ($action) {
      if ($action == "tarefa_adc") {
        // var_dump($_POST);
        // exit;
        // $nome_tarefa = filter_input(INPUT_POST, 'nome_tarefa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $nome_tarefa = htmlspecialchars(filter_input(INPUT_POST, 'nome_tarefa',  FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        // $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        // $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        // $desc_abertura = INPUT_POST['desc_abertura'];
        $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_UNSAFE_RAW);

        //$abertura = date("Y-m-d H:i:s");
        $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        //VERIFICA SE DATA HORA ABERTURA É MAIOR DO QUE DATA HORA ATUAL.
        //SE POSITIVO: UM TAREFA AGENDADO
        //MUDA O STATUS PADRÃO DE ABERTURA PARA 0 (AGENDADO)
        if (strtotime($abertura) > strtotime($agora)) {
          $tarefa_sts = 0;
          $agendamento = date("d/m/Y H:i", strtotime($abertura));
          $inter_msg = "Registrou o Agendamento da Tarefa para $agendamento.";
        } else {
          $tarefa_sts = 1;
          $inter_msg = "Registrou solicitação de Tarefa.";
        }

        //VERIFICA SE EXISTE UM TAREFA ABERTO PARA O MESMO CLIENTE, COM A MESMA CATEGORIA E MESMA SUBCATEGORIA NOS ÚLTIMOS 30 DIAS
        //SE HOUVER, CLASSIFICA O TAREFA COMO REINCIDENTE
        $prazo_reincidente = 30; //PERIODO EM DIAS PARA VERIFICAR REINCIDÊNCIA
        $data_reincidente = date("Y-m-d", strtotime($hoje . " - $prazo_reincidente days"));
        $show = $pdo->prepare("SELECT tarefas.id FROM tarefas WHERE tarefas.abertura > '$data_reincidente' AND tarefas.cliente = '$cliente' AND tarefas.categoria = '$categoria' AND tarefas.subcategoria = '$subcategoria'");
        $show->execute();
        $conta_tarefa = $show->rowCount();
        if ($conta_tarefa > 0) {
          $reincidente = 1;
        } else {
          $reincidente = 0;
        }

        // var_dump($_POST);
        // exit;

        $adc = $pdo->prepare("INSERT INTO `tarefas` (`cliente`, `nome_tarefa`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`) VALUES (:cliente, :nome_tarefa,  :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$tarefa_sts');");
        $adc->bindParam(':nome_tarefa', $nome_tarefa);
        $adc->bindParam(':cliente', $cliente);
        $adc->bindParam(':pessoa', $pessoa);
        $adc->bindParam(':local', $local);
        $adc->bindParam(':tipo', $tipo);
        $adc->bindParam(':categoria', $categoria);
        $adc->bindParam(':subcategoria', $subcategoria);
        $adc->bindParam(':item', $item);
        $adc->bindParam(':nivel', $nivel);
        $adc->bindParam(':forma', $forma);
        $adc->bindParam(':desc_abertura', $desc_abertura);
        $adc->bindParam(':abertura', $abertura);
        $adc->bindParam(':tecnico', $tecnico);

        //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
        //if($tecnico>0 && $tecnico!= $user_id){
        //}
        // var_dump($adc);
        // exit;

        if ($adc->execute()) {
          $tarefa = $pdo->lastInsertId();
          $mensagem = "<i class=\"fas fa-check\"></i> Tarefa cadastrada!";
          $mensagem_cor = "alert-success";
          $log = "true";

          //cadastra abertura do tarefa na tabela de interatividade
          $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$tarefa', '$user_id', '$agora', '$inter_msg');");
          $adc->execute();

          //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
          //registra interação de direcionamento de tarefa
          if ($tecnico > 0 && $tecnico != $user_id) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$tarefa', '$user_id', '$agora', 'Direcionou o tarefa para $tecnico_nome.')");
            $adc->execute();
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar tarefa!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }

      //EDITA A CATEGORIZAÇÃO DA TAREFA
      if ($action == "tarefa_edt") {
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($tipo == 1) {
          $tarefa_tipo_nome = "Falha";
        }
        if ($tipo == 2) {
          $tarefa_tipo_nome = "Relacionamento";
        }
        if ($tipo == 3) {
          $tarefa_tipo_nome = "Requisição de Serviços";
        }
        if ($tipo == 4) {
          $tarefa_tipo_nome = "Requisição de informação";
        }
        if ($tipo == 5) {
          $tarefa_tipo_nome = "Notificação de monitoramento";
        }
        if ($tipo == 6) {
          $tarefa_tipo_nome = "Melhorias";
        }
        if ($tipo == 0) {
          $tarefa_tipo_nome = "Não informado";
        }

        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        $show_cat->execute();
        $row = $show_cat->fetch(PDO::FETCH_ASSOC);
        $tarefa_cat_nome = $row["cat_nome"];

        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        $show_scat->execute();

        $row = $show_scat->fetch(PDO::FETCH_ASSOC);

        if ($row) { // Verificando se a consulta retornou resultados
          $tarefa_scat_nome = isset($row["scat_nome"]) ? $row["scat_nome"] : ''; // Acesso seguro é chave

        } else {
          $tarefa_scat_nome = ''; // Valor padrão se não houver resultados
          // echo "<script> console.log(" . json_encode("row 228:" . $tarefa_scat_nome) . ") </script>";
        }


        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $show_itens = $pdo->prepare("SELECT itens.itens_nome FROM itens WHERE itens.itens_id = :item"); // Usando bind para evitar SQL Injection
        $show_itens->bindParam(':item', $item, PDO::PARAM_INT); // Bind do parâmetro para maior segurança
        $show_itens->execute();

        $row = $show_itens->fetch(PDO::FETCH_ASSOC);

        if ($row) { // Verificando se a consulta retornou resultados
          $tarefa_itens_nome = isset($row["itens_nome"]) ? $row["itens_nome"] : ''; // Acesso seguro é chave
        } else {
          $tarefa_itens_nome = ''; // Valor padrão se não houver resultados
        }




        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($nivel == 0) {
          $tarefa_nivel_nome = "Não informado";
        }
        if ($nivel == 1) {
          $tarefa_nivel_nome = "Nível 1";
        }
        if ($nivel == 2) {
          $tarefa_nivel_nome = "Nível 2";
        }
        if ($nivel == 3) {
          $tarefa_nivel_nome = "Nível 3";
        }
        if ($nivel == 4) {
          $tarefa_nivel_nome = "Rotina";
        }
        if ($nivel == 5) {
          $tarefa_nivel_nome = "Administrativo";
        }

        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_SPECIAL_CHARS);
        if ($forma == 1) {
          $tarefa_forma_nome = "Remoto";
        }
        if ($forma == 2) {
          $tarefa_forma_nome = "Presencial";
        }
        if ($forma == 3) {
          $tarefa_forma_nome = "Remoto - Plantão";
        }
        if ($forma == 4) {
          $tarefa_forma_nome = "Presencial - Plantão";
        }

        $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura'), ENT_QUOTES, 'UTF-8');

        //BUSCA A CLASSIFICAÇÃO ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICAÇÃO
        
        $show_tarefa = $pdo->prepare("SELECT tarefas.`tipo`, tarefas.`nivel`, tarefas.`forma`, tarefas.`item`, tarefas.`categoria`,tarefas.`subcategoria`,
        tarefas.`dias`, tarefas.desc_abertura,
        categorias.cat_nome,
        subcategorias.scat_nome,
        itens.itens_nome
        FROM tarefas 
        LEFT JOIN categorias ON categorias.cat_id = tarefas.categoria
        LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas.subcategoria
        LEFT JOIN itens ON itens.itens_id = tarefas.item
        WHERE tarefas.id = '$tarefa'");
        $show_tarefa->execute();
        $row = $show_tarefa->fetch(PDO::FETCH_ASSOC);


        $tarefa_tipo_original = $row["tipo"];
        if ($tarefa_tipo_original == 1) {
          $tarefa_tipo_original_nome = "Falha";
        }
        if ($tarefa_tipo_original == 2) {
          $tarefa_tipo_original_nome = "Relacionamento";
        }
        if ($tarefa_tipo_original == 3) {
          $tarefa_tipo_original_nome = "Requisição de Serviços";
        }
        if ($tarefa_tipo_original == 4) {
          $tarefa_tipo_original_nome = "Requisição de informação";
        }
        if ($tarefa_tipo_original == 5) {
          $tarefa_tipo_original_nome = "Notificação de monitoramento";
        }
        if ($tarefa_tipo_original == 6) {
          $tarefa_tipo_original_nome = "Melhorias";
        }
        if ($tarefa_tipo_original == 0) {
          $tarefa_tipo_original_nome = "Não informado";
        }

        $tarefa_cat_original = $row["categoria"];
        $tarefa_cat_original_nome = $row["cat_nome"];

        $tarefa_scat_original = $row["subcategoria"];
        $tarefa_scat_original_nome = $row["scat_nome"];

        $tarefa_item_original = $row["item"];
        $tarefa_item_original_nome = $row["itens_nome"];

        $tarefa_nivel_original = $row["nivel"];
        if ($tarefa_nivel_original == 0) {
          $tarefa_nivel_original_nome = "Não informado";
        }
        if ($tarefa_nivel_original == 1) {
          $tarefa_nivel_original_nome = "Nível 1";
        }
        if ($tarefa_nivel_original == 2) {
          $tarefa_nivel_original_nome = "Nível 2";
        }
        if ($tarefa_nivel_original == 3) {
          $tarefa_nivel_original_nome = "Nível 3";
        }
        if ($tarefa_nivel_original == 4) {
          $tarefa_nivel_original_nome = "Rotina";
        }
        if ($tarefa_nivel_original == 5) {
          $tarefa_nivel_original_nome = "Administrativo";
        }

        $tarefa_forma_original = $row["forma"];
        if ($tarefa_forma_original == 1) {
          $tarefa_forma_original_nome = "Remoto";
        }
        if ($tarefa_forma_original == 2) {
          $tarefa_forma_original_nome = "Presencial";
        }
        if ($tarefa_forma_original == 3) {
          $tarefa_forma_original_nome = "Remoto - Plantão";
        }
        if ($tarefa_forma_original == 4) {
          $tarefa_forma_original_nome = "Presencial - Plantão";
        }

        $tarefa_desc_abertura_original = $row["desc_abertura"];



        //COMPARA O TIPO DA TAREFA:
        //SE DIFERENTE:
        if ($tipo != $tarefa_tipo_original) {
          //ALTERA O CÓDIGO DO TIPO NA TABELA DE tarefas
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `tipo`='$tipo' WHERE `id`='$tarefa';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou o Tipo: <s>De: $tarefa_tipo_original_nome</s> para $tarefa_tipo_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação da tarefa alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA O NÍVEL DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($nivel != $tarefa_nivel_original) {
          //ALTERA O CÓDIGO DO NÍVEL NA TABELA DE tarefas
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `nivel`='$nivel' WHERE `id`='$tarefa';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou o Nível: <s>De: $tarefa_nivel_original_nome</s> para $tarefa_nivel_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação da tarefa alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A CATEGORIA :
        //SE DIFERENTE:
        if ($categoria != $tarefa_cat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE tarefas
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `categoria`='$categoria' WHERE `id`='$tarefa';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou a Categoria: <s>De: $tarefa_cat_original_nome</s> para $tarefa_cat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação da tarefa alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA A SUBCATEGORIA :
        //SE DIFERENTE:
        if ($subcategoria != $tarefa_scat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE TAREFAS
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `subcategoria`='$subcategoria' WHERE `id`='$tarefa';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou a Sub Categoria: <s>De: $tarefa_scat_original_nome</s> para $tarefa_scat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação DA TAREFA alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA O ITEM :
        //SE DIFERENTE:
        if ($item != $tarefa_item_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE TAREFAS
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `item`='$item' WHERE `id`='$tarefa';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou o Item: <s>De: $tarefa_item_original_nome</s> para $tarefa_itens_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A FORMA DE ATENDIMENTO :
        //SE DIFERENTE:
        if ($forma != $tarefa_forma_original) {

          //ALTERA O CÓDIGO DA FORMA DE ATENDIMENTO NA TABELA DE TAREFAS
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `forma`='$forma' WHERE `id`='$tarefa';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou a forma de atendimento: <s>De: $tarefa_forma_original_nome</s> para $tarefa_forma_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A Descrição de Abertura :
        //SE DIFERENTE:
        if ($desc_abertura != $tarefa_desc_abertura_original) {
          //ALTERA O CÓDIGO DA desc_abertura DE ATENDIMENTO NA TABELA DE TAREFAS
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `desc_abertura`='$desc_abertura' WHERE `id`='$tarefa';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou a Descrição de Abertura: <s>De: $tarefa_desc_abertura_original</s> para: $desc_abertura.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Descrição de abertura alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }
      }






      //ACÕES DE GERENCIAMENTO DA TAREFA    
      //TIPOS DE INTERATIVIDADE
      //0 = Agendamento;
      //1 = Abertura de Atendimento
      //2 = Aceite de Atendimento
      //3 = Devolução de Atendimento para fila
      //4 = Transferência de Atendimento
      //5 = Envio para espera
      //6 = Retomada da tarefa
      //7 = Interação com o solicitante
      //8 = Conclusão de Atendimento
      //9 = Edição de classificação

      //REGISTRAR NOVA INTERAÇÃO
      if ($action == "tarefa_new_inter") {
        $inter_desc = htmlspecialchars(filter_input(INPUT_POST, 'inter_desc', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        
        $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :tarefa, '$user_id', '$agora', :inter_desc);");
        $adc->bindParam(':inter_desc', $inter_desc);
        $adc->bindParam(':tarefa', $tarefa);
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> Interação cadastrada!";
          $mensagem_cor = "alert-success";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO ACEITA INICIAR UM ATENDIMENTO
      if ($action == "tarefa_aceitar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        //VERIFICA SE TECNICO ATRIBUÍDO é O PRÓPRIO USUÁRIO
        //SE VERDADEIRO:
        //1 - muda o status da tarefa para 2 (ATENDIMENTO EM EXECUÇÃO)
        //2 - registra na tabela de interatividade que o usuário iniciou o atendimento.
        if ((int)$tecnico === (int)$user_id_logado) {
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$tarefa';");
          if ($adc->execute()) {
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$tarefa', '$user_id', '$agora', 'Iniciou a tarefa.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O status da tarefa foi alterado para 'Em Execução'!";
              $mensagem_cor = "alert-success";
            }
          }
        }
        //SE FALSO:
        //1 - mantem status da tarefa como 1 (ATENDIMENTO AGUARDANDO EXECUÇÃO)
        //1 - registra na tabela de atendimento o novo técnico responsável 
        //2 - busca o NOME do técnico responsável
        //3 - registra na tabela de interatividade a atribuição do chamando
        if ((int)$tecnico !== (int)$user_id_logado) {
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `tecnico`='$tecnico', `status`='1' WHERE  `id`='$tarefa';");
          if ($adc->execute()) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$tarefa', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi direcionado para $tecnico_nome.";
              $mensagem_cor = "alert-success";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento a outro técnico!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento a outro técnico!";
            $mensagem_cor = "alert-danger";
          }
        }
      }

      //USUÁRIO RETOMA UM ATENDIMENTO
      if ($action == "tarefa_retomar") {
        

        //altera o status da tarefa para 2 (Em execução)
        $edt = $pdo->prepare("UPDATE `tarefas` SET `status`='2' WHERE  `id`='$tarefa';");
        if ($edt->execute()) {
          //busca o ID do registro de espera, na tabela espera
          $show_espera = $pdo->prepare("SELECT espera_tarefas.espera_id FROM espera_tarefas WHERE espera_tarefas.espera_tarefa = '$tarefa' ORDER BY espera_tarefas.espera_id DESC LIMIT 0,1");
          $show_espera->execute();
          $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
          $espera_id = $exibe["espera_id"] ?? "";

          //registra A data hora final de espera, na tabela espera
          $edt_espera = $pdo->prepare("UPDATE `espera_tarefas` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
          if ($edt_espera->execute()) {

            //insere o registro de uma nova interação 
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$tarefa', '$user_id', '$agora', 'Retomou a tarefa.');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interAções com o cliente!";
              $mensagem_cor = "alert-success";
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
      }

      //USUÁRIO RECUSA UM ATENDIMENTO
      if ($action == "tarefa_recusar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        $inter_desc = htmlspecialchars(filter_input(INPUT_POST, 'inter_desc', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        //VERIFICA SE O ATENDIMENTO FOI DIRECIONADO PARA OUTRO TÉCNICO
        //SE VERDADEIRO:
        //1 - muda o status da tarefa para 1 (aguardando atendimento)
        //1 - registra na tabela de atendimento o novo técnico responsável 
        //2 - busca o NOME do técnico responsável
        //2 - registra na tabela de interatividade que o usuário direcionou o atendimento.      
        if ($tecnico != 0) {
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `tecnico`='$tecnico', `status`='1' WHERE `id`='$tarefa';");
          if ($adc->execute()) {

            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$tarefa', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome: <br> $inter_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Atendimento direcionado para $tecnico_nome. <br> O que vamos fazer agora?";
              $mensagem_cor = "alert-warning";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento!";
            $mensagem_cor = "alert-danger";
          }
        }
        //SE FALSO:
        //1 - muda o status da tarefa para 1 (aguardando atendimento)
        //1 - remove o técnico como responsável pelo atendimento
        //2 - registra na tabela de interatividade que o usuário recusou o atendimento.     
        if ($tecnico == 0) {
          
          $adc = $pdo->prepare("UPDATE `tarefas` SET `tecnico`='0', `status`='1' WHERE `id`='$tarefa';");
          if ($adc->execute()) {

            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', '$tarefa', '$user_id', '$agora', 'Recusou o atendimento: <br> $inter_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Atendimento recusado. <br> O que vamos fazer agora?";
              $mensagem_cor = "alert-warning";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento!";
            $mensagem_cor = "alert-danger";
          }
        }
      }

      //COLOCAR ATENDIMENTO EM ESPERA
      if ($action == "tarefa_espera") {
        $espera_desc = htmlspecialchars(filter_input(INPUT_POST, 'espera_desc', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        $espera_prev = htmlspecialchars(filter_input(INPUT_POST, 'espera_prev',  FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
        
        //altera status da tarefa para 3 (Em espera)
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $edt = $pdo->prepare("UPDATE `tarefas` SET `status`='3' WHERE  `id`='$tarefa';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `espera_tarefas` (`espera_tarefa`, `espera_start`, `espera_prev`, `espera_desc`, `espera_user`) VALUES ('$tarefa', '$agora', '$espera_prev', '$espera_desc', '$user_id');");
          if ($adc->execute()) {
            //insere registro da ação na tabela de interatividade
            $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$tarefa', '$user_id', '$agora', 'Colocou o atendimento Em Espera. <br> Previsão de retorno: $espera_prev_br <br> Descrição: $espera_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> A tarefa foi colocada Em Espera.";
              $mensagem_cor = "alert-warning";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar tarefa em espera!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de espera!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status da tarefa!";
          $mensagem_cor = "alert-danger";
        }
      }

      $show = $pdo->prepare("SELECT * FROM tarefas WHERE id = :id");
      $id = $tarefa;
      $show->bindParam(':id', $id);
      $show->execute();
      $vee_proj = $show->rowCount();
      if ($vee_proj > 0) {
        while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
          $porcentagem_atual = $row['porcentagem'];
        }
      }

      if ($action == "tarefa_porcentagem") {
        $porcentagem = filter_input(INPUT_POST, 'porcentagem', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        // $porcentagem_total = $porcentagem_atual + $porcentagem;
        if ($porcentagem <= 100 && $porcentagem >= 0) {
          
          $edt = $pdo->prepare("UPDATE `tarefas` SET `porcentagem`='$porcentagem' WHERE  `id`='$tarefa';");
          $edt->execute();
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Erro! <br>Porcentagem não deve ultrapassar 100%";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO FINALIZA UM ATENDIMENTO
      if ($action == "tarefa_finalizar") {
        $desc_fechamento = $_POST['desc_fechamento'];
        
        $adc = $pdo->prepare("UPDATE `tarefas` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$tarefa';");
        $adc->bindParam(':desc_fechamento', $desc_fechamento);
        $adc->bindParam(':fechamento', $agora);
        
        $edt = $pdo->prepare("UPDATE `tarefas` SET `porcentagem`='100' WHERE  `id`='$tarefa';");
        $edt->execute();
        if ($adc->execute()) {
          
          $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$tarefa', '$user_id', '$agora', 'Finalizou o atendimento. <br> Descrição: $desc_fechamento');");
          if ($adc->execute()) {
            $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O que mais temos para hoje?!";
            $mensagem_cor = "alert-success";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }
    }
  }

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($mensagem)) {
      $_SESSION['mensagem'] = $mensagem;
      $_SESSION['mensagem_cor'] = $mensagem_cor ?? 'alert-info';
    }

    $quick_modal = $_POST['quick_modal'] ?? '';
    $allowed_quick_modals = ['tarefa_aceitar', 'tarefa_retomar', 'tarefa_finalizar'];
    if (!$action && in_array($quick_modal, $allowed_quick_modals, true)) {
      $_SESSION['tarefa_quick_modal'] = $quick_modal;
    }

    $return_to = $_POST['return_to'] ?? '';
    $redirect_url = !empty($tarefa) ? 'tarefa.php?tarefa=' . urlencode((string)$tarefa) : 'tarefa.php';
    if (preg_match('/^projeto\.php\?projeto=\d+$/', $return_to)) {
      $redirect_url = $return_to;
    }
    if (ob_get_length()) {
      ob_clean();
    }

    if (!headers_sent()) {
      header('Location: ' . $redirect_url);
    } else {
      echo '<script>window.location.href = ' . json_encode($redirect_url) . ';</script>';
    }
    exit;
  }
  ?>
  <?php
  // Verifica de existe o ID de um atendimento setado.
  // Se não houver, exibe a parte de CADASTRO tarefas
  if (empty($tarefa)) {
    if ($m5_00 < 1) {
      header("Location: ../home.php");
    }
  ?>
    <div class="container-fluid task-create-page">
      <div class="row justify-content-md-center">
        <div class="col-12">
          <div class="task-create-card">
            <div class="task-create-header">
              <div>
                <h1 class="task-create-title"><i class="fas fa-plus"></i> Cadastro de solicitação de tarefa</h1>
                <p class="task-create-subtitle">Preencha os dados principais para registrar uma nova tarefa de projeto.</p>
              </div>
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitação de tarefa
            </div>
            <div class="task-create-body">
              <form action="#" method="POST">
                <div class="task-form-section">
                  <h2 class="task-form-section-title"><i class="fas fa-building"></i> Dados do cliente</h2>
                <div class="form-row">
                  <!--  -->


                  <!-- -->

                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Cliente:</label>
                    <select name="cliente" id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" tabindex="1">
                      <option></option>
                      <?php
                      

                      // Define a consulta SQL base
                      $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";

                      // Adiciona a condição do ID do cliente se a sessão existir
                      if (isset($_SESSION['allterusN3Id']) && $_SESSION['allterusN3Id'] == 145) {
                        $sql .= " AND clientes.clt_id = 93";
                      }

                      // Adiciona a ordenação
                      $sql .= " ORDER BY clientes.clt_nomef ASC";

                      $show_clt = $pdo->prepare($sql);
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $nome_cliente = $exibe["clt_nomef"];
                        $cliente_id = $exibe["clt_id"];
                      ?>
                        <!-- <option value="<?php echo $cliente_id; ?>"><?php echo $cliente_id ?>: <?php echo $nome_cliente; ?> </option> -->

                        <option value="<?php echo $cliente_id; ?>"><?php echo $nome_cliente; ?> </option>


                      <?php } ?>

                    </select>
                  </div>



                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Solicitante:</label>
                    <span class="carregando small">Carregando...</span>
                    <select name="solicitante" id="solicitante" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="2">

                      <option></option>
                    </select>
                  </div>

                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Local:</label>
                    <span class="carregando2 small">Carregando...</span>
                    <select name="local" id="local" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="3">
                      <option></option>
                    </select>
                  </div>
                </div>

                </div>

                <div class="task-form-section">
                  <h2 class="task-form-section-title"><i class="fas fa-layer-group"></i> Classificação</h2>
                <div class="form-row pt-2">
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Tipo de atendimento:</label>
                    <select name="tipo" class="form-control form-control-sm selectpicker" data-container="body" data-width="100%" required="required" tabindex="4">
                      <option></option>
                      <option value="1">Falha</option>
                      <option value="2">Relacionamento</option>
                      <option value="3">Requisição de Serviços</option>
                      <option value="4">Requisição de informação</option>
                      <option value="5">Notificação de monitoramento</option>
                      <option value="6">Melhorias</option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Categoria:</label>
                    <select name="categoria" id="categoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="5">
                      <option></option>
                      <?php
                      
                      $show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $cat_id = $exibe["cat_id"];
                        $cat_nome = $exibe["cat_nome"];
                      ?>
                        <option value="<?php echo $cat_id; ?>"><?php echo $cat_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>

                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">SubCategoria:</label>
                    <span class="carregando3 small">Aguarde, carregando...</span>
                    <select name="subcategoria" id="subcategoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="6">
                      <option></option>
                    </select>
                  </div>

                  <!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Item:</label>
                    <span class="carregando4 small">Aguarde, carregando...</span>
                    <select name="item" id="item" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="7">
                      <option></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Nível:</label>
                    <select name="nivel" class="form-control form-control-sm selectpicker" data-container="body" data-width="100%" required="required" tabindex="8">
                      <option></option>
                      <option value="1">Nível 1</option>
                      <option value="2">Nível 2</option>
                      <option value="3">Nível 3</option>
                      <option value="4">Rotina</option>
                      <option value="5">Administrativo</option>
                      <option value="0">NA</option>
                    </select>
                  </div>
                </div>

                </div>

                <div class="task-form-section">
                  <h2 class="task-form-section-title"><i class="fas fa-tasks"></i> Tarefa</h2>
                <div class="form-row pt-2">

                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Nome da Tarefa:</label>
                    <textarea name="nome_tarefa" class="form-control form-control-sm" rows="2" required="required" tabindex="9"></textarea>
                  </div>
                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea name="desc_abertura" class="form-control form-control-sm" rows="4" required="required" tabindex="9"></textarea>
                  </div>

                  <div class="form-group col-sm-6 col-md-6">
                    <div class="form-row">

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Técnico:</label>
                        <select name="tecnico" id="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="10">
                          <option></option>
                          <option value="0">Não determinado</option>
                          <?php
                          
                          $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' AND usuarios.user_id > '1' AND user_funcao >= '8' AND user_funcao <= '14' ORDER BY usuarios.user_nome ASC");
                          $show_clt->execute();
                          while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                            $user_id = $exibe["user_id"];
                            $user_nome = $exibe["user_nome"];
                          ?>
                            <option value="<?php echo $user_id; ?>"><?php echo $user_nome; ?></option>
                          <?php } ?>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Forma de atendimento:</label>
                        <select name="forma" class="form-control form-control-sm selectpicker" data-container="body" data-width="100%" required="required" tabindex="11">
                          <option value="1">Remoto</option>
                          <option value="2">Presencial</option>
                          <option value="3">Remoto - Plantão </option>
                          <option value="4">Presencial - Plantão</option>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6 task-date-field">
                        <label class="my-0 small">Abertura:</label>
                        <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                      </div>

                      <div class="form-group col-sm-12 col-md-6 task-create-actions">
                        <input type="hidden" name="token" value="<?php echo $token; ?>">
                        <input type="hidden" name="action" value="tarefa_adc">
                        <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Criar tarefa</button>
                      </div>

                    </div>
                  </div>

                </div>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE AJUDA PARA CADASTRO tarefas -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de tarefas</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>

          <div class="modal-body">
            <p>Em construção...
            </p>
          </div>

        </div>
      </div>
    </div>

  <?php } ?>

  <?php
  if (!empty($tarefa)) {
    // Preparar e executar a query
    $query = $pdo->prepare("SELECT img_tarefa, id FROM imagens_tarefa WHERE tarefa_id = :tarefa");
    $query->bindParam(':tarefa', $tarefa, PDO::PARAM_STR);
    $query->execute();
    $result = $query->fetchAll(PDO::FETCH_ASSOC);

    // Inicializar o array de imagens e IDs
    $imagens = [];
    $imagens_ids = [];

    // Processar o resultado da query
    if ($result) {
      foreach ($result as $row) {
        $img_base64 = 'data:image/jpeg;base64,' . base64_encode($row['img_tarefa']);
        $imagens[] = $img_base64;
        $imagens_ids[] = $row['id'];
      }
    }
  }
  ?>

  <?php
  // Verifica de existe o ID de um atendimento setado.
  // Se não houver, exibe a parte de CADASTRO DE tarefas
  if (!empty($tarefa)) { ?>
    <?php
    //Busca informações da tarefa

    
    $show_tarefa = $pdo->prepare("SELECT tarefas.`area`, tarefas.id_projeto, tarefas.`nome_tarefa`, tarefas.`tipo`, tarefas.`categoria`, tarefas.`subcategoria`, tarefas.`item`, 
    tarefas.`local`, tarefas.dias, tarefas.forma, tarefas.desc_abertura, tarefas.nivel,
    tarefas.desc_fechamento, tarefas.abertura, tarefas.fechamento, tarefas.reincidente, tarefas.`status`, tarefas.`tecnico`,
    clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
    c2.clt_id as clt_id2, c2.clt_nomer as clt_nomer2, c2.clt_nomef as clt_nomef2, c2.clt_cnpj as clt_cnpj2,
    pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
    locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
    categorias.cat_nome,
    subcategorias.scat_nome,
    itens.itens_nome,
    usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
    FROM tarefas 
    left JOIN projetos p ON p.id = tarefas.id_projeto
    left JOIN clientes ON clientes.clt_id = p.cliente
    left JOIN clientes c2 ON c2.clt_id = tarefas.cliente
    LEFT JOIN pessoas ON pessoas.pessoa_id = tarefas.pessoa
    LEFT JOIN locais ON locais.local_id = tarefas.`local`
    LEFT JOIN categorias ON categorias.cat_id = tarefas.categoria
    LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas.subcategoria
    LEFT JOIN itens ON itens.itens_id = tarefas.item
    LEFT JOIN usuarios ON usuarios.user_id = tarefas.tecnico
    WHERE tarefas.id = '$tarefa'");
    $show_tarefa->execute();

    $row = $show_tarefa->fetch(PDO::FETCH_ASSOC);
    $tarefa_desc_abertura = $row["desc_abertura"] ?? '';
    $tarefa_desc_fechamento = $row["desc_fechamento"] ?? '';
    $tarefa_hora_abertura = $row["abertura"] ?? '';
    $tarefa_hora_fechamento = $row["fechamento"] ?? '';
    $tarefa_reincidente = $row["reincidente"] ?? '';
    $tarefa_status = $row["status"] ?? '';


    $tarefa_tipo = $row["tipo"] ?? '';
    if ($tarefa_tipo == 1) {
      $tarefa_tipo_nome = "Falha";
    }
    if ($tarefa_tipo == 2) {
      $tarefa_tipo_nome = "Relacionamento";
    }
    if ($tarefa_tipo == 3) {
      $tarefa_tipo_nome = "Requisição de Serviços";
    }
    if ($tarefa_tipo == 4) {
      $tarefa_tipo_nome = "Requisição de informação";
    }
    if ($tarefa_tipo == 5) {
      $tarefa_tipo_nome = "Notificação de monitoramento";
    }
    if ($tarefa_tipo == 6) {
      $tarefa_tipo_nome = "Melhorias";
    }

    if ($tarefa_tipo == 0) {
      $tarefa_tipo_nome = "Não informado";
    }

    $tarefa_nivel = $row["nivel"] ?? '';
    if ($tarefa_nivel == 0) {
      $tarefa_nivel_nome = "Não informado";
    }
    if ($tarefa_nivel == 1) {
      $tarefa_nivel_nome = "Nível 1";
    }
    if ($tarefa_nivel == 2) {
      $tarefa_nivel_nome = "Nível 2";
    }
    if ($tarefa_nivel == 3) {
      $tarefa_nivel_nome = "Nível 3";
    }
    if ($tarefa_nivel == 4) {
      $tarefa_nivel_nome = "Rotina";
    }
    if ($tarefa_nivel == 5) {
      $tarefa_nivel_nome = "Administrativo";
    }

    $tarefa_dias = $row["dias"] ?? '';


    $tarefa_forma = $row["forma"] ?? '';


    $possui_projeto = isset($row["id_projeto"]) ? true : false;

    $clt_id = $row["clt_id"] ? $row["clt_id"] :  $row["clt_id2"];
    $clt_nomer = $row["clt_nomer"] ? $row["clt_nomer"] : $row["clt_nomer2"];
    $clt_nomef = $row["clt_nomef"] ? $row["clt_nomef"] : $row["clt_nomef2"];
    $clt_cnpj = $row["clt_cnpj"] ? $row["clt_cnpj"] : $row["clt_cnpj2"];

    $pessoa_nom = $row["pessoa_nom"] ?? '';
    $pessoa_cargo = $row["pessoa_cargo"] ?? '';
    $pessoa_tel = $row["pessoa_tel"] ?? '';
    $pessoa_mail = $row["pessoa_mail"] ?? '';

    $local = $row["local"] ?? '';
    $local_nom = $row["local_nom"] ?? '';
    if ($local == 0) {
      $local_nom = "Não informado";
    }
    $local_end = $row["local_end"] ?? '';
    $local_city = $row["local_city"] ?? '';
    $local_uf = $row["local_uf"] ?? '';
    $tarefa_cat = $row["categoria"] ?? '';
    $tarefa_item = $row["item"] ?? '';
    $cat_nome = $row["cat_nome"] ?? '';
    $tarefa_scat = $row["subcategoria"] ?? '';
    $scat_nome = $row["scat_nome"] ?? '';
    $itens_nome = $row["itens_nome"] ?? '';
    $tarefa_itens_nome = $row["itens_nome"] ?? '';
    $nomeTarefa = $row["nome_tarefa"] ?? '';

    $tecnico_nome = $row["tecnico_nome"] ?? '';
    $tecnico_id = $row["tecnico"] ?? '';
    if ($tecnico_id == 0) {
      $tecnico_nome = "Não Atribuído";
    }
    ?>
    <div class="container-fluid">
      <div class="row mt-2">
        <div class="col-md-3 px-1">

          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-headset text-danger"></i> Tarefa #<?php echo str_pad($tarefa, 5, '0', STR_PAD_LEFT); ?>
              <!-- <br /><small><?php echo $nomeTarefa; ?></small> -->
            </div>
            <div class="card-body pt-1 pl-0 pr-0">
              <ul class="list-unstyled">
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-building mr-2"></i><?php echo $clt_nomer; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-paste small ml-3 pl-3 mr-2"></i><small>CNPJ: <?php echo $clt_cnpj; ?></small></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-building small ml-3 pl-3 mr-2"></i><small><?php echo $clt_nomef; ?></small></li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-user-tag mr-2"></i><?php echo $pessoa_nom; ?></li>
                <?php if ($pessoa_cargo != "") { ?>
                  <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-sitemap small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_cargo; ?></small></li>
                <?php } ?>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-mobile-alt small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_tel; ?></small></li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-map-marked-alt mr-2"></i><?php echo $local_nom; ?></li>
                <?php if ($local > 0) {   ?>
                  <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-map-signs small ml-3 pl-3 mr-2"></i><small><?php echo "$local_end - $local_city - $local_uf"; ?></small></li>
                <?php } ?>


                <!-- Início do menu de catálogo -->


                <?php if ($m8_04 > 0) { ?>
                  <hr class="p-0 mt-2 mb-0">

                  <li class="dropdown mt-1 align-items-center">
                    <div class="row px-0 mx-0">
                      <div class="col-10 pt-1 small">
                        <strong>Catálogo do Cliente:</strong>
                      </div>
                      <div class="col-2 text-right">
                        <!-- Botão para abrir dropdown -->
                        <a class="btn btn-outline-secondary btn-sm small" id="catalogToggle">
                          <i class="fas fa-book"></i>
                        </a>
                      </div>
                    </div>

                    <!-- Dropdown Menu (inicialmente oculto) -->
                    <div id="catalogOptions" class="dropdown-menu show d-none">
                      <a class="dropdown-item catalog-item" data-value="1"><i class="fas fa-network-wired"></i> Banco de Dados</a>
                      <a class="dropdown-item catalog-item" data-value="2"><i class="fas fa-database"></i> DVR</a>
                      <a class="dropdown-item catalog-item" data-value="3"><i class="fas fa-print"></i> E-mail</a>
                      <a class="dropdown-item catalog-item" data-value="4"><i class="fas fa-headset"></i> Hospedagem</a>
                      <a class="dropdown-item catalog-item" data-value="5"><i class="fas fa-server"></i> Links de Internet</a>
                      <a class="dropdown-item catalog-item" data-value="6"><i class="fas fa-network-wired"></i> Rede</a>
                      <a class="dropdown-item catalog-item" data-value="7"><i class="fas fa-shield-alt"></i> Segurança</a>
                      <a class="dropdown-item catalog-item" data-value="8"><i class="fas fa-cogs"></i> Sistema</a>
                      <a class="dropdown-item catalog-item" data-value="9"><i class="fas fa-globe"></i> Site</a>
                      <a class="dropdown-item catalog-item" data-value="10"><i class="fas fa-book"></i> Tutorial</a>
                      <a class="dropdown-item catalog-item" data-value="11"><i class="fas fa-user"></i> único</a>
                    </div>
                  </li>
                <?php } ?>


                <!-- JavaScript para envio via POST e abrir em nova guia -->

                <script>
                  document.addEventListener("DOMContentLoaded", function() {
                    const catalogToggle = document.getElementById("catalogToggle");
                    const catalogOptions = document.getElementById("catalogOptions");

                    const atdElement = document.getElementsByName("tarefa")[0];
                    const atd_id = atdElement ? atdElement.value : "";

                    // Pegando os dados da sessão via PHP
                    const clt_id = `<?php echo addslashes($clt_id); ?>`;
                    const cargo = `<?php echo isset($_SESSION['user_funcao']) ? addslashes($_SESSION['user_funcao']) : ''; ?>`;
                    const user_id = `<?php echo isset($_SESSION['user_id']) ? addslashes($_SESSION['user_id']) : ''; ?>`;

                    // Alternar dropdown manualmente ao clicar no ícone do livro
                    catalogToggle.addEventListener("click", function(event) {
                      event.preventDefault();
                      catalogOptions.classList.toggle("d-none");
                    });

                    // Fechar dropdown ao clicar fora
                    document.addEventListener("click", function(event) {
                      if (!catalogToggle.contains(event.target) && !catalogOptions.contains(event.target)) {
                        catalogOptions.classList.add("d-none");
                      }
                    });

                    // Evento para capturar clique nos itens do menu e enviar via AJAX
                    document.querySelectorAll(".catalog-item").forEach((item) => {
                      item.addEventListener("click", function(e) {
                        e.preventDefault();
                        const categoria_id = this.getAttribute("data-value"); // Identifica qual item foi clicado

                        // Envia os dados via AJAX para localizar_catalogo.php
                        $.ajax({
                          url: "../catlg/localizar_catalogo.php",
                          type: "POST",
                          data: {
                            clt_id: clt_id,
                            categoria_id: categoria_id,
                            cargo: cargo,
                            user_id: user_id,
                            atd_id: atd_id
                          },
                          dataType: "json",
                          success: function(response) {
                            // console.log("Resposta do servidor:", response);


                            // ?? Se houver apenas 1 catálogo, redireciona diretamente
                            if (response.status === "open_new_tab") {
                              window.open(response.url, "_blank"); // ?? Abre em uma nova aba
                            }
                            // ?? Se houver mais de 1 catálogo, envia os dados via POST
                            else if (response.status === "post") {
                              let form = $("<form>", {
                                method: "POST",
                                action: response.url
                              });

                              $.each(response.data, function(name, value) {
                                if (Array.isArray(value)) {
                                  // ?? Enviar como múltiplos inputs hidden
                                  value.forEach(function(item) {
                                    form.append($("<input>", {
                                      type: "hidden",
                                      name: name + "[]", // Mantém a estrutura de array no PHP
                                      value: item
                                    }));
                                  });
                                } else {
                                  form.append($("<input>", {
                                    type: "hidden",
                                    name: name,
                                    value: value
                                  }));
                                }
                              });

                              $("body").append(form);
                              form.submit();
                            }

                            // ?? Se não houver catálogo ou não tiver permissão, recarrega a página
                            else if (response.status === "reload") {
                              //recarregar a pagina
                              // console.log("Status:", response.status);
                              // console.log("Mensagem:", response.message);                              
                              // console.log("tarefa:", response.atd_id);

                              // Cria um formulário com os dados de POST
                              var form = document.createElement("form");
                              form.method = "POST";
                              // form.action = response.url || './atd/atd.php'; // Alvo da página, por padrão é atd.php
                              //recarregar a pagina
                              // response.url = window.location.href;
                              form.action = window.location.href;

                              // Adiciona o campo 'atd_id' ao formulário
                              var atdInput = document.createElement("input");
                              atdInput.type = "hidden";
                              atdInput.name = "tarefa"; // Nome do campo
                              atdInput.value = response.atd_id; // Valor do campo, vindo da resposta JSON
                              form.appendChild(atdInput);

                              // Adiciona o formulário ao corpo da página
                              document.body.appendChild(form);

                              // Envia o formulário
                              form.submit();
                            }
                          },
                          error: function(xhr, status, error) {
                            console.error("Erro na requisição AJAX:", xhr.responseText);
                            alert("Erro ao buscar o catálogo.");
                          }
                        });

                      });
                    });
                  });
                </script>


                <!-- Fim do menu de catálogo -->



                <hr class="p-0 mt-2 mb-0">
                <li class="mt-1 align-items-center">
                  <div class="row px-0 mx-0 ">
                    <div class="col-10 pt-1 small">
                      <strong>Classificação da Tarefa:</strong>
                    </div>
                    <?php if ($m3_01 == 3) { ?>
                      <div class="col-2 text-right">
                        <button type="button" class="btn btn-outline-secondary btn-sm small" data-toggle="modal" data-target="#tarefa_edt"> <i class="far fa-edit"></i></button>
                      </div>
                    <?php } ?>
                  </div>
                </li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center">
                  <?php if ($tarefa_forma == 1) { ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> Tarefa Remota <?php } ?>
                  <?php if ($tarefa_forma == 2) { ?> <i class="fas fa-briefcase mr-2 text-danger"></i> Tarefa Presencial <?php } ?>
                  <?php if ($tarefa_forma == 3) { ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> Tarefa Remota - Plantão <?php } ?>
                  <?php if ($tarefa_forma == 4) { ?> <i class="fas fa-briefcase mr-2 text-danger"></i> Tarefa Presencial - Plantão <?php } ?>
                  <?php if ($possui_projeto) { ?> <span class="badge badge-warning ml-3"><?php echo $tarefa_dias; ?> Dias<span> <?php } ?>
                      <?php if ($tarefa_reincidente == 1) { ?>
                        <i class=" ml-3 fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
                      <?php } ?>
                </li>
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-archive mr-2"></i><?php echo $tarefa_tipo_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-folder-open ml-3 mr-2"></i><?php echo $cat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-file-alt ml-5 mr-2 text-primary"></i><?php echo $scat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-list-ol ml-5 pl-4 mr-2"></i><?php echo $itens_nome; ?></li>
              </ul>
            </div>
          </div>

        </div>

        <div class="col-md-6 px-1">

          <div class="card">
            <div class="h6 card-header py-1">
              <div class="row">
                <div class="col-6 h6 pt-2 mb-0">
                  <i class="fas fa-check"></i> Ações
                </div>
                <div class="col-6 text-right px-0">
                  <?php if ($tarefa_status == 0) { ?>
                    <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Atendimento Agendado </button>
                  <?php } ?>
                  <?php if ($tarefa_status == 1) { ?>
                    <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="fas fa-hourglass-half"></i> Aguardando Execução </button>
                  <?php } ?>
                  <?php if ($tarefa_status == 2) { ?>
                    <button type="button" class="btn btn-primary btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Atendimento em Execução </button>
                  <?php } ?>
                  <?php if ($tarefa_status == 3) { ?>
                    <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Atendimento em Espera </button>
                  <?php } ?>
                  <?php if ($tarefa_status == 4) { ?>
                    <button type="button" class="btn btn-success btn-sm btn-block text-center text-dark"> <i class="fas fa-check"></i> Atendimento Finalizado </button>
                  <?php } ?>
                </div>
              </div>
            </div>
            <div class="card-body py-1">

              <div class="form-row">
                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Abertura:</label>
                  <input class="form-control form-control-sm" value="<?php echo date('d/m/y H:i', strtotime($tarefa_hora_abertura)); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Prazo:</label>
                  <input class="form-control form-control-sm" value="<?php echo $time_limit_to_close = date("d/m/y H:i", strtotime($tarefa_hora_abertura . " +20 hours")); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Técnico:</label>
                  <input class="form-control form-control-sm" value="<?php echo $tecnico_nome; ?>" disabled="">
                </div>
              </div>

              <div class="form-row">

                <div class="form-group col-sm-12">
                  <label class="my-0 small">Nome da Tarefa:</label>
                  <textarea class="form-control form-control-sm" rows="2" disabled=""><?php echo $nomeTarefa; ?></textarea>
                </div>


                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descrição de abertura:</label>
                  <textarea class="form-control form-control-sm" rows="4" disabled=""><?php echo $tarefa_desc_abertura; ?></textarea>
                </div>
              </div>
              <?php if ($tarefa_status == 4) { ?>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Descrição de fechamento:</label>
                    <textarea class="form-control form-control-sm" rows="3" disabled=""><?php echo $tarefa_desc_fechamento; ?></textarea>
                  </div>
                </div>
              <?php } ?>

              <!-- permissao para o usuario tipo 2 parceiro poder adicionar nova interacao -->
              <?php if ($_SESSION['tipo'] == 2) { ?>
                <div class="row">
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_new_inter">
                      <i class="fas fa-headset"></i> Nova Interação
                    </button>
                  </div>
                </div>
              <?php } else { ?>

                <div class="row">
                  <?php
                  //ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

                  // SE NÃO HOUVER TÉCNICO ATRIBUÍDO PARA O ATENDIMENTO
                  if ($tecnico_id == 0) {
                    $exibe_bt_tarefa_aceitar = true;
                  }

                  // SE O ATENDIMENTO ESTIVER AGUARDANDO E O USUÁRIO FOR O TÉCNICO
                  if ($tarefa_status == 1 && $tecnico_id == $user_id) {
                    $exibe_bt_tarefa_aceitar = true;
                  }

                  // SE O ATENDIMENTO ESTIVER EM ESPERA E O USUÁRIO FOR O TÉCNICO
                  if ($tarefa_status == 3 && $tecnico_id == $user_id) {
                    $exibe_bt_tarefa_retomar = true;
                  }

                  // SE O ATENDIMENTO ESTIVER EM EXECUÇÃO E O USUÁRIO FOR O TÉCNICO
                  if ($tarefa_status == 2 && $tecnico_id == $user_id) {
                    $exibe_bt_tarefa_devolver = true;
                    $exibe_bt_tarefa_espera = true;
                    $exibe_bt_tarefa_finalizar = true;
                  }

                  // ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM A PERMISSÃO DO USUÁRIO
                  if ($m3_02 == 0) {
                    $exibe_bt_tarefa_aceitar = true;
                    $exibe_bt_tarefa_finalizar = true;
                  }
                  if ($m3_03 == 0) {
                    $exibe_bt_tarefa_espera = false;
                  }
                  if ($m3_04 == 0) {
                    $exibe_bt_tarefa_devolver = false;
                  }


                  if ($m3_05 == 2) { // se usuário com permissão para editar tarefas de terceiros
                    if ($tarefa_status == 3) {
                      $exibe_bt_tarefa_retomar = true;
                    }
                    $exibe_bt_tarefa_devolver = true;
                    if ($tarefa_status == 2) {
                      $exibe_bt_tarefa_espera = true;
                    }
                    if ($tarefa_status > 1 && $tarefa_status < 4) {
                      $exibe_bt_tarefa_finalizar = true;
                    }
                  }

                  //  Lógica para esconder o botão finalizar se o atendimento estiver em espera e o usuário for o técnico
                  if ($tarefa_status == 3 && $tecnico_id == $user_id) {
                    $exibe_bt_tarefa_retomar = true;
                    $exibe_bt_tarefa_finalizar = false; // Escondendo o bichin
                  }

                  ?>

                  <?php if ($exibe_bt_tarefa_interacao == true) { ?>

                    <div class="col-3 px-1">
                      <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_new_inter"> <i class="fas fa-headset"></i> Nova Interação </button>
                    </div>
                  <?php } ?>

                  <?php
                  $show = $pdo->prepare("SELECT * FROM tarefas WHERE id = :id");
                  $id = $tarefa;
                  $show->bindParam(':id', $id);
                  $show->execute();
                  $ve_proj = $show->rowCount();
                  if ($ve_proj > 0) {
                    while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
                      $tarefas_relacionadas = $row['tarefas_relacionadas'];
                      $id_projeto = $row["id_projeto"];
                    }
                  }

                  if ($tarefas_relacionadas == 0 || $tarefas_relacionadas == NULL) {
                  ?>
                    <?php if ($exibe_bt_tarefa_aceitar == true) { ?>
                      <div class="col-3 px-1">
                        <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_aceitar"> <i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar </button>
                      </div>
                    <?php } ?>
                    <?php } else {
                    $show = $pdo->prepare("SELECT * FROM tarefas WHERE id = :tarefas_relacionadas");
                    $id = $tarefas_relacionadas;
                    $show->bindParam(':tarefas_relacionadas', $id);
                    $show->execute();
                    $ve_proj = $show->rowCount();
                    if ($ve_proj > 0) {
                      while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
                        $status_tar = $row["status"];
                      }
                    }
                    if ($status_tar == 4) {
                      if ($exibe_bt_tarefa_aceitar == true) { ?>
                        <div class="col-3 px-1">
                          <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_aceitar"> <i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar </button>
                        </div>
                  <?php }
                    }
                  }
                  ?>



                  <?php if ($exibe_bt_tarefa_retomar == true) { ?>
                    <div class="col-3 px-1">
                      <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_retomar"> <i class="far fa-arrow-alt-circle-down"></i> Retomar </button>
                    </div>

                  <?php } ?>

                  <?php
                  $show = $pdo->prepare("SELECT * FROM tarefas WHERE id = :id");
                  $id = $tarefa;
                  $show->bindParam(':id', $id);
                  $show->execute();
                  $ve_proj = $show->rowCount();
                  if ($ve_proj > 0) {
                    while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
                      $id_projeto = $row['id_projeto'];
                    }
                  }
                  ?>

                  <?php if ($id_projeto != 0) { ?>
                    <div class="col-3 px-1">
                      <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_porcentagem"> <i class="fas fa-percent"></i> Porcentagem </button>
                    </div>
                  <?php } ?>

                  <?php if ($exibe_bt_tarefa_espera == true) { ?>
                    <div class="col-3 px-1">
                      <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_espera"> <i class="far fa-pause-circle"></i> Colocar em Espera </button>
                    </div>
                  <?php } ?>

                  <?php if ($exibe_bt_tarefa_devolver == true) { ?>
                    <div class="col-3 px-1">
                      <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_recusar"> <i class="far fa-arrow-alt-circle-up"></i> Recusar </button>
                    </div>
                  <?php } ?>

                  <?php if ($exibe_bt_tarefa_finalizar == true) { ?>
                    <div class="col-3 px-1">
                      <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_finalizar"> <i class="far fa-check-circle"></i> Finalizar </button>
                    </div>


                  <?php } ?>


                </div>

              <?php } ?>

            </div>
          </div>

          <!-- alteração inclusao de imagem -->



          <!-- Exibe as imagens -->
          <div class="col-md-12 px-0">
            <div class="card">
              <div class="h6 card-header py-1">
                <div class="col-12 h6 pt-2 px-1">
                  <i class="fas fa-camera"></i> Imagens
                </div>
              </div>

              <?php if (empty($imagens)) { ?>
                <label class="text-muted d-flex justify-content-center">Não existe imagem salva para este atendimento</label>
                <div class="row mt-2 align-items-center justify-content-center" style="margin-bottom: 10px;">
                  <div class="col-4 px-1">
                    <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#addImagemModal"> <i class="far fa-plus-square"></i> Adicionar Imagem</button>
                  </div>
                </div>
              <?php } else { ?>
                <div class="d-flex flex-wrap justify-content-center">
                  <?php foreach ($imagens as $index => $img_url) { ?>
                    <div class="image-container" style="margin: 10px;">
                      <img src="<?= $img_url ?>" alt="Imagem da tarefa" class="img-thumbnail" style="width: 100px; height: auto; cursor: pointer;" data-toggle="modal" data-target="#imagemModal" data-img-id="<?= $imagens_ids[$index] ?>" data-img-url="<?= $img_url ?>">
                      <input type="file" id="img_tarefa_<?= $index ?>" name="img_tarefa_<?= $index ?>" data-img-present="true" style="display: none;">
                    </div>
                  <?php } ?>
                </div>
                <div class="row mt-2 align-items-center justify-content-center" style="padding-bottom: 10px;">
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#addImagemModal"> <i class="far fa-plus-square"></i> Adicionar Imagem</button>
                  </div>
                </div>
              <?php } ?>
            </div>
          </div>


          <!-- Modal para exibir a imagem -->
          <div class="modal fade" id="imagemModal" tabindex="-1" role="dialog" aria-labelledby="imagemModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered justify-content-center" role="document">
              <div class="modal-content" style="min-width: 800px; height: 600px;">
                <div class="modal-header">
                  <h5 class="modal-title" id="imagemModalLabel">Imagem</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="modal-body text-center">
                  <img id="modalImagem" src="" alt="Imagem do atendimento" style="max-width: 700px; max-height: 450px;">
                </div>
                <div class="row mt-0 align-items-center justify-content-center" style="padding-bottom: 10px; margin-left: 10px; margin-right: 10px;">

                  <?php if ($_SESSION['tipo'] == 2) { ?>

                    <div class="col-3 px-2">
                      <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-dismiss="modal">
                        <i class="fas fa-times"></i> Fechar
                      </button>
                    </div>

                  <?php } else { ?>

                    <div class="col-3 px-2">
                      <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#editImagemModal" id="editImagemBtn">
                        <i class="far fa-edit"></i> Editar Imagem
                      </button>
                    </div>
                    <div class="col-3 px-2">
                      <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" id="deleteImagemBtn">
                        <i class="far fa-trash-alt"></i> Excluir Imagem
                      </button>
                    </div>
                    <div class="col-3 px-2">
                      <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-dismiss="modal">
                        <i class="fas fa-times"></i> Fechar
                      </button>
                    </div>

                  <?php } ?>

                </div>
              </div>
            </div>
          </div>

          <!-- Formulário oculto para enviar dados de exclusáo -->
          <form id="deleteImagemForm" method="POST" style="display: none;">
            <input type="hidden" id="deleteImagemId" name="img_id">
          </form>



          <!-- Modal para editar a imagem -->
          <div class="modal fade" id="editImagemModal" tabindex="-1" role="dialog" aria-labelledby="editImagemModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="editImagemModalLabel">Editar Imagem</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <form id="editImagemForm" method="POST" enctype="multipart/form-data">
                    <input type="hidden" id="editImagemId" name="img_id">
                    <input type="hidden" id="user_id" name="user_id" value="<?= $user_id ?>">
                    <div class="form-group">
                      <label for="editImagemInput">Nova Imagem</label>
                      <input type="file" class="form-control-file" id="editImagemInput" name="editImagemInput">
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                  <button type="button" class="btn btn-primary" id="saveEditImageBtn">Salvar</button>
                </div>
              </div>
            </div>
          </div>



          <!-- Modal para adicionar imagem -->
          <div class="modal fade" id="addImagemModal" tabindex="-1" role="dialog" aria-labelledby="addImagemModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="addImagemModalLabel">Adicionar Imagem</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <form id="addImagemForm" method="POST" enctype="multipart/form-data">
                    <input type="hidden" id="adduser_id" name="user_id" value="<?= $user_id ?>">
                    <div class="form-group">
                      <label for="addImagemInput">Nova Imagem</label>
                      <input type="file" class="form-control-file" id="addImagemInput" name="addImagemInput">
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                  <button type="button" class="btn btn-primary" id="saveAddImageBtn">Adicionar</button>
                </div>
              </div>
            </div>
          </div>

          <!-- fim alteração inclusao de imagem -->



        </div>


        <div class="col-md-3 px-1">
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-list-ol"></i> Histórico da Tarefa #<?php echo str_pad($tarefa, 5, '0', STR_PAD_LEFT); ?>
            </div>

            <div class="card-body">

              <div class="timeline">
                <?php
                
                $show_inter = $pdo->prepare("SELECT inter_tarefa.*, usuarios.user_nome FROM inter_tarefa INNER JOIN usuarios ON usuarios.user_id = inter_tarefa.inter_user WHERE inter_tarefa.inter_tarefa = '$tarefa' AND inter_tarefa.inter_tipo > '0' ORDER BY inter_id DESC");
                $show_inter->execute();
                while ($exibe = $show_inter->fetch(PDO::FETCH_ASSOC)) {
                  $inter_tipo = $exibe["inter_tipo"];
                  $inter_data = $exibe["inter_data"];
                  $inter_desc = $exibe["inter_desc"];
                  $inter_user = $exibe["user_nome"];

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
                  } //6 = Retomada da tarefa
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
                  } //9 = Edição da classificação da tarefa
                ?>
                  <div class="tl-item <?php echo $tl_active_color; ?>">
                    <div class="tl-dot <?php echo $tl_dot_color; ?>"></div>
                    <div class="tl-content">
                      <div class="tl-date text-muted"><i class="far fa-user"></i> <?php echo $inter_user; ?> <i class="far fa-clock"></i> <?php echo $dt1 = date('d/m/y H:i', strtotime($inter_data)); ?></div>
                      <div class=""><?php echo $inter_desc; ?> </div>
                    </div>
                  </div>
                <?php } ?>
              </div>

            </div>
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
              <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="tarefa_new_inter">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
            </div>
          </form>
        </div>
      </div>
    </div>


    <!-- MODAL EDIÇÃO DA CLASSIFICAÇÃO DA TAREFA-->
    <div class="modal fade" id="tarefa_edt" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição da classificação da tarefa</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1 d-flex flex-column">
              <div class="form-row pt-2">
                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Tipo de atendimento:</label>
                  <select name="tipo" class="form-control form-control-sm selectpicker" data-container="body" data-width="100%" required="required" tabindex="4">
                    <option></option>
                    <option value="1" <?php if ($tarefa_tipo == 1) {
                                        echo " selected";
                                      } ?>>Falha</option>
                    <option value="2" <?php if ($tarefa_tipo == 2) {
                                        echo " selected";
                                      } ?>>Relacionamento</option>
                    <option value="3" selected<?php if ($tarefa_tipo == 3) {
                                                echo " selected";
                                              } ?>>Requisição de Serviços</option>
                    <option value="4" <?php if ($tarefa_tipo == 4) {
                                        echo " selected";
                                      } ?>>Requisição de informação</option>
                    <option value="5" <?php if ($tarefa_tipo == 5) {
                                        echo " selected";
                                      } ?>>Notificação de monitoramento</option>
                    <option value="6" <?php if ($tarefa_tipo == 6) {
                                        echo " selected";
                                      } ?>>Melhorias</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Categoria:</label>
                  <select name="categoria" id="categoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="5">
                    <option></option>
                    <?php
                    
                    $show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
                    $show_clt->execute();
                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                      $cat_id = $exibe["cat_id"];
                      $cat_nome = $exibe["cat_nome"];
                    ?>
                      <option value="<?php echo $cat_id; ?>" <?php if ($cat_id == $tarefa_cat) {
                                                                echo " selected";
                                                              } ?>><?php echo $cat_nome; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Sub Categoria:</label>
                  <span class="carregando3 small">Aguarde, carregando...</span>
                  <select name="subcategoria" id="subcategoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="6">
                    <option value="<?php echo $tarefa_scat; ?>"><?php echo $scat_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Item:</label>
                  <span class="carregando4 small">Aguarde, carregando...</span>
                  <select name="item" id="item" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="7">
                    <option value="<?php echo $tarefa_item; ?>"><?php echo $tarefa_itens_nome; ?></option>
                  </select>
                </div>


                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Nível:</label>
                  <select name="nivel" class="form-control form-control-sm selectpicker" data-container="body" data-width="100%" required="required" tabindex="8">
                    <option></option>
                    <option value="1" <?php if ($tarefa_nivel == 1) {
                                        echo " selected";
                                      } ?>>Nível 1</option>
                    <option value="2" <?php if ($tarefa_nivel == 2) {
                                        echo " selected";
                                      } ?>>Nível 2</option>
                    <option value="3" <?php if ($tarefa_nivel == 3) {
                                        echo " selected";
                                      } ?>>Nível 3</option>
                    <option value="4" <?php if ($tarefa_nivel == 4) {
                                        echo " selected";
                                      } ?>>Rotina</option>
                    <option value="5" <?php if ($tarefa_nivel == 5) {
                                        echo " selected";
                                      } ?>>Administrativo</option>
                    <option value="0" <?php if ($tarefa_nivel == 0) {
                                        echo " selected";
                                      } ?>>NA</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Forma de atendimento:</label>
                  <select name="forma" class="form-control form-control-sm selectpicker" data-container="body" data-width="100%" required="required" tabindex="9">
                    <option></option>
                    <option value="1" <?php if ($tarefa_forma == 1) {
                                        echo " selected";
                                      } ?>>Remoto</option>
                    <option value="2" <?php if ($tarefa_forma == 2) {
                                        echo " selected";
                                      } ?>>Presencial</option>
                    <option value="3" <?php if ($tarefa_forma == 3) {
                                        echo " selected";
                                      } ?>>Remoto - Plantão</option>
                    <option value="4" <?php if ($tarefa_forma == 4) {
                                        echo " selected";
                                      } ?>>Presencial - Plantão</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-10">
                  <label class="my-0 small">Descrição de abertura:</label>
                  <textarea name="desc_abertura" class="form-control form-control-sm" rows="5" required="required" tabindex="9"><?php echo htmlspecialchars($tarefa_desc_abertura); ?></textarea>
                </div>


              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="tarefa_edt">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-danger">Editar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <?php if ($exibe_bt_tarefa_aceitar == true) { ?>
      <!-- MODAL ACEITE DO CHAMADO -->
      <div class="modal fade" id="tarefa_aceitar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down text-success"></i> Iniciar atendimento ou direcionar para outro técnico</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <label class="small"><strong>Iniciar o atendimento:</strong></label>
                <label class="small">Se o técnico informado for o próprio usuário: a) este atendimento ficará sob sua responsabilidade; b) o status da tarefa será alterado para "Em execução".</label>
                <label class="small pt-1"><strong>Direcionar a outro técnico:</strong></label>
                <label class="small">Se o técnico informado NÃO for o próprio usuário: a) este atendimento será redirecionado para a fila de tarefas do técnico informado; b) este atendimento continuará com o status "Aguardando atendimento" até que o técnico responsável confirme o início da execução.</label>
                <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Técnico responsável:</label>
                    <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="9">
                      <?php
                      
                      $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $tecnico_id = $exibe["user_id"];
                        $tecnico_nome = $exibe["user_nome"];
                      ?>
                        <option value="<?php echo $tecnico_id; ?>" <?php if ((int)$tecnico_id === (int)$user_id_logado) {
                          echo " selected";
                        } ?>>
                          <?php echo $tecnico_nome; ?>
                        </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="tarefa_aceitar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_tarefa_retomar == true) { ?>
      <!-- MODAL RETOMAR ATENDIMENTO -->
      <div class="modal fade" id="tarefa_retomar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down"></i> Retomar</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <label class="small"><b>Confirmação de retomada da tarefa.</b></label>
              <label class="small"><b><i>Este atendimento estava aguardando o retorno de um terceiro. <br>Ao retomar este atendimento ele ficará sob sua responsabilidade.</i></b></label>
              <label class="small" style="color: red;"><b><i><br>Não esqueça de informar todas interAções com o cliente.</i></b></label>
            </div>
            <div class="modal-footer">
              <form action="#" method="POST">
                <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="tarefa_retomar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Retomar o atendimento</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_tarefa_espera == true) { ?>
      <!-- MODAL COLOCAR EM ESPERA -->
      <div class="modal fade" id="tarefa_espera" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-pause-circle text-warning"></i> Colocar atendimento em espera</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <label class="small">tarefas em Espera são aqueles que não podem ser finalizados pois é preciso aguardar um retorno de alguém <b> externo </b> a Nível 3 TI.</label>
                <label class="small">Ao colocar em espera: a) este atendimento continuará sob a sua responsabilidade; b) o status da tarefa será alterado para "Em espera"; c) Após o período de espera, o status da tarefa será alterado para "Em Execução".</label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Motivo da espera:</label>
                    <textarea name="espera_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Data prevista para encerramento da espera:</label>
                    <input type="text" id="datetimepicker" name="espera_prev" value="<?php echo date("Y-m-d H:i", strtotime($agora . " +2 days")); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="2">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="tarefa_espera">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Colocar em espera</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <!-- MODAL COLOCAR PORCENTAGEM -->
    <div class="modal fade" id="tarefa_porcentagem" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"><i class="fas fa-percent text-warning"></i> Coloque a porcentagem do atendimento:</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group col-sm-12">
                  <?php
                  $show = $pdo->prepare("SELECT * FROM tarefas WHERE id = :id");
                  $id = $tarefa;
                  $show->bindParam(':id', $id);
                  $show->execute();
                  $vee_proj = $show->rowCount();
                  if ($vee_proj > 0) {
                    while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
                      $porcentagem_atual = $row['porcentagem'];
                    }
                  } ?>
                  <label class="my-0 small">Porcentagem Concluida da Tarefa:</label>
                  <?php if ($porcentagem_atual == 100) { ?>
                    <input type="number" readonly class="form-control" name="porcentagem" id="porcentagem" value=0 min=0 max=100>
                  <?php } else { ?>
                    <input type="number" class="form-control" name="porcentagem" id="porcentagem" value=<?php echo $porcentagem_atual; ?> min=0 max=100>
                  <?php } ?>
                </div>
                <label class="my-0 small">Porcentagem Atual:</label>
                <input type="text" class="form-control" readonly value="<?php echo $porcentagem_atual; ?>%">
              </div>
              <div class="modal-footer">
                <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="tarefa_porcentagem">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">OK</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>


    <?php if ($exibe_bt_tarefa_devolver == true) { ?>
      <!-- MODAL RECUSAR ATENDIMENTO -->
      <div class="modal fade" id="tarefa_recusar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-arrow-alt-circle-up text-danger"></i> Recusar ou direcionar atendimento</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div class="form-row">
                  <label class="small"><strong>Recusar atendimento:</strong></label>
                  <label class="small">Ao confirmar esta tela SEM informar um técnico: a) o atendimento voltará para a fila de atendimento sem um responsável; b) este atendimento continuará com o status "Aguardando atendimento" até que um técnico o aceite.</label>
                  <label class="small pt-1"><strong>Direcionar atendimento:</strong></label>
                  <label class="small">Ao confirmar esta tela informando um técnico responsável: a) este atendimento será redirecionado para a fila de tarefas do técnico informado; b) este atendimento continuará com o status "Aguardando atendimento" até que o técnico responsável confirme o início da execução.</label>
                  <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Técnico responsável:</label>
                    <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="9">
                      <option value="0">Não atribuído</option>
                      <?php
                      
                      $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $tecnico_id = $exibe["user_id"];
                        $tecnico_nome = $exibe["user_nome"];
                      ?>
                        <option value="<?php echo $tecnico_id; ?>"><?php echo $tecnico_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Justificativa para recusa ou direcionamento:</label>
                    <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="tarefa_recusar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-danger">Recusar Atendimento</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

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
                <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="tarefa_finalizar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>
    <!-- MODAL DE AJUDA PARA A GESTÃO DE UM ATENDIMENTO -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Gestão da tarefa</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>

          <div class="modal-body">
            <p><strong>O atendimento deve ser gerido da seguinte forma:</strong></p>
            <ul class="list">
              <li>Registre tudo através de <span class="badge badge-light"><i class="fas fa-headset"></i> Nova Interação </span>
                <ul>
                  <li class="small">Comentários do cliente, informações que você observar e o trabalho que você executou devem ser registrados.</li>
                  <li class="small">Cada registro que você fizer será exibido no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico da tarefa</span> com a data/hora e o seu nome.</li>
                </ul>
              </li>
              <li class="pt-1">Iniciei a execução da tarefa através do <span class="badge badge-light"><i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar</span>
                <ul>
                  <li class="small">Se você for o técnico que executará o atendimento, apenas confirme o seu nome como <em>Técnico Responsável</em>.</li>
                  <li class="small">Quando você confirmar seu nome como <em>Técnico Responsável</em> pelo atendimento outras opções de gestão da tarefa aparecerão na sua tela.</li>
                  <li class="small">Se não for você quem executará o atendimento, você pode também informar quem será o técnico que deverá executar o atendimento.</li>
                  <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico da tarefa</span> com a data/hora e o seu nome.</li>
                </ul>
              </li>
              <li class="pt-1">Você pode usar o recurso <span class="badge badge-light"><i class="far fa-pause-circle"></i> Colocar em Espera</span> caso o atendimento precise ser <em>pausado</em> enquanto aguarda um retorno externo.
                <ul>
                  <li class="small">Mas, este recurso só deve ser utilizado quando estamos aguardando um retorno de alguém externo a Nível 3 TI.</li>
                  <li class="small">Você precisará informar uma Data/Hora futura como previsão para encessamento da espera.</li>
                  <li class="small">Quando você colocar um atendimento em espera o prazo para finalizar será <em>pausado</em>.</li>
                  <li class="small">Quando o prazo estabelecido <em>vencer</em> o atendimento voltará para o status <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
                </ul>
              </li>
              <li class="pt-1">Você pode usar o recurso <span class="badge badge-light"><i class="far fa-arrow-alt-circle-up"></i> Recusar</span> para <em>devolver</em> o atendimento a fila de espera ou tranferí-lo para outro técnico.
                <ul>
                  <li class="small">Para fazer isso, você terá que inserir uma justificativa.</li>
                  <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico da tarefa</span> com a data/hora e o seu nome.</li>
                </ul>
              </li>
              <li class="pt-1">Você deve <span class="badge badge-light"><i class="far fa-check-circle"></i> Finalizar</span> o atendimento quando o problema do cliente for sanado.
                <ul>
                  <li class="small">Para fazer isso, você terá que inserir um relato de encerramento.</li>
                  <li class="small">Procure descrever bem o trabalho que você realizou e com quais pessoas você falou.</li>
                </ul>
              </li>



            </ul>
          </div>

        </div>
      </div>
    </div>

  <?php } ?>
  <?php if (isset($mensagem)) { ?>
    <div class="row pull-right" style="position:absolute; top: 65px; right:25px; z-index: 3;">
      <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
        <?php echo $mensagem; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  <?php } ?>
  <?php include_once("../all/update_pass.php"); ?>



  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>
  <script src="../js/bootstrap-datetimepicker.js"></script>

  <script>
    function normalizeSelectpickers(scope) {
      if (!$.fn.selectpicker) {
        return;
      }
      $(scope || document).find('.selectpicker').each(function() {
        var $select = $(this);
        $select.attr('data-container', 'body');
        $select.attr('data-width', '100%');
        if ($select.data('selectpicker')) {
          $select.selectpicker('refresh');
        } else {
          $select.selectpicker({
            container: 'body',
            width: '100%',
            dropupAuto: false,
            size: 8
          });
        }
      });
    }

    function hideEnhancedSelect(selector) {
      var $select = $(selector);
      $select.hide();
      $select.parent('.bootstrap-select').hide();
    }

    function showEnhancedSelect(selector) {
      var $select = $(selector);
      $select.show();
      normalizeSelectpickers(document);
      $select.parent('.bootstrap-select').show();
    }

    normalizeSelectpickers(document);

    $(document).on('shown.bs.select', '.selectpicker', function() {
      var $select = $(this);
      var $button = $select.parent('.bootstrap-select').find('> button.dropdown-toggle');
      var $container = $('.bs-container.bootstrap-select').last();
      var $menu = $container.find('> .dropdown-menu');

      if (!$menu.length) {
        $menu = $select.parent('.bootstrap-select').find('> .dropdown-menu');
      }

      if ($button.length && $menu.length) {
        var width = Math.min(Math.max($button.outerWidth(), 180), 420, window.innerWidth - 24);
        $container.css({
          width: width,
          minWidth: width,
          maxWidth: width
        });
        $menu.css({
          width: width,
          minWidth: width,
          maxWidth: width
        });
      }
    });
  </script>

  <?php if (empty($tarefa) || $exibe_bt_tarefa_espera == true) { ?>
    <!-- CAMPO DE DATA E HORA DA TELA DE ESPERA -->
    <script type="text/javascript" src="../js/bootstrap-datetimepicker.js" charset="UTF-8"></script>
    <script type="text/javascript">
      $.fn.datetimepicker.dates['en'] = {
        format: 'dd/mm/yyyy',
        days: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
        daysShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
        daysMin: ["Do", "Se", "Te", "Qu", "Qu", "Se", "Sa", "Do"],
        months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
        monthsShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        today: "Hoje",
        suffix: [],
        meridiem: []
      };
    </script>
    <script type="text/javascript">
      $(".form_datetime").datetimepicker({
        format: "yyyy-mm-dd hh:ii",
        container: "body",
        pickerPosition: "bottom-left",
        autoclose: true,
        zIndex: 2070
      });

      $('.form_datetime').on('show', function() {
        window.setTimeout(function() {
          $('.datetimepicker.dropdown-menu:visible').each(function() {
            var $picker = $(this);
            var left = parseInt($picker.css('left'), 10) || 0;
            var maxLeft = Math.max(8, window.innerWidth - $picker.outerWidth() - 12);

            if (left > maxLeft) {
              $picker.css('left', maxLeft);
            } else if (left < 8) {
              $picker.css('left', 8);
            }
          });
        }, 0);
      });

    </script>
  <?php } ?>


  <!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
  <script src="../js/loader.js" type="text/javascript"></script>
  <?php if (empty($tarefa)) { ?>
    <script type="text/javascript">
      //pupula os selects solicitante e local de acordo com o cliente escolhido
      $(function() {
        $('#cliente').change(function() {
          if ($(this).val()) {
            hideEnhancedSelect('#solicitante');
            hideEnhancedSelect('#local');
            $('.carregando').show();
            $('.carregando2').show();
            $.getJSON('busca_solicitantes.php?search=', {
              cliente: $(this).val(),
              ajax: 'true'
            }, function(j) {
              var options = '<option value="">Escolha o solicitante</option>';
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }
              $('#solicitante').html(options);
              showEnhancedSelect('#solicitante');
              $('.carregando').hide();
            });
            $.getJSON('busca_locais.php?search=', {
              cliente: $(this).val(),
              ajax: 'true'
            }, function(j) {
              var options = '<option value="">Escolha o local</option>';
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }
              $('#local').html(options);
              showEnhancedSelect('#local');
              $('.carregando2').hide();
            });
          } else {
            $('#solicitante').html('<option value="">Escolha o Solicitante</option>');
            $('#local').html('<option value="">Escolha o Local</option>');
            normalizeSelectpickers(document);
          }
        });
      });
    </script>
  <?php } ?>
  <script type="text/javascript">
    //pupula os selects subcategoria de acordo com a categoria escolhida
    $(function() {
      $('#categoria').change(function() {
        if ($(this).val()) {
          hideEnhancedSelect('#subcategoria');
          $('.carregando3').show();
          $.getJSON('busca_subcategorias.php?search=', {
            categoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha a Subcategoria</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#subcategoria').html(options);
            showEnhancedSelect('#subcategoria');
            $('.carregando3').hide();
          });

        } else {
          $('#subcategoria').html('<option value="">Escolha a Subcategoria</option>');
          normalizeSelectpickers(document);
        }
      });
    });
  </script>
  <script type="text/javascript">
    //pupula os selects ITEM de acordo com a SUBcategoria escolhida
    $(function() {
      $('#subcategoria').change(function() {
        if ($(this).val()) {
          hideEnhancedSelect('#item');
          $('.carregando4').show();
          $.getJSON('busca_itens.php?search=', {
            subcategoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha o Item</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#item').html(options);
            showEnhancedSelect('#item');
            $('.carregando4').hide();
          });
        } else {
          $('#item').html('<option value="">Escolha o Item</option>');
          normalizeSelectpickers(document);
        }
      });
    });
  </script>


  <?php if (isset($mensagem)) { ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000);
    </script>
  <?php } ?>

  <?php
  #################################################################################################
  if (isset($possui_projeto)) {

    
    $show_tarefa = $pdo->prepare("
SELECT tarefas.id_projeto, tarefas.nome_tarefa, tarefas.tarefas_relacionadas, tarefas.porcentagem, tarefas.status
FROM tarefas 
left JOIN projetos p ON p.id = tarefas.id_projeto
WHERE tarefas.id = '$tarefa'");
    $show_tarefa->execute();

    while ($row = $show_tarefa->fetch(PDO::FETCH_ASSOC)) {
      $projeto_id = $row['id_projeto'];
      $nome_tarefa = $row['nome_tarefa'];
      $depend = $row['tarefas_relacionadas'];
      $porcent = $row['porcentagem'];
      $status = $row["status"];
    }

    $data_real_espera = NULL;
    $data_real_finalizou = NULL;
    $data_real_retomou = NULL;
    /* $tipo = NULL;
  $projeto_id = NULL; */

    $show = $pdo->prepare("SELECT * FROM inter_tarefa WHERE inter_tarefa = :id");
    $id = $tarefa;
    $show->bindParam(':id', $id);
    $show->execute();
    $conta_inter_tarefas = $show->rowCount();
    if ($conta_inter_tarefas > 0) {
      while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
        $tipo = $row['inter_tipo'];

        #VE A DATA E HORA EM QUE A TAREFA FOI INICIADA#
        if ($tipo == 2 and $projeto_id != NULL) {
          $inter_inicio = new Datetime($row['inter_data']);
          $inicioformatd = date_format($inter_inicio, 'd');
          $inicioformatm = date_format($inter_inicio, 'm');
          $inicioformaty = date_format($inter_inicio, 'Y');
          $inicioformath = date_format($inter_inicio, 'H:i:s');
          $inicioH = intVal(date_format($inter_inicio, 'H'));
          $inicioM = intVal(date_format($inter_inicio, 'i'));
          $inicioS = intVal(date_format($inter_inicio, 's'));
          /*  var_dump($inicioformatd);*/
          /* var_dump($tipo); */

          $data_inicio_real = date_format($inter_inicio, $inicioformaty . '/' . $inicioformatm . '/' . $inicioformatd); // ESSA é A DATA REAL DE INICIO DO PROJETO.
          $date = date_create($data_inicio_real . $inicioformath);
          $data_real_inicio = date_format($date, 'Y-m-d H:i:s');


          /* echo "TAREFA COMEÇOU ". $inicioformath ."id = " .$id . "projeto" . $projeto_id; */
          /* var_dump($data_inicio_real);
    var_dump($inicioformath); */
        }
        #VE A DATA E HORA EM QUE A TAREFA FOI COLOCADA EM ESPERA#
        elseif ($tipo == 5 and $projeto_id != NULL) {
          $inter_espera = new Datetime($row['inter_data']);
          $esperaformatd = date_format($inter_espera, 'd');
          $esperaformatm = date_format($inter_espera, 'm');
          $esperaformaty = date_format($inter_espera, 'Y');
          $esperaformath = date_format($inter_espera, 'H:i:s');
          $esperarealH = intVal(date_format($inter_espera, 'H'));
          $esperarealM = intVal(date_format($inter_espera, 'i'));
          $esperarealS = intVal(date_format($inter_espera, 's'));
          $data_espera_real = date_format($inter_espera, $esperaformaty . '/' . $esperaformatm . '/' . $esperaformatd);
          $date = date_create($data_espera_real . $esperaformath);
          $data_real_espera = date_format($date, 'Y-m-d H:i:s');
          /* var_dump($data_espera_real);
    var_dump($esperaformath);
    var_dump($tipo); */
          /*  echo "TAREFA ESPERA ". $esperaformath . "id = ".$id . "projeto" . $projeto_id; */
        }
        #VE A DATA E HORA EM QUE A TAREFA RETORNOU DA ESPERA#
        elseif ($tipo == 6 and $projeto_id != NULL) {
          $inter_retomou = new Datetime($row['inter_data']);
          $retomouformatd = date_format($inter_retomou, 'd');
          $retomouformatm = date_format($inter_retomou, 'm');
          $retomouformaty = date_format($inter_retomou, 'Y');
          $retomouformath = date_format($inter_retomou, 'H:i:s');
          $retomourealH = intVal(date_format($inter_retomou, 'H'));
          $retomourealM = intVal(date_format($inter_retomou, 'i'));
          $retomourealS = intVal(date_format($inter_retomou, 's'));
          $data_retomou_real = date_format($inter_retomou, $retomouformaty . '/' . $retomouformatm . '/' . $retomouformatd);
          $date = date_create($data_retomou_real . $retomouformath);
          $data_real_retomou = date_format($date, 'Y-m-d H:i:s');
        } elseif ($tipo == 8 and $projeto_id != NULL) {
          $inter_finalizou = new Datetime($row['inter_data']);
          $finalizouformatd = date_format($inter_finalizou, 'd');
          $finalizouformatm = date_format($inter_finalizou, 'm');
          $finalizouformaty = date_format($inter_finalizou, 'Y');
          $finalizouformath = date_format($inter_finalizou, 'H:i:s');
          $data_finalizou_real = date_format($inter_finalizou, $finalizouformaty . '/' . $finalizouformatm . '/' . $finalizouformatd);
          $date = date_create($data_finalizou_real . $finalizouformath);
          $data_real_finalizou = date_format($date, 'Y-m-d H:i:s');
        }
      }
    }
    $show = $pdo->prepare("SELECT * FROM gantt WHERE id_tarefa = :id");
    $id = $tarefa;
    $show->bindParam(':id', $id);
    $show->execute();
    $gantt_tarefas_update_or_insert = $show->rowCount();
    if ($gantt_tarefas_update_or_insert > 0) {
      while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
        $iniciotar = $row['inicio_tarefa'];
        $esperatar = $row['espera_tarefa'];
        $retomoutar = $row['retomou_tarefa'];
        $retomouAnt = $row['retomou_anterior'];
        $finalizoutar = $row['finalizou_tarefa'];
        $project = $row['id_projeto'];
        $horas_atual = $row['hora_espera'];
        $minutos_atual = $row['minutos_espera'];
        $segundos_atual = $row['segundos_espera'];
        $tipotar = $row['tipo_tarefa'];
        $nometar = $row['nome_tarefa'];
        $porcenttar = $row['porcentagem_tarefa'];
        $dependtar = $row['dependencia_tarefa'];
        $statstar = $row['status_tarefa'];

        $anteriorr = new DateTime(($retomouAnt));
        $anteriorH = intVal(date_format($anteriorr, 'H'));
        $anteriorM = intVal(date_format($anteriorr, 'i'));
        $anteriorS = intVal(date_format($anteriorr, 's'));

        /* var_dump($anteriorH);
    var_dump($anteriorM);
    var_dump($anteriorS);
     */


        $esperaa = new DateTime($esperatar);
        $esperaH = intVal(date_format($esperaa, 'H'));
        $esperaM = intVal(date_format($esperaa, 'i'));
        $esperaS = intVal(date_format($esperaa, 's'));

        $retomoou = new DateTime($retomoutar);
        $retomouH = intVal(date_format($retomoou, 'H'));
        $retomouM = intVal(date_format($retomoou, 'i'));
        $retomouS = intVal(date_format($retomoou, 's'));

        /* var_dump($retomouH);
    var_dump($retomouM);
    var_dump($retomouS); */

        ###############################################################

        if ($data_real_inicio != $iniciotar) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `inicio_tarefa`='$data_real_inicio' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }
        if ($status != $statstar) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `status_tarefa`='$status' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }
        if ($dependtar != $depend) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `dependencia_tarefa`='$depend' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }
        if ($porcenttar != $porcent) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `porcentagem_tarefa`='$porcent' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }

        if ($tipo != $tipotar) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `tipo_tarefa`='$tipo' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }

        if ($data_real_espera != $esperatar) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `espera_tarefa`='$data_real_espera' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }

        if (($data_real_retomou != $retomoutar) and ($data_real_retomou != NULL)) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `retomou_tarefa`='$data_real_retomou' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }

        if (($data_real_finalizou != $finalizoutar) and ($data_real_finalizou != NULL)) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `finalizou_tarefa`='$data_real_finalizou' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }

        if (($nometar != $nome_tarefa)) {
          
          $adc = $pdo->prepare("UPDATE `gantt` SET `nome_tarefa`='$nome_tarefa' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }
      }
      // } elseif (($tipo != NULL and ($tipo == 2 or $tipo == 5 or $tipo == 6)) and $projeto_id != NULL) {
    } elseif (isset($tipo) && ($tipo == 2 || $tipo == 5 || $tipo == 6) && $projeto_id != null) {

      
      $adc = $pdo->prepare("INSERT INTO `gantt` (`id_projeto`, `id_tarefa`, `inicio_tarefa`,  `espera_tarefa`, `retomou_tarefa`, `retomou_anterior`, `finalizou_tarefa`, `tipo_tarefa`, `nome_tarefa`, `porcentagem_tarefa`, `dependencia_tarefa`, `status_tarefa`) VALUES (:id_projeto, :id_tarefa,  :inicio_tarefa, :espera_tarefa, :retomou_tarefa, :retomou_anterior, :finalizou_tarefa, :tipo_tarefa,:nome_tarefa,:porcentagem_tarefa,:dependencia_tarefa,:status_tarefa);");
      $adc->bindParam(':id_projeto', $projeto_id);
      $adc->bindParam(':id_tarefa', $tarefa);
      $adc->bindParam(':inicio_tarefa', $data_real_inicio);
      $adc->bindParam(':espera_tarefa', $data_real_espera);
      $adc->bindParam(':retomou_tarefa', $data_real_retomou);
      $adc->bindParam(':tipo_tarefa', $tipo);
      $adc->bindParam(':retomou_anterior', $data_real_retomou);
      $adc->bindParam(':finalizou_tarefa', $data_real_finalizou);
      $adc->bindParam(':nome_tarefa', $nome_tarefa);
      $adc->bindParam(':porcentagem_tarefa', $porcent);
      $adc->bindParam(':dependencia_tarefa', $depend);
      $adc->bindParam(':status_tarefa', $status);
      $adc->execute();
    }

    $show = $pdo->prepare("SELECT * FROM gantt WHERE id_tarefa = :id");
    $id = $tarefa;
    $show->bindParam(':id', $id);
    $show->execute();
    $gantt_tarefas_update_or_insert = $show->rowCount();
    if ($gantt_tarefas_update_or_insert > 0) {
      while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
        $retomoutar = $row['retomou_tarefa'];
        $retomouAnt = $row['retomou_anterior'];
        $tipoatt = $row['tipo_tarefa'];

        $horas_atual = $row['hora_espera'];
        $minutos_atual = $row['minutos_espera'];
        $segundos_atual = $row['segundos_espera'];

        if ($tipoatt == 8) {
          $iniciotarefa = $row['inicio_tarefa'];
          $iniciouu = new Datetime($iniciotarefa);
          $iniciouuH = intVal(date_format($iniciouu, 'H'));
          $iniciouuM = intVal(date_format($iniciouu, 'i'));
          $iniciouuS = intVal(date_format($iniciouu, 's'));


          $finalizoutarefa = $row['finalizou_tarefa'];
          $finalizoou = new Datetime($finalizoutarefa);
          $finalizoouH = intVal(date_format($finalizoou, 'H'));
          $finalizoouM = intVal(date_format($finalizoou, 'i'));
          $finalizoouS = intVal(date_format($finalizoou, 's'));

          $intervalotar = $iniciouu->diff($finalizoou);

          /* $test = $intervalotar -> d;
        var_dump($test); */

          echo $intervalotar->m;
          $md = 0;
          if ($intervalotar->m > 0) {
            $md = $intervalotar->m * 30.437;
          }
          $diaas = $md + $intervalotar->d;

          $totaltarH = $intervalotar->h + ($diaas * 24);
          $totaltarM = $intervalotar->i;
          $totaltarS = $intervalotar->s;


          
          $adc = $pdo->prepare("UPDATE `gantt` SET `horas_total`='$totaltarH' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
          $adc = $pdo->prepare("UPDATE `gantt` SET `minutos_total`='$totaltarM' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
          $adc = $pdo->prepare("UPDATE `gantt` SET `segundos_total`='$totaltarS' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
        }

        $anteriorr = new DateTime(($retomouAnt));

        $anteriorD = intVal(date_format($anteriorr, 'd'));
        $anteriorMM = intVal(date_format($anteriorr, 'm'));
        $anteriorY = intVal(date_format($anteriorr, 'y'));
        $anteriorH = intVal(date_format($anteriorr, 'H'));
        $anteriorM = intVal(date_format($anteriorr, 'i'));
        $anteriorS = intVal(date_format($anteriorr, 's'));

        $retomoou = new DateTime($retomoutar);
        $retomouD = intVal(date_format($retomoou, 'd'));
        $retomouMM = intVal(date_format($retomoou, 'm'));
        $retomouY = intVal(date_format($retomoou, 'y'));
        $retomouH = intVal(date_format($retomoou, 'H'));
        $retomouM = intVal(date_format($retomoou, 'i'));
        $retomouS = intVal(date_format($retomoou, 's'));

        if ($retomouH != $anteriorH || $retomouM != $anteriorM || $retomouS != $anteriorS) {
          $intervalotare = $retomoou->diff($anteriorr);

          $mdd = 0;
          if ($intervalotare->m > 0) {
            $mdd = $intervalotare->m * 30.437;
          }
          $diaass = $mdd + $intervalotare->d;


          $totaltareH = $intervalotare->h + ($diaass * 24);
          $totaltareM = $intervalotare->i;
          $totaltareS = $intervalotare->s;


          $tempo_esperaH = $totaltareH + $horas_atual;
          $tempo_esperaM = $totaltareM + $minutos_atual;
          $tempo_esperaS = $totaltareS  + $segundos_atual;

          /* $diasss = $retomouD - $anteriorD;

        if ($diasss > 0) {
          $daytoHour = $diasss * 24;
          $tempo_esperaH = $horas_atual + $daytoHour;
        } */


          if ($tempo_esperaS >= 60) {
            $tempo_esperaM += 1;
            $tempo_esperaS -= 60;
          }
          if ($tempo_esperaM >= 60) {
            $tempo_esperaM -= 60;
            $tempo_esperaH += 1;
          }

          $adc = $pdo->prepare("UPDATE `gantt` SET `hora_espera`='$tempo_esperaH' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
          $adc = $pdo->prepare("UPDATE `gantt` SET `minutos_espera`='$tempo_esperaM' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();
          $adc = $pdo->prepare("UPDATE `gantt` SET `segundos_espera`='$tempo_esperaS' WHERE `id_tarefa`='$tarefa';");
          $adc->execute();

          /* var_dump($tempo_esperaH);
  var_dump($tempo_esperaM);
  var_dump($tempo_esperaS); */

          if (($data_real_retomou != $retomouAnt)) {
            $adc = $pdo->prepare("UPDATE `gantt` SET `retomou_anterior`='$data_real_retomou' WHERE `id_tarefa`='$tarefa';");
            $adc->execute();
          }
        }
      }
    }
  ?>

  <?php
    /* $statsproj = 0; */
    /*$projeto_id = NULL; */
    $show = $pdo->prepare("SELECT * FROM tarefas WHERE id_projeto = :id_projeto");
    $id_projeto = $projeto_id;
    $show->bindParam(':id_projeto', $id_projeto);
    $show->execute();
    $conta_tarefass = $show->rowCount();
    $contador = 0;
    $contarespera = 0;
    $contarexecucao = 0;
    $contatar = $conta_tarefass;
    /* var_dump($contatar); */
    while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
      $status = $row["status"];
      /* $contatar = $conta_tarefass;
    var_dump($contatar); */


      if ($status == 4) {
        /* echo 'terminou'; */
        $contador = $contador + 1;
        /* var_dump($contador); */
      }
      if ($status == 3) {
        /* echo 'esperaa'; */
        $contarespera = $contarespera + 1;
        /* var_dump($contarespera); */
      }
      if ($status == 2) {
        /* echo 'em execução'; */
        $contarexecucao = $contarexecucao + 1;
        /* var_dump($contarexecucao); */
      }
      if ($status == 1) {
        /* echo 'agendado'; */
      }
    }

    $show = $pdo->prepare("SELECT * FROM projetos WHERE id = :id_projeto");
    $id_projeto = $projeto_id;
    $show->bindParam(':id_projeto', $id_projeto);
    $show->execute();
    $conta_tarefass = $show->rowCount();

    if ($conta_tarefass > 0) {
      while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
        $statsproj = $row['status'];
      }
      if ($contador == $contatar && $contatar != 0 && $statsproj != 4) {
        $desc_fechamento = "Todas as tarefas finalizadas";
        
        $adc = $pdo->prepare("UPDATE `projetos` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$id_projeto';");
        $adc->bindParam(':desc_fechamento', $desc_fechamento);
        $adc->bindParam(':fechamento', $agora);
        if ($adc->execute()) {
          
          $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$projeto_id', '$user_id', '$agora', 'Finalizou o projeto. <br> Descrição: $desc_fechamento');");
          if ($adc->execute()) {
            $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O que mais temos para hoje?!";
            $mensagem_cor = "alert-success";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o projeto!";
          $mensagem_cor = "alert-danger";
        }
      }

      if ($contarexecucao == 0  && $conta_tarefass != 0 && $statsproj != 3  && $statsproj != 4 && $statsproj != 1 && $contarespera != 0) {
        $espera_desc = "Todas as tarefas em espera";
        
        $edt = $pdo->prepare("UPDATE `projetos` SET `status`='3' WHERE  `id`='$projeto_id';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `espera_projeto` (`espera_projeto`, `espera_start`, `espera_desc`, `espera_user`) VALUES ('$projeto_id', '$agora', '$espera_desc', '$user_id');");
          if ($adc->execute()) {
            //insere registro da ação na tabela de interatividade
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$projeto_id', '$user_id', '$agora', 'Colocou o projeto Em Espera. <br> Descrição: $espera_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O projeto foi colocado Em Espera.";
              $mensagem_cor = "alert-warning";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar projeto em espera!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de espera!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do projeto!";
          $mensagem_cor = "alert-danger";
        }
      } elseif ($statsproj != 4 && $statsproj != 2 && $contarexecucao >= 1) {
        

        //altera o status do projeto para 2 (Em execução)
        $edt = $pdo->prepare("UPDATE `projetos` SET `status`='2' WHERE  `id`='$projeto_id';");
        if ($edt->execute()) {
          //busca o ID do registro de espera, na tabela espera
          $show_espera = $pdo->prepare("SELECT espera_projeto.espera_id FROM espera_projeto WHERE espera_projeto.espera_projeto = '$projeto_id' ORDER BY espera_projeto.espera_id DESC LIMIT 0,1");
          $show_espera->execute();
          $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
          $espera_id = $exibe["espera_id"];

          //registra A data hora final de espera, na tabela espera
          $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
          if ($edt_espera->execute()) {

            //insere o registro de uma nova interação 
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$projeto_id', '$user_id', '$agora', 'Retomou o projeto.');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interAções com o cliente!";
              $mensagem_cor = "alert-success";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o projeto!";
          $mensagem_cor = "alert-danger";
        }
      }
    }
  }
  ?>
  <script type="text/javascript">
    //adicionando a parte da imagem


    function salvarImagem() {
      console.log("Chamando função para salvar a imagem");

      // Pega o id do atendimento e o user_id
      var id = document.getElementsByName('tarefa')[0].value;
      var user_id = '<?= $user_id ?>'; // Certifique-se de que $user_id esteja disponível no escopo PHP

      var editImagemInput = document.getElementById('editImagemInput');
      var formData = new FormData();
      formData.append('editImagemInput', editImagemInput.files[0]);
      formData.append('id', id);
      formData.append('user_id', user_id);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'edit_image_tarefa.php', true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          console.log(xhr.responseText);
          $('#editImagemModal').modal('hide');
          alert("Imagem editada com sucesso!");
          location.reload();
        } else if (xhr.readyState === 4) {
          alert("Erro ao editar a imagem: " + xhr.statusText);
        }
      };

      xhr.send(formData);
    }


    // Script para passar o img_id e img_url para o modal de exibição

    $(document).on('click', '.img-thumbnail', function() {
      var imgUrl = $(this).data('img-url');
      var imgId = $(this).data('img-id');

      // console.log('Imagem clicada - img-url:', imgUrl, 'img-id:', imgId);

      $('#modalImagem').attr('src', imgUrl).data('img-id', imgId);
      $('#editImagemBtn').data('img-id', imgId);
      $('#deleteImagemBtn').data('img-id', imgId);

      $('#imagemModal').modal('show');
    });

    // Script para definir o id da imagem no modal de edição
    $('#editImagemModal').on('show.bs.modal', function(event) {
      var imgId = $('#editImagemBtn').data('img-id');
      $(this).find('#editImagemId').val(imgId);
    });

    // Script para definir o id da imagem no modal de exclusáo
    $('#excluirImagemModal').on('show.bs.modal', function(event) {
      var imgId = $('#deleteImagemBtn').data('img-id');
      $(this).find('#deleteImagemId').val(imgId);
    });

    // Função para adicionar imagem enviando user_id e tarefa_id
    $('#saveAddImageBtn').click(function() {
      var tarefa_id = document.getElementsByName('tarefa')[0].value; // Obtém o ID do atendimento
      var user_id = '<?= $user_id ?>'; // Obtém o user_id do PHP e o coloca como variável

      // Cria um novo FormData
      var formData = new FormData($('#addImagemForm')[0]);

      // Adiciona o tarefa_id e user_id ao FormData
      formData.append('tarefa_id', tarefa_id);
      formData.append('user_id', user_id);

      // Cria e configura o XMLHttpRequest
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'add_image_tarefa.php', true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          console.log(xhr.responseText);
          $('#addImagemModal').modal('hide');
          alert("Imagem adicionada com sucesso!");
          location.reload();
        } else if (xhr.readyState === 4) {
          alert("Erro ao adicionar a imagem: " + xhr.statusText);
        }
      };

      // Envia o FormData com a imagem e os IDs
      xhr.send(formData);
    });


    // Função para salvar imagem editada
    $('#saveEditImageBtn').click(function() {
      var formData = new FormData($('#editImagemForm')[0]);
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'edit_image_tarefa.php', true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          console.log(xhr.responseText);
          $('#editImagemModal').modal('hide');
          alert("Imagem editada com sucesso!");
          location.reload();
        } else if (xhr.readyState === 4) {
          alert("Erro ao editar a imagem: " + xhr.statusText);
        }
      };

      xhr.send(formData);
    });

    // Função para excluir imagem
    // Evento para definir o ID da imagem ao abrir o modal de exibição
    $('#imagemModal').on('show.bs.modal', function(event) {
      var button = $(event.relatedTarget); // Botão que acionou o modal
      var imagemId = button.data('img-id'); // Extrai o ID da imagem do atributo data-img-id
      var imagemUrl = button.data('img-url'); // Extrai a URL da imagem do atributo data-img-url


      // Atualiza a imagem no modal
      $('#modalImagem').attr('src', imagemUrl);

      // Atualiza o atributo data-imagem-id do botão de exclusáo
      $('#deleteImagemBtn').attr('data-imagem-id', imagemId);
    });

    // Evento para preencher o campo oculto com o ID da imagem ao clicar em "Excluir Imagem"
    $('#deleteImagemBtn').on('click', function() {
      var imagemId = $(this).data('imagem-id');
      $('#deleteImagemId').val(imagemId);

      // Pergunta se o usuário tem certeza que deseja excluir a imagem
      if (confirm("Tem certeza que deseja excluir esta imagem?")) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'delete_image_tarefa.php', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            if (response.status === 'success') {
              alert(response.message);
              $('.modal').modal('hide'); // Fechar todos os modais
              location.reload();
            } else {
              alert("Erro ao excluir a imagem: " + response.message);
            }
          } else if (xhr.readyState === 4) {
            alert("Erro ao excluir a imagem: " + xhr.statusText);
          }
        };

        xhr.send('img_id=' + encodeURIComponent(imagemId));
      }
    });

    // fim da mudança   
  </script>

  <!-- <script>
    const sessionType = <?php echo json_encode($_SESSION['tipo']); ?>;
    console.log(JSON.stringify({
      tipo_sessao: sessionType
    }));
  </script> -->

  <?php if (isset($_SESSION['mensagem'])) { ?>
    <div class="row pull-right" style="position:absolute; top: 65px; right:50px;">
      <div class="alert <?php echo $_SESSION['mensagem_cor']; ?> alert-dismissible fade show" role="alert">
        <?php echo $_SESSION['mensagem']; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  <?php
    // Limpa a mensagem para que não reapareça ao recarregar a página
    unset($_SESSION['mensagem']);
    unset($_SESSION['mensagem_cor']);
  } ?>

  <script>
    // Faz a mensagem desaparecer após 4 segundos
    window.setTimeout(function() {
      $(".alert").fadeOut(500, function() {
        $(this).remove();
      });
    }, 4000);
  </script>


  <?php
  $quick_modal = $_SESSION['tarefa_quick_modal'] ?? '';
  unset($_SESSION['tarefa_quick_modal']);
  $allowed_quick_modals = ['tarefa_aceitar', 'tarefa_retomar', 'tarefa_finalizar'];
  if (in_array($quick_modal, $allowed_quick_modals, true)) { ?>
    <script>
      $(function() {
        var quickModal = '#<?php echo $quick_modal; ?>';
        if ($(quickModal).length) {
          $(quickModal).modal('show');
        }
      });
    </script>
  <?php } ?>

</body>

</html>

