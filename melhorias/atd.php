<?php

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//REGRA PARA EXIBI??O DE BOT?ES, MODAIS, ETC
$exibe_bt_atd_interacao = true;
$exibe_bt_atd_aceitar = false;
$exibe_bt_atd_devolver = false;
$exibe_bt_atd_espera = false;
$exibe_bt_atd_concluido = false;
$exibe_bt_atd_finalizar = false;
$exibe_bt_atd_retomar = false;
$exibe_bt_atd_search = false;
$exibe_bt_atd_search = false;


if ($m3_00 == 0) {
  header("Location: ../index.php");
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

  <style type="text/css">
    html {
      min-height: 100%;
      background: #f6f8fb;
      overflow-x: hidden;
    }

    body {
      min-height: 100%;
      margin: 0;
      background: #f6f8fb;
      color: #0f172a;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      font-size: 90%;
      overflow-x: hidden;
    }

    body input,
    body button,
    body select,
    body textarea {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }

    .container-fluid {
      max-width: 100vw;
      padding-left: 14px;
      padding-right: 14px;
      overflow-x: hidden;
    }

    .card {
      border: 1px solid #dbe6f3;
      border-radius: 8px;
      box-shadow: 0 8px 22px rgba(15, 23, 42, .08);
      overflow: visible;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      background: #fff;
      border-bottom: 1px solid #e6edf5;
      color: #101828;
      font-size: 1rem;
      font-weight: 700;
    }

    .card-header i {
      color: #0891b2 !important;
    }

    .card-body {
      padding: 18px !important;
      background: #fff;
    }

    .form-row {
      margin-right: -6px;
      margin-left: -6px;
    }

    .form-group {
      padding-right: 6px;
      padding-left: 6px;
      margin-bottom: 14px;
    }

    label.small,
    label {
      margin-bottom: 6px !important;
      color: #344054;
      font-size: .82rem;
      font-weight: 700;
    }

    .form-control {
      min-height: 38px;
      border: 1px solid #cfd9e8;
      border-radius: 6px;
      background-color: #fff;
      color: #172033;
      font-size: .9rem;
      box-shadow: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }

    select.form-control {
      padding-right: 30px;
      background-image: linear-gradient(45deg, transparent 50%, #475569 50%), linear-gradient(135deg, #475569 50%, transparent 50%);
      background-position: calc(100% - 15px) 16px, calc(100% - 10px) 16px;
      background-size: 5px 5px, 5px 5px;
      background-repeat: no-repeat;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
    }

    textarea.form-control {
      min-height: 150px;
      padding: 10px 12px;
      line-height: 1.5;
      resize: vertical;
    }

    .form-control:focus {
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, .14);
    }

    .bootstrap-select>.dropdown-toggle {
      min-height: 38px;
      border: 1px solid #cfd9e8;
      border-radius: 6px;
      background: #fff;
      color: #172033;
      box-shadow: none;
    }

    .carregando,
    .carregando2,
    .carregando3,
    .carregando4 {
      display: none;
      color: #64748b;
      font-size: .78rem;
      font-weight: 600;
    }

    .btn-danger {
      min-height: 38px;
      border-color: #0ea5e9;
      border-radius: 6px;
      background: #0ea5e9;
      color: #fff;
      font-weight: 700;
      box-shadow: none;
    }

    .btn-danger:hover {
      border-color: #0284c7;
      background: #0284c7;
    }

    @media (max-width: 767.98px) {
      .container-fluid {
        padding-left: 8px;
        padding-right: 8px;
      }

      .card-body {
        padding: 14px !important;
      }
    }
  </style>
</head>

<body>
  </ /?php include_once("../all/loading.php"); ?>
  <?php include_once("../all/sidebar.php"); ?>
  <?php
  //verifico se existe alguma requisi??o POST chamada action
  $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

  //verifico se existe alguma requisi??o via post cahamda atd
  $atd = filter_input(INPUT_POST, 'atd', FILTER_SANITIZE_NUMBER_INT);

  if ($action == "alterar_senha") {
    include_once("../all/update_senha.php");
  }

  if ($usar_token == "true") {
    if ($action) {
      if ($action == "atd_adc") {
        $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
        $recorrente = filter_input(INPUT_POST, 'recorrente', FILTER_SANITIZE_NUMBER_INT);
        $vezes_reabrir = filter_input(INPUT_POST, 'vezes_reabrir', FILTER_SANITIZE_NUMBER_INT);
        $vezes = filter_input(INPUT_POST, 'vezes', FILTER_SANITIZE_NUMBER_INT);
        $semana = filter_input(INPUT_POST, 'semana', FILTER_SANITIZE_NUMBER_INT);
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        //$abertura = date("Y-m-d H:i:s");
        $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $abertura_recorrente = filter_input(INPUT_POST, 'abertura_recorrente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        //VERIFICA SE DATA HORA ABERTURA ? MAIOR DO QUE DATA HORA ATUAL.
        //SE POSITIVO: UM ATENDIMENTO AGENDADO
        //MUDA O STATUS PADR?O DE ABERTURA PARA 0 (AGENDADO)
        if (strtotime($abertura) > strtotime($agora)) {
          $atd_sts = 0;
          $agendamento = date("d/m/Y H:i", strtotime($abertura));
          $inter_msg = "Registrou o Agendamento do Atendimento para $agendamento.";
        } else {
          $atd_sts = 1;
          $inter_msg = "Registrou solicita??o de Melhoria.";
        }

        //VERIFICA SE EXISTE UM ATENDIMENTO ABERTO PARA O MESMO CLIENTE, COM A MESMA CATEGORIA E MESMA SUBCATEGORIA NOS ?LTIMOS 30 DIAS
        //SE HOUVER, CLASSIFICA O ATENDIMENTO COMO REINCIDENTE
        $prazo_reincidente = 30; //PERIODO EM DIAS PARA VERIFICAR REINCID?NCIA
        $data_reincidente = date("Y-m-d", strtotime($hoje . " - $prazo_reincidente days"));
        $show = $pdo->prepare("SELECT melhorias.id FROM melhorias WHERE melhorias.abertura > '$data_reincidente' AND melhorias.cliente = '$cliente' AND melhorias.categoria = '$categoria' AND melhorias.subcategoria = '$subcategoria'");
        $show->execute();
        $conta_atd = $show->rowCount();
        if ($conta_atd > 0) {
          $reincidente = 1;
        } else {
          $reincidente = 0;
        }

        //INICIA PROCESSO DE GRAVA??O DO ATENDIMENTO NA BASE DE DADOS
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `melhorias` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir`, `vezes`, `semana`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$atd_sts',:recorrente,:data_recorrente,:vezes_reabrir,:vezes,:semana);");
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
        $adc->bindParam(':recorrente', $recorrente);
        $adc->bindParam(':data_recorrente', $abertura_recorrente);
        $adc->bindParam(':vezes_reabrir', $vezes_reabrir);
        $adc->bindParam(':vezes', $vezes);
        $adc->bindParam(':semana', $semana);

        //SE O T?CNICO ESCOLHIDO FOR DIFERENTE DO USU?RIO
        //if($tecnico>0 && $tecnico!= $user_id){
        //}

        if ($adc->execute()) {
          $atd = $pdo->lastInsertId();
          $mensagem = "<i class=\"fas fa-check\"></i> Atendimento cadastrado!";
          $mensagem_cor = "alert-success";
          $log = "true";

          //==========================================CHAMADO ABERTO========email=============================================================================================================================================================


          //===================================CHAMADO ABERTO==========email=======================================================================================================================================================

          //cadastra abertura do atendimento na tabela de interatividade_melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$atd', '$user_id', '$agora', '$inter_msg');");
          $adc->execute();

          //SE O T?CNICO ESCOLHIDO FOR DIFERENTE DO USU?RIO
          //registra intera??o de direcionamento de atendimento
          if ($tecnico > 0 && $tecnico != $user_id) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$atd', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome.')");
            $adc->execute();
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar atendimento!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }

      //EDITA A CATEGORIZA??O DO ATENDIMENTO
      if ($action == "atd_edt") {
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($tipo == 1) {
          $atd_tipo_nome = "Falha";
        }
        if ($tipo == 7) {
          $atd_tipo_nome = "Tarefa";
        }
        if ($tipo == 6) {
          $atd_tipo_nome = "Melhorias";
        }
        if ($tipo == 2) {
          $atd_tipo_nome = "Relacionamento";
        }
        if ($tipo == 3) {
          $atd_tipo_nome = "Requisi??o de Servi?os";
        }
        if ($tipo == 4) {
          $atd_tipo_nome = "Requisi??o de informa??o";
        }
        if ($tipo == 5) {
          $atd_tipo_nome = "Notifica??o de monitoramento";
        }
        if ($tipo == 0) {
          $atd_tipo_nome = "N?o informado";
        }
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        $show_cat->execute();
        $row = $show_cat->fetch(PDO::FETCH_ASSOC);
        $atd_cat_nome = $row["cat_nome"];

        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        $show_scat->execute();
        $row = $show_scat->fetch(PDO::FETCH_ASSOC);
        $atd_scat_nome = $row["scat_nome"];

        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_itens = $pdo->prepare("SELECT itens.itens_nome FROM itens WHERE itens.itens_id = '$item'");
        $show_itens->execute();
        $row = $show_itens->fetch(PDO::FETCH_ASSOC);
        $atd_itens_nome = $row["itens_nome"];

        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($nivel == 0) {
          $atd_nivel_nome = "N?o informado";
        }
        if ($nivel == 1) {
          $atd_nivel_nome = "N?vel 1";
        }
        if ($nivel == 2) {
          $atd_nivel_nome = "N?vel 2";
        }
        if ($nivel == 3) {
          $atd_nivel_nome = "N?vel 3";
        }
        if ($nivel == 4) {
          $atd_nivel_nome = "Rotina";
        }
        if ($nivel == 5) {
          $atd_nivel_nome = "Administrativo";
        }


        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($forma == 1) {
          $atd_forma_nome = "Remoto";
        }
        if ($forma == 2) {
          $atd_forma_nome = "Presencial";
        }
        if ($forma == 3) {
          $atd_forma_nome = "Remoto - Plant?o";
        }
        if ($forma == 4) {
          $atd_forma_nome = "Presencial - Plant?o";
        }


        $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        //BUSCA A CLASSIFICA??O ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICA??O
        $pdo = ConnectionN3();
        $show_atd = $pdo->prepare("SELECT melhorias.`tipo`, melhorias.`categoria`, melhorias.`subcategoria`, melhorias.`item`, melhorias.`nivel`, melhorias.`forma`, melhorias.`desc_abertura`,
          categorias.cat_nome,
          subcategorias.scat_nome,
          itens.itens_nome
          FROM melhorias 
          LEFT JOIN categorias ON categorias.cat_id = melhorias.categoria
          LEFT JOIN subcategorias ON subcategorias.scat_id = melhorias.subcategoria
          LEFT JOIN itens ON itens.itens_id = melhorias.item
          WHERE melhorias.id = '$atd'");
        $show_atd->execute();
        $row = $show_atd->fetch(PDO::FETCH_ASSOC);
        $atd_tipo_original = $row["tipo"];
        if ($atd_tipo_original == 1) {
          $atd_tipo_original_nome = "Falha";
        }
        if ($atd_tipo_original == 7) {
          $atd_tipo_original_nome = "Tarefa";
        }
        if ($atd_tipo_original == 6) {
          $atd_tipo_original_nome = "Melhorias";
        }
        if ($atd_tipo_original == 2) {
          $atd_tipo_original_nome = "Relacionamento";
        }
        if ($atd_tipo_original == 3) {
          $atd_tipo_original_nome = "Requisi??o de Servi?os";
        }
        if ($atd_tipo_original == 4) {
          $atd_tipo_original_nome = "Requisi??o de informa??o";
        }
        if ($atd_tipo_original == 5) {
          $atd_tipo_original_nome = "Notifica??o de monitoramento";
        }
        if ($atd_tipo_original == 0) {
          $atd_tipo_original_nome = "N?o informado";
        }
        $atd_cat_original = $row["categoria"];
        $atd_cat_original_nome = $row["cat_nome"];
        $atd_scat_original = $row["subcategoria"];
        $atd_scat_original_nome = $row["scat_nome"];
        $atd_item_original = $row["item"];
        $atd_item_original_nome = $row["itens_nome"];
        $atd_nivel_original = $row["nivel"];
        if ($atd_nivel_original == 0) {
          $atd_nivel_original_nome = "N?o informado";
        }
        if ($atd_nivel_original == 1) {
          $atd_nivel_original_nome = "N?vel 1";
        }
        if ($atd_nivel_original == 2) {
          $atd_nivel_original_nome = "N?vel 2";
        }
        if ($atd_nivel_original == 3) {
          $atd_nivel_original_nome = "N?vel 3";
        }
        if ($atd_nivel_original == 4) {
          $atd_nivel_original_nome = "Rotina";
        }
        if ($atd_nivel_original == 5) {
          $atd_nivel_original_nome = "Administrativo";
        }
        $atd_forma_original = $row["forma"];
        if ($atd_forma_original == 1) {
          $atd_forma_original_nome = "Remoto";
        }
        if ($atd_forma_original == 2) {
          $atd_forma_original_nome = "Presencial";
        }
        if ($atd_forma_original == 3) {
          $atd_forma_original_nome = "Remoto - Plant?o";
        }
        if ($atd_forma_original == 4) {
          $atd_forma_original_nome = "Presencial - Plant?o";
        }

        $atd_desc_abertura_original = $row["desc_abertura"];
        //$atd_desc_abertura_original_nome = $row["desc_abertura_nome"];


        //COMPARA O TIPO DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($tipo != $atd_tipo_original) {
          //ALTERA O C?DIGO DO TIPO NA TABELA DE melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `tipo`='$tipo' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERA??O INFORMANDO A ALTERA??O          
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou o Tipo: <s>De: $atd_tipo_original_nome</s> para $atd_tipo_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classifica??o do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA O N?VEL DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($nivel != $atd_nivel_original) {
          //ALTERA O C?DIGO DO N?VEL NA TABELA DE melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `nivel`='$nivel' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERA??O INFORMANDO A ALTERA??O          
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou o N?vel: <s>De: $atd_nivel_original_nome</s> para $atd_nivel_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classifica??o do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A CATEGORIA :
        //SE DIFERENTE:
        if ($categoria != $atd_cat_original) {
          //ALTERA O C?DIGO DA CATEGORIA NA TABELA DE melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `categoria`='$categoria' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERA??O INFORMANDO A ALTERA??O          
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a Categoria: <s>De: $atd_cat_original_nome</s> para $atd_cat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classifica??o do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA A SUBCATEGORIA :
        //SE DIFERENTE:
        if ($subcategoria != $atd_scat_original) {
          //ALTERA O C?DIGO DA CATEGORIA NA TABELA DE melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `subcategoria`='$subcategoria' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERA??O INFORMANDO A ALTERA??O          
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a Subcategoria: <s>De: $atd_scat_original_nome</s> para $atd_scat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classifica??o do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA O ITEM :
        //SE DIFERENTE:
        if ($item != $atd_item_original) {
          //ALTERA O C?DIGO DA CATEGORIA NA TABELA DE melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `item`='$item' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERA??O INFORMANDO A ALTERA??O          
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou o Item: <s>De: $atd_item_original_nome</s> para $atd_itens_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classifica??o do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A FORMA DE ATENDIMENTO :
        //SE DIFERENTE:
        if ($forma != $atd_forma_original) {
          //ALTERA O C?DIGO DA FORMA DE ATENDIMENTO NA TABELA DE melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `forma`='$forma' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERA??O INFORMANDO A ALTERA??O          
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a forma de atendimento: <s>De: $atd_forma_original_nome</s> para $atd_forma_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classifica??o do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A Descri??o de Abertura :
        //SE DIFERENTE:
        if ($desc_abertura != $atd_desc_abertura_original) {
          //ALTERA O C?DIGO DA desc_abertura DE ATENDIMENTO NA TABELA DE melhorias
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `desc_abertura`='$desc_abertura' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERA??O INFORMANDO A ALTERA??O          
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a Descri??o de Abertura: <s>De: $atd_desc_abertura_original</s> para: $desc_abertura.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Descri??o de abertura alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }
      }

      //AC?ES DE GERENCIAMENTO DO ATENDIMENTO    
      //TIPOS DE interatividade_melhorias
      //0 = Agendamento;
      //1 = Abertura de Atendimento
      //2 = Aceite de Atendimento
      //3 = Devolu??o de Atendimento para fila
      //4 = Transfer?ncia de Atendimento
      //5 = Envio para espera
      //6 = Retomada do atendimento
      //7 = Intera??o com o solicitante
      //8 = Conclus?o de Atendimento
      //9 = Edi??o de classifica??o
      //10 = Conclu?do
      //REGISTRAR NOVA INTERA??O
      if ($action == "atd_new_inter") {
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :atd, '$user_id', '$agora', :inter_desc);");
        $adc->bindParam(':inter_desc', $inter_desc);
        $adc->bindParam(':atd', $atd);
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> Intera??o cadastrada!";
          $mensagem_cor = "alert-success";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar intera??o!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USU?RIO ACEITA INICIAR UM ATENDIMENTO
      if ($action == "atd_aceitar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        //VERIFICA SE TECNICO ATRIBU?DO ? O PR?PRIO USU?RIO
        //SE VERDADEIRO:
        //1 - muda o status do atendimento para 2 (ATENDIMENTO EM EXECU??O)
        //2 - registra na tabela de interatividade_melhorias que o usu?rio iniciou o atendimento.
        if ($tecnico == $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$atd';");
          if ($adc->execute()) {
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$atd', '$user_id', '$agora', 'Iniciou o atendimento.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> ?timo! <br> O status do atendimento foi alterado para 'Em Execu??o'!";
              $mensagem_cor = "alert-success";
            }
          }
        }
        //SE FALSO:
        //1 - mantem status do atendimento como 1 (ATENDIMENTO AGUARDANDO EXECU??O)
        //1 - registra na tabela de atendimento o novo t?cnico respons?vel 
        //2 - busca o NOME do t?cnico respons?vel
        //3 - registra na tabela de interatividade_melhorias a atribui??o do chamando
        if ($tecnico != $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `tecnico`='$tecnico', `status`='1' WHERE  `id`='$atd';");
          if ($adc->execute()) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$atd', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi direcionado para $tecnico_nome.";
              $mensagem_cor = "alert-success";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento a outro t?cnico!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento a outro t?cnico!";
            $mensagem_cor = "alert-danger";
          }
        }
      }

      //USU?RIO RETOMA UM ATENDIMENTO
      if ($action == "atd_retomar") {
        $pdo = ConnectionN3();

        //altera o status do atendimento para 2 (Em execu??o)
        $edt = $pdo->prepare("UPDATE `melhorias` SET `status`='2' WHERE  `id`='$atd';");
        if ($edt->execute()) {
          //busca o ID do registro de espera, na tabela espera
          $show_espera = $pdo->prepare("SELECT espera.espera_id FROM espera WHERE espera.espera_atd = '$atd' ORDER BY espera.espera_id DESC LIMIT 0,1");
          $show_espera->execute();
          $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
          $espera_id = $exibe["espera_id"];

          //registra A data hora final de espera, na tabela espera
          $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
          if ($edt_espera->execute()) {

            //insere o registro de uma nova intera??o 
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$atd', '$user_id', '$agora', 'Retomou o atendimento.');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as intera??es com o cliente!";
              $mensagem_cor = "alert-success";

              //=====================Chamado=Saiu de ESPERA===email========================================================================================================================================================



              //=====================Chamado=SAIU ESPERA===email========================================================================================================================================================

            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de intera??o!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de intera??o!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USU?RIO RECUSA UM ATENDIMENTO
      if ($action == "atd_recusar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        //VERIFICA SE O ATENDIMENTO FOI DIRECIONADO PARA OUTRO T?CNICO
        //SE VERDADEIRO:
        //1 - muda o status do atendimento para 1 (aguardando atendimento)
        //1 - registra na tabela de atendimento o novo t?cnico respons?vel 
        //2 - busca o NOME do t?cnico respons?vel
        //2 - registra na tabela de interatividade_melhorias que o usu?rio direcionou o atendimento.      
        if ($tecnico != 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `tecnico`='$tecnico', `status`='1' WHERE `id`='$atd';");
          if ($adc->execute()) {

            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$atd', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome: <br> $inter_desc');");
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
        //1 - muda o status do atendimento para 1 (aguardando atendimento)
        //1 - remove o t?cnico como respons?vel pelo atendimento
        //2 - registra na tabela de interatividade_melhorias que o usu?rio recusou o atendimento.     
        if ($tecnico == 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `melhorias` SET `tecnico`='0', `status`='1' WHERE `id`='$atd';");
          if ($adc->execute()) {

            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', '$atd', '$user_id', '$agora', 'Recusou o atendimento: <br> $inter_desc');");
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
      if ($action == "atd_espera") {
        $espera_desc = filter_input(INPUT_POST, 'espera_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $espera_prev = filter_input(INPUT_POST, 'espera_prev', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
        $espera_causa = filter_input(INPUT_POST, 'espera_causa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $id_melhorias = filter_input(INPUT_POST, 'id_melhorias', FILTER_SANITIZE_FULL_SPECIAL_CHARS);


        $pdo = ConnectionN3();
        //altera status do atendimento para 3 (Em espera)
        $edt = $pdo->prepare("UPDATE `melhorias` SET `status`='3' WHERE  `id`='$atd';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `espera` (`espera_atd`, `id_melhorias`, `espera_start`, `espera_prev`, `espera_desc`,  `espera_causa`, `espera_user`) VALUES ('$atd', '$id_melhorias', '$agora', '$espera_prev', '$espera_desc', '$espera_causa', '$user_id');");
          if ($adc->execute()) {
            // Atualiza a coluna id_melhorias na tabela espera
            $select = $pdo->prepare("SELECT `id` FROM `melhorias`");
            $select->execute();
            $ids_melhorias = $select->fetchAll(PDO::FETCH_COLUMN);

            foreach ($ids_melhorias as $id_melhoria) {
              $update = $pdo->prepare("UPDATE `espera` SET `id_melhorias` = :id_melhoria WHERE `espera_atd` = :atd");
              $update->bindParam(':id_melhoria', $id_melhoria);
              $update->bindParam(':atd', $atd);
              $update->execute();
            }

            //insere registro da a??o na tabela de interatividade_melhorias
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$atd', '$user_id', '$agora', 'Colocou o atendimento Em Espera. <br> Previs?o de retorno: $espera_prev_br <br>  Causa: $espera_causa <br> Descri??o: $espera_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi colocado Em Espera.";
              $mensagem_cor = "alert-warning";

              //=====================Chamado=EM ESPERA===email========================================================================================================================================================



              //=====================Chamado=EM ESPERA===email========================================================================================================================================================

            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar atendimento em espera!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de espera!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }


      //COLOCAR ATENDIMENTO EM concluido
      if ($action == "atd_concluido") {
        $concluido_desc = filter_input(INPUT_POST, 'concluido_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $concluido_prev = filter_input(INPUT_POST, 'concluido_prev', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $concluido_prev_br = date('d/m/Y H:i', strtotime($concluido_prev));
        $pdo = ConnectionN3();
        //altera status do atendimento para 3 (Em espera)
        $edt = $pdo->prepare("UPDATE `melhorias` SET `status`='5' WHERE  `id`='$atd';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `concluido` (`concluido_atd`, `concluido_start`, `concluido_prev`, `concluido_desc`, `concluido_user`) VALUES ('$atd', '$agora', '$concluido_prev', '$concluido_desc', '$user_id');");
          if ($adc->execute()) {
            //insere registro da a??o na tabela de interatividade_melhorias
            $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('10', '$atd', '$user_id', '$agora', 'Colocou o atendimento como concluido. <br> Descri??o: $concluido_desc');");
            if ($adc->execute()) {

              //===========================================FINALIZADO======email============================================= EMAIL

              //=====================Chamado=FINALIZADO================email============================================================================================================================================================


              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi colocado como conclu?do.";
              $mensagem_cor = "alert-warning";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar atendimento como conclu?do!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de conclu?do!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USU?RIO FINALIZA UM ATENDIMENTO
      if ($action == "atd_finalizar") {
        $desc_fechamento = filter_input(INPUT_POST, 'desc_fechamento', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("UPDATE `melhorias` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$atd';");
        $adc->bindParam(':desc_fechamento', $desc_fechamento);
        $adc->bindParam(':fechamento', $agora);
        if ($adc->execute()) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `interatividade_melhorias` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$atd', '$user_id', '$agora', 'Finalizou o atendimento. <br> Descri??o: $desc_fechamento');");
          if ($adc->execute()) {

            $mensagem = "<i class=\"fas fa-check\"></i> ?timo! <br> O que mais temos para hoje?!";
            $mensagem_cor = "alert-success";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }
    }
  }

  if ($action == "atd_feedback") {
    $pdo = ConnectionN3();
    $query = $pdo->prepare("SELECT melhorias.tecnico, melhorias.pessoa FROM melhorias WHERE id = '$atd'");
    $query->execute();
    $row = $query->fetch(PDO::FETCH_ASSOC);
    $tecnicoid = $row["tecnico"];
    $pessoaid = $row["pessoa"];

    $query1 = $pdo->prepare("SELECT usuarios.link FROM usuarios WHERE user_id = '$tecnicoid'");
    $query1->execute();
    $row = $query1->fetch(PDO::FETCH_ASSOC);
    $tecnico_link = $row["link"];

    $query2 = $pdo->prepare("SELECT pessoas.pessoa_tel FROM pessoas WHERE pessoa_id = '$pessoaid'");
    $query2->execute();
    $row = $query2->fetch(PDO::FETCH_ASSOC);
    $pessoa_telefone = $row["pessoa_tel"];



    $telefone = "55" . $pessoa_telefone;
    $texto = "Ol? poderia avaliar meu atendimento atrav?s do link:";
    $link = $tecnico_link;   //

    $mensagem = "<i class=\"fas fa-check\"></i> ?timo! <br> Feedback Solicitado.";
    $mensagem_cor = "alert-success";

    echo '<script>
    window.onload = function() {
        var phoneNumber = "' . $telefone . '";
        var message = "' . $texto . ' ' . $link . '";
        var encodedMessage = encodeURIComponent(message);
        var whatsappUrl = "https://api.whatsapp.com/send?phone=" + phoneNumber + "&text=" + encodedMessage;
        
        window.open(whatsappUrl, "_blank");
    };
</script>';
  }
  ?>
  <?php
  // Verifica de existe o ID de um atendimento setado.
  // Se n?o houver, exibe a parte de CADASTRO DE NOVO ATENDIMENTO
  if (empty($atd)) {
    if ($m3_01 == 0) {
      header("Location: ../index.php");
    }
  ?>
    <div class="container-fluid">
      <div class="row mt-2 justify-content-md-center">
        <div class="col-12 col-sm-12 col-md-11 col-lg-10">
          <div class="card">
            <div class="h6 card-header">
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitação de Melhoria
            </div>
            <div class="card-body py-3">
              <form action="#" method="POST">
                <div class="form-row">
                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Cliente:</label>
                    <select name="cliente"
                      id="cliente"
                      class="form-control form-control-sm selectpicker"
                      data-live-search="true"
                      data-container="body"
                      required="required"
                      tabindex="1">
                      <!-- filtrar -->
                      <option></option>
                      <?php
                      $filterEmpresas = null;

                      if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                        $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
                      }

                      $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1'";

                      if ($filterEmpresas) {
                        $sql .= $filterEmpresas;
                      }

                      $sql .= " ORDER BY clientes.clt_nomef ASC";

                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare($sql);
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $clt_id = $exibe["clt_id"];
                        $clt_nome = $exibe["clt_nomef"];
                      ?>
                        <option value="<?php echo $clt_id; ?>"><?php echo $clt_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>

                  <!-- Este select ser? populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Solicitante:</label>
                    <span class="carregando small">Carregando...</span>
                    <select name="solicitante" id="solicitante" class="form-control form-control-sm" required="required" tabindex="2">
                      <option></option>
                    </select>
                  </div>

                  <!-- Este select ser? populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Local:</label>
                    <span class="carregando2 small">Carregando...</span>
                    <select name="local" id="local" class="form-control form-control-sm" required="required" tabindex="3">
                      <option></option>
                    </select>
                  </div>
                </div>

                <div class="form-row pt-2">
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Tipo de atendimento:</label>
                    <select name="tipo" class="form-control form-control-sm" required="required" tabindex="4">
                      <option></option>
                      <option value="1">Falha</option>
                      <option value="7">Tarefa</option>
                      <option value="6">Melhorias</option>
                      <option value="2">Relacionamento</option>
                      <option value="3">Requisi??o de Servi?os</option>
                      <option value="4">Requisi??o de informa??o</option>
                      <option value="5">Notifica??o de monitoramento</option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Categoria:</label>
                    <select name="categoria" id="categoria" class="form-control form-control-sm" required="required" tabindex="5">
                      <option></option>
                      <?php
                      $pdo = ConnectionN3();
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

                  <!-- Este select ser? populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Subcategoria:</label>
                    <span class="carregando3 small">Aguarde, carregando...</span>
                    <select name="subcategoria" id="subcategoria" class="form-control form-control-sm" required="required" tabindex="6">
                      <option></option>
                    </select>
                  </div>

                  <!-- Este select ser? populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Item:</label>
                    <span class="carregando4 small">Aguarde, carregando...</span>
                    <select name="item" id="item" class="form-control form-control-sm" required="required" tabindex="7">
                      <option></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Nível:</label>
                    <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
                      <option></option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">Rotina</option>
                      <option value="6">Tarefa</option>
                      <option value="5">Administrativo</option>
                      <option value="0">NA</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group col-sm-2 col-md-1" hidden>
                    <label class="my-0 small">Recorrente:</label>
                    <select name="recorrente" id="recorrente" class="form-control form-control-sm" required="required" tabindex="9">
                      <option value="1" selected>Não</option>
                      <option value="2">Sim</option>
                    </select>
                  </div>

                  <!-- <div class="form-group col-sm-3 col-md-5" id = "recorrente_date" hidden> -->
                  <div class="form-group col-sm-12 col-md-5" id="recorrente_date" hidden>
                    <label class="my-0 small">Data de Reabertura:</label>
                    <input type="text" id="abertura_recorrente" name="abertura_recorrente" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="10">
                  </div>
                  <!-- </div> -->

                  <!-- <div class="form-group col-sm-3 col-md-4" id = "recorrente_datee" hidden> -->
                  <div class="form-group col-sm-12 col-md-5" id="recorrente_datee" hidden>
                    <label class="my-0 small">Periodo:</label>
                    <select name="vezes_reabrir" id="vezes_reabrir" class="form-control form-control-sm" required="required" tabindex="11">
                      <!-- <option value="1">Apenas uma vez</option> -->
                      <option value="1">Diario</option>
                      <option value="6">Semanal</option>
                      <option value="7" id="semana_mes_output" selected></option>
                      <option value="2">Todo m?s</option>
                      <option value="3">3 em 3 meses</option>
                      <option value="4">6 em 6 meses</option>
                      <option value="5">12 em 12 meses</option>
                    </select>
                    <input type="text" id="semana" name="semana" hidden>
                  </div>

                  <div class="form-group col-sm-4 col-md-1" id="recorrente_dateee" hidden>
                    <label class="my-0 small">Vezes:</label>
                    <input name="vezes" id="vezes" type="number" min="1" max="12" value="1" class="form-control form-control-sm " tabindex="12">
                  </div>
                  <!-- </div> -->


                </div>

                <div class="form-row pt-2">

                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea name="desc_abertura" class="form-control form-control-sm" rows="5" required="required" tabindex="13"></textarea>
                  </div>

                  <div class="form-group col-sm-6 col-md-6">
                    <div class="form-row">

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Técnico:</label>
                        <select name="tecnico" id="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="14">
                          <option></option>
                          <option value="0">Não determinado</option>
                          <?php
                          if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 1) {
                            $pdo = ConnectionN3();
                            $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' AND usuarios.user_id > '1' ORDER BY usuarios.user_nome ASC");
                            $show_clt->execute();
                            while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                              $user_id = $exibe["user_id"];
                              $user_nome = $exibe["user_nome"];
                          ?>
                              <option value="<?php echo $user_id; ?>"><?php echo $user_nome; ?></option>
                          <?php }
                          } ?>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Forma de atendimento:</label>
                        <select name="forma" class="form-control form-control-sm" required="required" tabindex="15">
                          <option value="1">Remoto</option>
                          <option value="2">Presencial</option>
                          <option value="3">Remoto - Plant?o</option>
                          <option value="4">Presencial - Plant?o</option>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Abertura:</label>
                        <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="16">
                      </div>

                      <div class="form-group col-sm-12 col-md-6 pt-3 text-center">
                        <input type="hidden" name="token" value="<?php echo $token; ?>">
                        <input type="hidden" name="action" value="atd_adc">
                        <button type="submit" class="btn btn-danger btn-sm px-3"><i class="fas fa-plus mr-1"></i> Cadastrar melhoria</button>
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
    <!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de novo atendimento</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>

          <div class="modal-body">
            <p>Em constru??o...
            </p>
          </div>

        </div>
      </div>
    </div>

  <?php } ?>
  <?php
  // Verifica de existe o ID de um atendimento setado.
  // Se n?o houver, exibe a parte de CADASTRO DE NOVO ATENDIMENTO
  if (isset($atd)) { ?>
    <?php
    //Busca informa??es do atendimento

    $pdo = ConnectionN3();
    $show_atd = $pdo->prepare("SELECT melhorias.`area`, melhorias.`tipo`, melhorias.`categoria`, melhorias.`subcategoria`, melhorias.`item`, melhorias.`local`, melhorias.nivel, melhorias.forma, melhorias.desc_abertura, melhorias.desc_fechamento, melhorias.abertura, melhorias.fechamento, melhorias.reincidente, melhorias.`status`, melhorias.`tecnico`,
clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
categorias.cat_nome,
subcategorias.scat_nome,
itens.itens_nome,
usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
FROM melhorias 
INNER JOIN clientes ON clientes.clt_id = melhorias.cliente
LEFT JOIN pessoas ON pessoas.pessoa_id = melhorias.pessoa
LEFT JOIN locais ON locais.local_id = melhorias.`local`
LEFT JOIN categorias ON categorias.cat_id = melhorias.categoria
LEFT JOIN subcategorias ON subcategorias.scat_id = melhorias.subcategoria
LEFT JOIN itens ON itens.itens_id = melhorias.item
LEFT JOIN usuarios ON usuarios.user_id = melhorias.tecnico
WHERE melhorias.id = '$atd'");
    $show_atd->execute();
    $row = $show_atd->fetch(PDO::FETCH_ASSOC);
    $atd_desc_abertura = $row["desc_abertura"];
    $atd_desc_fechamento = $row["desc_fechamento"];
    $atd_hora_abertura = $row["abertura"];
    $atd_hora_fechamento = $row["fechamento"];
    $atd_reincidente = $row["reincidente"];
    $atd_status = $row["status"];
    $atd_tipo = $row["tipo"];
    if ($atd_tipo == 1) {
      $atd_tipo_nome = "Falha";
    }
    if ($atd_tipo == 7) {
      $atd_tipo_nome = "Tarefa";
    }
    if ($atd_tipo == 6) {
      $atd_tipo_nome = "Melhorias";
    }
    if ($atd_tipo == 2) {
      $atd_tipo_nome = "Relacionamento";
    }
    if ($atd_tipo == 3) {
      $atd_tipo_nome = "Requisi??o de Servi?os";
    }
    if ($atd_tipo == 4) {
      $atd_tipo_nome = "Requisi??o de informa??o";
    }
    if ($atd_tipo == 5) {
      $atd_tipo_nome = "Notifica??o de monitoramento";
    }
    if ($atd_tipo == 0) {
      $atd_tipo_nome = "N?o informado";
    }
    $atd_nivel = $row["nivel"];
    if ($atd_nivel == 0) {
      $atd_nivel_nome = "N?o informado";
    }
    if ($atd_nivel == 1) {
      $atd_nivel_nome = "N?vel 1";
    }
    if ($atd_nivel == 2) {
      $atd_nivel_nome = "N?vel 2";
    }
    if ($atd_nivel == 3) {
      $atd_nivel_nome = "N?vel 3";
    }
    if ($atd_nivel == 4) {
      $atd_nivel_nome = "Rotina";
    }
    if ($atd_nivel == 5) {
      $atd_nivel_nome = "Administrativo";
    }
    if ($atd_nivel == 6) {
      $atd_nivel_nome = "tarefa";
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
    if ($local == 0) {
      $local_nom = "N?o informado";
    }
    $local_end = $row["local_end"];
    $local_city = $row["local_city"];
    $local_uf = $row["local_uf"];
    $atd_cat = $row["categoria"];
    $atd_item = $row["item"];
    $cat_nome = $row["cat_nome"];
    $atd_scat = $row["subcategoria"];
    $scat_nome = $row["scat_nome"];
    $itens_nome = $row["itens_nome"];

    $tecnico_nome = $row["tecnico_nome"];
    $tecnico_id = $row["tecnico"];
    if ($tecnico_id == 0) {
      $tecnico_nome = "N?o Atribu?do";
    }
    ?>
    <div class="container-fluid">
      <div class="row mt-2">
        <div class="col-md-3 px-1">

          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-headset text-danger"></i> MELHORIA #<?php echo str_pad($atd, 5, '0', STR_PAD_LEFT); ?>
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
                <hr class="p-0 mt-2 mb-0">
                <li class="mt-1 align-items-center">
                  <div class="row px-0 mx-0 ">
                    <div class="col-10 pt-1 small">
                      <strong>Classifica??o do Atendimento:</strong>
                    </div>
                    <?php if ($m3_01 == 3) { ?>
                      <div class="col-2 text-right">
                        <button type="button" class="btn btn-outline-secondary btn-sm small" data-toggle="modal" data-target="#atd_edt"> <i class="far fa-edit"></i></button>
                      </div>
                    <?php } ?>
                  </div>
                </li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center">
                  <?php if ($atd_forma == 1) { ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> Atendimento Remoto <?php } ?>
                  <?php if ($atd_forma == 2) { ?> <i class="fas fa-briefcase mr-2 text-danger"></i> Atendimento Presencial <?php } ?>
                  <?php if ($atd_forma == 3) { ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> Atendimento Remoto - Plant?o <?php } ?>
                  <?php if ($atd_forma == 4) { ?> <i class="fas fa-briefcase mr-2 text-danger"></i> Atendimento Presencial - Plant?o <?php } ?>
                  <span class="badge badge-warning ml-3"><?php echo $atd_nivel_nome; ?></span>
                  <?php if ($atd_reincidente == 1) { ?>
                    <i class=" ml-3 fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
                  <?php } ?>
                </li>
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-archive mr-2"></i><?php echo $atd_tipo_nome; ?></li>
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
                  <i class="fas fa-check"></i> A??es
                </div>
                <div class="col-6 text-right px-0">
                  <?php if ($atd_status == 0) { ?>
                    <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Atendimento Agendado </button>
                  <?php } ?>
                  <?php if ($atd_status == 1) { ?>
                    <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="fas fa-hourglass-half"></i> Aguardando Execu??o </button>
                  <?php } ?>
                  <?php if ($atd_status == 2) { ?>
                    <button type="button" class="btn btn-primary btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Atendimento em Execu??o </button>
                  <?php } ?>
                  <?php if ($atd_status == 3) { ?>
                    <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Atendimento em Espera </button>
                  <?php } ?>
                  <?php if ($atd_status == 5) { ?>
                    <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Conclu?do </button>
                  <?php } ?>
                  <?php if ($atd_status == 4) { ?>
                    <button type="button" class="btn btn-success btn-sm btn-block text-center text-dark"> <i class="fas fa-check"></i> Atendimento Finalizado </button>
                  <?php } ?>
                </div>
              </div>
            </div>
            <div class="card-body py-1">

              <div class="form-row">
                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Abertura:</label>
                  <input class="form-control form-control-sm" value="<?php echo date('d/m/y H:i', strtotime($atd_hora_abertura)); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Prazo:</label>
                  <input class="form-control form-control-sm" value="<?php echo $time_limit_to_close = date("d/m/y H:i", strtotime($atd_hora_abertura . " +20 hours")); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">T?cnico:</label>
                  <input class="form-control form-control-sm" value="<?php echo $tecnico_nome; ?>" disabled="">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descri??o de abertura:</label>
                  <textarea class="form-control form-control-sm" rows="4" disabled=""><?php echo $atd_desc_abertura; ?></textarea>
                </div>
              </div>
              <?php if ($atd_status == 4) { ?>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Descri??o de fechamento:</label>
                    <textarea class="form-control form-control-sm" rows="3" disabled=""><?php echo $atd_desc_fechamento; ?></textarea>
                  </div>
                </div>
              <?php } ?>
              <div class="row">
                <?php
                //ANALISA E ALTERA REGRAS PARA EXIBI??O DE BOT?ES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

                //SE N?O HOUVER T?CNICO ATRIBU?DO PARA O ATENDIMENTO
                if ($tecnico_id == 0) {
                  $exibe_bt_atd_aceitar = true;
                }

                //SE O ATENDIMENTO ESTIVER AGUARDANDO E O USU?RIO FOR O T?CNICO
                if ($atd_status == 1 && $tecnico_id == $user_id) {
                  $exibe_bt_atd_aceitar = true;
                }
                if ($atd_status == 1) {
                  $exibe_bt_atd_espera = true;
                }
                //SE O ATENDIMENTO ESTIVER EM ESPERA E O USU?RIO FOR O T?CNICO
                if ($atd_status == 3 && $tecnico_id == $user_id) {
                  $exibe_bt_atd_retomar = true;
                }
                //if($atd_status==5 && $tecnico_id==$user_id){ $exibe_bt_atd_retomar=true; }
                //SE O ATENDIMENTO ESTIVER EM EXECU??O E O USU?RIO FOR O T?CNICO
                if ($atd_status == 2 && $tecnico_id == $user_id) {
                  $exibe_bt_atd_devolver = true;
                  $exibe_bt_atd_espera = true;
                  $exibe_bt_atd_concluido = true;
                  $exibe_bt_atd_finalizar = true;
                }

                //ANALISA E ALTERA REGRAS PARA EXIBI??O DE BOT?ES, MODAIS, ETC DE ACORDO COM A PERMISS?O DO USU?RIO
                if ($m3_02 == 0) {
                  $exibe_bt_atd_aceitar = true;
                  $exibe_bt_atd_finalizar = false;
                }
                if ($m3_03 == 0) {
                  $exibe_bt_atd_espera = false;
                }
                if ($m3_03 == 0) {
                  $exibe_bt_atd_concluido = true;
                }
                if ($m3_04 == 0) {
                  $exibe_bt_atd_devolver = false;
                }
                if ($m3_05 == 0) {
                  $exibe_bt_atd_finalizar = false;
                }
                if ($m3_05 == 0) {
                  $exibe_bt_atd_search = false;
                }


                if ($m3_05 == 2) { //se usu?rio com permiss?o para editar melhorias de terceiros
                  if ($atd_status == 3) {
                    $exibe_bt_atd_retomar = true;
                  }
                  $exibe_bt_atd_devolver = true;
                  if ($atd_status == 2 && $m3_03 == 2) {
                    $exibe_bt_atd_espera = true;
                  } elseif ($atd_status == 2 && $m3_03 == 0) {
                    $exibe_bt_atd_espera = false;
                  }
                  if ($atd_status == 2) {
                    $exibe_bt_atd_concluido = true;
                  }
                  if ($atd_status > 1 && $atd_status < 4) {
                    $exibe_bt_atd_finalizar = true;
                  }
                  if ($atd_status == 5) {
                    $exibe_bt_atd_finalizar = true;
                  }
                }

                ?>
                <?php if ($exibe_bt_atd_interacao == true) { ?>
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_new_inter"> <i class="fas fa-headset"></i> Nova Intera??o </button>
                  </div>
                <?php } ?>
                <?php if ($exibe_bt_atd_aceitar == true) { ?>
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_aceitar"> <i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar </button>
                  </div>
                <?php } ?>
                <?php if ($exibe_bt_atd_retomar == true) { ?>
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_retomar"> <i class="far fa-arrow-alt-circle-down"></i> Retomar </button>
                  </div>
                <?php } ?>
                <?php if ($exibe_bt_atd_espera == true) { ?>
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_espera"> <i class="far fa-pause-circle"></i> Colocar em Espera </button>
                  </div>
                <?php } ?>
                <?php if ($exibe_bt_atd_concluido == true) { ?>
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_concluido"> <i class="far fa-pause-circle"></i> Conclu?do </button>
                  </div>
                <?php } ?>
                <?php if ($exibe_bt_atd_devolver == true) { ?>
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_recusar"> <i class="far fa-arrow-alt-circle-up"></i> Recusar </button>
                  </div>
                <?php } ?>
                <?php if ($exibe_bt_atd_finalizar == true) { ?>
                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_finalizar"> <i class="far fa-check-circle"></i> Finalizar </button>
                  </div>

                  <div class="col-3 px-1">
                    <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_feedback"> <i class="far fa-check-circle"></i> Solicitar Feedback </button>
                  </div>
                <?php } ?>
              </div>


            </div>
          </div>
        </div>

        <div class="col-md-3 px-1">
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-list-ol"></i> Hist?rico da Melhoria #<?php echo str_pad($atd, 5, '0', STR_PAD_LEFT); ?>
            </div>
            <div class="card-body">
              <div class="col-md-9 px-0">
                <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_search">
                  <i class="fas fa-filter"></i> Registros de melhorias </button>
              </div>

              <div class="timeline">
                <?php
                $pdo = ConnectionN3();
                $show_inter = $pdo->prepare("SELECT interatividade_melhorias.*, usuarios.user_nome FROM interatividade_melhorias INNER JOIN usuarios ON usuarios.user_id = interatividade_melhorias.inter_user WHERE interatividade_melhorias.inter_atd = '$atd' AND interatividade_melhorias.inter_tipo > '0' ORDER BY inter_id DESC");
                $show_inter->execute();
                while ($exibe = $show_inter->fetch(PDO::FETCH_ASSOC)) {
                  $inter_tipo = $exibe["inter_tipo"];
                  $inter_data = $exibe["inter_data"];
                  $inter_desc = $exibe["inter_desc"];
                  $inter_user = $exibe["user_nome"];

                  //define cores de acordo com o tipo da interatividade_melhorias
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
                  } //3 = Devolu??o de Atendimento
                  if ($inter_tipo == 4) {
                    $tl_dot_color = "b-warning";
                    $tl_active_color = "active-warning";
                  } //4 = Transfer?ncia de Atendim
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
                  } //7 = Intera??o com o solicita
                  if ($inter_tipo == 8) {
                    $tl_dot_color = "b-success";
                    $tl_active_color = "active-success";
                  } //8 = Conclus?o de Atendimento
                  if ($inter_tipo == 9) {
                    $tl_dot_color = "b-danger";
                    $tl_active_color = "active-danger";
                  } //9 = Edi??o da classifica??o do Atendimento
                  if ($inter_tipo == 10) {
                    $tl_dot_color = "b-warning";
                    $tl_active_color = "active-warningr";
                  } //10 = Conclu?do
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
    <!-- MODAL NOVA INTERA??O -->
    <div class="modal fade" id="atd_new_inter" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-headset text-primary"></i> Nova Intera??o</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small"><span style="color: grey;"><b>Descri??o da intera??o:</b></span></label>
                  <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="atd" value="<?php echo $atd; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="atd_new_inter">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="atd_search" tabindex="1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <form action="#" method="POST" onSubmit="window.location.reload()">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-filter text-primary"></i> Registros de melhorias</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row">

                <?php
                $pdo = ConnectionN3();
                $show_clt = $pdo->prepare("SELECT cliente, categoria, subcategoria, item, id, cat_nome, scat_nome, itens_nome FROM melhorias a 
                LEFT JOIN categorias ON categorias.cat_id = a.categoria
                LEFT JOIN subcategorias ON subcategorias.scat_id = a.subcategoria
                LEFT JOIN itens ON itens.itens_id = a.item
                WHERE a.id = " . $atd);
                $show_clt->execute();
                $exibe = $show_clt->fetch(PDO::FETCH_ASSOC);
                $clienteId = $exibe["cliente"];
                $clienteId = $exibe["cliente"];

                $categoriaId = $exibe["categoria"];
                $categoria = $exibe["cat_nome"];

                $subcategoriaId = $exibe["subcategoria"];
                $subcategoria = $exibe["scat_nome"];

                $itemId = $exibe["item"];
                $item = $exibe["itens_nome"];

                $idId = $exibe["id"];


                $showInsightsInfo = $pdo->prepare("SELECT 
                melhorias.id,
                categorias.cat_nome AS categoria,
                subcategorias.scat_nome AS subcategoria,
                itens.itens_nome AS item,
                COUNT(melhorias.id) AS total_melhorias,
                clientes.clt_nomer AS cliente_nome
                FROM melhorias
                INNER JOIN clientes ON clientes.clt_id = melhorias.cliente
                LEFT JOIN categorias ON categorias.cat_id = melhorias.categoria
                LEFT JOIN subcategorias ON subcategorias.scat_id = melhorias.subcategoria
                LEFT JOIN itens ON itens.itens_id = melhorias.item
                WHERE melhorias.cliente = " . $clienteId . "
                AND melhorias.abertura > NOW() - INTERVAL 3 MONTH
                GROUP BY clientes.clt_id, categorias.cat_id, subcategorias.scat_id, itens.itens_id
                ORDER BY total_melhorias DESC");

                $showInsightsInfo->execute();

                $exibeInsights = $showInsightsInfo->fetch(PDO::FETCH_ASSOC);
                ?>

                <div class="form-group col-sm-12">
                  <h4>Informações atendimento #<?php echo $atd; ?></h4>
                  <p><b>Categoria: </b><?php echo $categoria; ?></p>
                  <p><b>Subcategoria:</b> <?php echo $subcategoria; ?> </p>
                  <p><b>Item:</b> <?php echo $item ?? '-' ?> </p>
                  <p><b>Total de melhorias</b> <small>(últimos 3 meses)</small>: <b><?php echo $exibeInsights['total_melhorias']; ?></b></p>
                  <hr />

                  <h6>melhorias: </h6>

                  <?php
                  $pdo = ConnectionN3();
                  $item = isset($itemId) ? " item = " . $itemId : " item IS NULL";
                  $show_atd = $pdo->prepare("SELECT * FROM melhorias a WHERE a.cliente = " . $clienteId . " AND a.categoria = " . $categoriaId . " AND a.subcategoria =  " . $subcategoriaId . " AND " . $item . " AND a.abertura > NOW() - INTERVAL 3 MONTH LIMIT 10 ");
                  $show_atd->execute();

                  while ($atendimento = $show_atd->fetch(PDO::FETCH_ASSOC)) { ?>

                    <button type="submit" class="btn btn-sm btn-primary" name="atd" value=<?php echo $atendimento['id'] ?>>Ir para</button>
                    <?php echo "<i>Chamado</i> <b>#" . $atendimento['id'] . "</b> | <br/><b>Mensagem de conclus?o:</b> " . $atendimento['desc_fechamento']; ?>
                    <?php echo "<hr/><br/>"; ?>

                  <?php } ?>

                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal fade" id="atd_search" tabindex="1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <form action="#" method="POST" onSubmit="window.location.reload()">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-filter text-primary"></i> Registros de melhorias</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row">

                <?php
                $pdo = ConnectionN3();
                $show_clt = $pdo->prepare("SELECT cliente, categoria, subcategoria, item, id, cat_nome, scat_nome, itens_nome FROM melhorias a 
                LEFT JOIN categorias ON categorias.cat_id = a.categoria
                LEFT JOIN subcategorias ON subcategorias.scat_id = a.subcategoria
                LEFT JOIN itens ON itens.itens_id = a.item
                WHERE a.id = " . $atd);
                $show_clt->execute();
                $exibe = $show_clt->fetch(PDO::FETCH_ASSOC);
                $clienteId = $exibe["cliente"];
                $clienteId = $exibe["cliente"];

                $categoriaId = $exibe["categoria"];
                $categoria = $exibe["cat_nome"];

                $subcategoriaId = $exibe["subcategoria"];
                $subcategoria = $exibe["scat_nome"];

                $itemId = $exibe["item"];
                $item = $exibe["itens_nome"];

                $idId = $exibe["id"];


                $showInsightsInfo = $pdo->prepare("SELECT 
                melhorias.id,
                categorias.cat_nome AS categoria,
                subcategorias.scat_nome AS subcategoria,
                itens.itens_nome AS item,
                COUNT(melhorias.id) AS total_melhorias,
                clientes.clt_nomer AS cliente_nome
                FROM melhorias
                INNER JOIN clientes ON clientes.clt_id = melhorias.cliente
                LEFT JOIN categorias ON categorias.cat_id = melhorias.categoria
                LEFT JOIN subcategorias ON subcategorias.scat_id = melhorias.subcategoria
                LEFT JOIN itens ON itens.itens_id = melhorias.item
                WHERE melhorias.cliente = " . $clienteId . "
                AND melhorias.abertura > NOW() - INTERVAL 3 MONTH
                GROUP BY clientes.clt_id, categorias.cat_id, subcategorias.scat_id, itens.itens_id
                ORDER BY total_melhorias DESC");

                $showInsightsInfo->execute();

                $exibeInsights = $showInsightsInfo->fetch(PDO::FETCH_ASSOC);
                ?>

                <div class="form-group col-sm-12">
                  <h4>Informações atendimento #<?php echo $atd; ?></h4>
                  <p><b>Categoria: </b><?php echo $categoria; ?></p>
                  <p><b>Subcategoria:</b> <?php echo $subcategoria; ?> </p>
                  <p><b>Item:</b> <?php echo $item ?? '-' ?> </p>
                  <p><b>Total de melhorias</b> <small>(últimos 3 meses)</small>: <b><?php echo $exibeInsights['total_melhorias']; ?></b></p>
                  <hr />

                  <h6>melhorias: </h6>

                  <?php
                  $pdo = ConnectionN3();
                  $item = isset($itemId) ? " item = " . $itemId : " item IS NULL";
                  $show_atd = $pdo->prepare("SELECT * FROM melhorias a WHERE a.cliente = " . $clienteId . " AND a.categoria = " . $categoriaId . " AND a.subcategoria =  " . $subcategoriaId . " AND " . $item . " AND a.abertura > NOW() - INTERVAL 3 MONTH LIMIT 10 ");
                  $show_atd->execute();

                  while ($atendimento = $show_atd->fetch(PDO::FETCH_ASSOC)) { ?>

                    <button type="submit" class="btn btn-sm btn-primary" name="atd" value=<?php echo $atendimento['id'] ?>>Ir para</button>
                    <?php echo "<i>Chamado</i> <b>#" . $atendimento['id'] . "</b> | <br/><b>Mensagem de conclus?o:</b> " . $atendimento['desc_fechamento']; ?>
                    <?php echo "<hr/><br/>"; ?>

                  <?php } ?>

                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL EDI??O DA CLASSIFICA??O DO ATENDIMENTO-->
    <div class="modal fade" id="atd_edt" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edi??o da classifica??o do atendimento</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row pt-2">
                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Tipo de atendimento:</label>
                  <select name="tipo" class="form-control form-control-sm" required="required" tabindex="4">
                    <option></option>
                    <option value="1" <?php if ($atd_tipo == 1) {
                                        echo " selected";
                                      } ?>>Falha</option>
                    <option value="7" <?php if ($atd_tipo == 6) {
                                        echo " selected";
                                      } ?>>Tarefa</option>
                    <option value="6" <?php if ($atd_tipo == 6) {
                                        echo " selected";
                                      } ?>>Melhorias</option>
                    <option value="2" <?php if ($atd_tipo == 2) {
                                        echo " selected";
                                      } ?>>Relacionamento</option>
                    <option value="3" <?php if ($atd_tipo == 3) {
                                        echo " selected";
                                      } ?>>Requisi??o de Servi?os</option>
                    <option value="4" <?php if ($atd_tipo == 4) {
                                        echo " selected";
                                      } ?>>Requisi??o de informa??o</option>
                    <option value="5" <?php if ($atd_tipo == 5) {
                                        echo " selected";
                                      } ?>>Notifica??o de monitoramento</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Categoria:</label>
                  <select name="categoria" id="categoria" class="form-control form-control-sm" required="required" tabindex="5">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
                    $show_clt->execute();
                    while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                      $cat_id = $exibe["cat_id"];
                      $cat_nome = $exibe["cat_nome"];
                    ?>
                      <option value="<?php echo $cat_id; ?>" <?php if ($cat_id == $atd_cat) {
                                                                echo " selected";
                                                              } ?>><?php echo $cat_nome; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <!-- Este select ser? populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Subcategoria:</label>
                  <span class="carregando3 small">Aguarde, carregando...</span>
                  <select name="subcategoria" id="subcategoria" class="form-control form-control-sm" required="required" tabindex="6">
                    <option value="<?php echo $atd_scat; ?>"><?php echo $scat_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Item:</label>
                  <span class="carregando4 small">Aguarde, carregando...</span>
                  <select name="item" id="item" class="form-control form-control-sm" required="required" tabindex="6">
                    <option value="<?php echo $atd_item; ?>"><?php echo $itens_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">N?vel:</label>
                  <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
                    <option></option>
                    <option value="1" <?php if ($atd_nivel == 1) {
                                        echo " selected";
                                      } ?>>1</option>
                    <option value="2" <?php if ($atd_nivel == 2) {
                                        echo " selected";
                                      } ?>>2</option>
                    <option value="3" <?php if ($atd_nivel == 3) {
                                        echo " selected";
                                      } ?>>3</option>
                    <option value="4" <?php if ($atd_nivel == 4) {
                                        echo " selected";
                                      } ?>>Rotina</option>
                    <option value="5" <?php if ($atd_nivel == 5) {
                                        echo " selected";
                                      } ?>>Administrativo</option>
                    <option value="0" <?php if ($atd_nivel == 0) {
                                        echo " selected";
                                      } ?>>NA</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Forma de atendimento:</label>
                  <select name="forma" class="form-control form-control-sm" required="required" tabindex="9">
                    <option></option>
                    <option value="1" <?php if ($atd_forma == 1) {
                                        echo " selected";
                                      } ?>>Remoto</option>
                    <option value="2" <?php if ($atd_forma == 2) {
                                        echo " selected";
                                      } ?>>Presencial</option>
                    <option value="3" <?php if ($atd_forma == 3) {
                                        echo " selected";
                                      } ?>>Remoto - Plant?o</option>
                    <option value="4" <?php if ($atd_forma == 4) {
                                        echo " selected";
                                      } ?>>Presencial - Plant?o</option>
                  </select>
                </div>


                <div class="form-group col-sm-6 col-md-10">
                  <label class="my-0 small">Descri??o de abertura:</label>
                  <textarea name="desc_abertura" placeholder="<?php echo $atd_desc_abertura; ?>" class="form-control form-control-sm" rows="5" tabindex="9"></textarea>
                </div>

              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="atd" value="<?php echo $atd; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="atd_edt">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-danger">Editar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <?php if ($exibe_bt_atd_aceitar == true) { ?>
      <!-- MODAL ACEITE DO CHAMADO -->
      <div class="modal fade" id="atd_aceitar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down text-success"></i> Iniciar atendimento ou direcionar para outro T?cnico</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <label class="small"><strong>Iniciar o atendimento:</strong></label>
                <label class="small">Se o t?cnico informado for o pr?prio usu?rio:<br>
                  <i><strong>a)</strong></i> Este atendimento ficar? sob sua responsabilidade;<br>
                  <i><strong>b)</strong></i> O status do atendimento ser? alterado para <span style="color: #f00;">''Em execu??o''.</span></label>
                <label class="small pt-1"><strong>Direcionar a outro t?cnico:</strong></label>
                <label class="small">Se o t?cnico informado <span style="color: #f00;">''N?O''</span> for o pr?prio usu?rio:<br>
                  <i><strong>a)</strong></i> Este atendimento ser? redirecionado para a fila de melhorias do t?cnico informado;<br>
                  <i><strong>b)</strong></i> Este atendimento continuar? com o status <span style="color: #f00;">''Aguardando Atendimento''</span> at? que o t?cnico respons?vel confirme o in?cio da execu??o.</label><br>
                <label class="small pt-1"><strong>N?o esque?a de informar todas as intera??es com o cliente.</strong></label>
                <div class="form-row">

                  <div class="form-group col-sm-12">
                    <label class="my-0 small">T?cnico respons?vel:</label>
                    <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="9">

                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $tecnico_id = $exibe["user_id"];
                        $tecnico_nome = $exibe["user_nome"];
                      ?>
                        <option value="<?php echo $tecnico_id; ?>" <?php if ($tecnico_id == $user_id) {
                                                                      echo " selected";
                                                                    } ?>><?php echo $tecnico_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_aceitar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_atd_retomar == true) { ?>
      <!-- MODAL RETOMAR ATENDIMENTO -->
      <div class="modal fade" id="atd_retomar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down"></i> Retomar</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <label class="small">Confirma??o de retomada do atendimento.</label>
              <label class="small">Este atendimento estava aguardando o retorno de um terceiro. Ao retomar este atendimento ele ficar? sob sua responsabilidade. N?o esque?a de informar todas as intera??o com o cliente.</label>
            </div>
            <div class="modal-footer">
              <form action="#" method="POST">
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_retomar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Retomar o atendimento</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_atd_espera == true) { ?>
      <!-- MODAL COLOCAR EM ESPERA -->
      <div class="modal fade" id="atd_espera" tabindex="-1" role="dialog">
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
                <label class="small"><span style="color: #f00;">melhorias <b>Em Espera</b> s?o aqueles que n?o podem ser finalizados, <br>? preciso aguardar o retorno do <b>T?CNICO</b></span> <b> EXTERNO </b><span style="color: #f00;"> da N?vel 3 TI.</span></label>
                <label class="small"><i><b>Ao colocar em espera:</b></i><br> <strong>a)</strong> Este atendimento continuar? sob a sua responsabilidade; <br><strong>b)</strong> O status do atendimento ser? alterado para <b>"Em espera";</b> <strong><br>c)</strong> Ap?s o per?odo de <b>Espera</b>, o status do atendimento ser? alterado para <br><b>"Em Execu??o".</b></label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small"><i>Motivo da espera:</i></label>
                    <textarea name="espera_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small"><i>Data prevista para encerramento da espera:</i></label>
                    <input type="text" id="datetimepicker" name="espera_prev" value="<?php echo date("Y-m-d H:i", strtotime($agora . " +4 days")); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="2">
                  </div>
                </div>
                <div class="form-row">
                  <label class="my-0 small"><br><i>Causa:</i><br></label>
                  <select name="espera_causa" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="9">
                    <option value="Terceiro">Terceiro</option>
                    <option value="Nivel3">N?vel3</option>
                    <option value="Cliente">Cliente</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_espera">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Colocar em espera</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_atd_concluido == true) { ?>
      <!-- MODAL COLOCAR EM concluido -->
      <div class="modal fade" id="atd_concluido" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-pause-circle text-warning"></i> Colocar atendimento em concluido</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small"><span style="color: grey;"><b>Motivo da Conclus?o:</b></span></label>
                    <textarea name="concluido_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <!--<label class="my-0 small">Data prevista para encerramento da Conclus?o:</label>-->
                    <input type="hidden" id="datetimepicker2" name="espera_prev" value="<?php echo date("Y-m-d H:i", strtotime($agora . " +4 days")); ?>">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_concluido">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Colocar em conclu?do</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_atd_devolver == true) { ?>
      <!-- MODAL RECUSAR ATENDIMENTO -->
      <div class="modal fade" id="atd_recusar" tabindex="-1" role="dialog">
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
                  <label class="small">Ao confirmar esta tela <span style="color:#f00;"><b>SEM</b></span> <b>informar um t?cnico:</b> <br><b>a)</b> O atendimento voltar? para a fila de atendimento sem um respons?vel; <br> <b>b)</b> Este atendimento continuar? com o status <span style="color: #f00;">''Aguardando Atendimento''</span> at? que um t?cnico o aceite.</label>
                  <label class="small pt-1"><strong>Direcionar atendimento:</strong></label>
                  <label class="small">Ao confirmar esta tela informando um t?cnico respons?vel: <br><b>a)</b> Este atendimento ser? redirecionado para a fila de melhorias do t?cnico informado; <br> <b>b)</b> Este atendimento continuar? com o status <span style="color: #f00;">''Aguardando Atendimento''</span> at? que o t?cnico respons?vel confirme o in?cio da execu??o.</label>
                  <label class="small pt-1"><strong>N?o esque?a de informar todas as intera??es com o cliente</strong></label>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">T?cnico Respons?vel:</label>
                    <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="9">
                      <option value="0">N?o atribu?do</option>
                      <?php
                      $pdo = ConnectionN3();
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
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_recusar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-danger">Recusar Atendimento</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_atd_finalizar == true) { ?>
      <!-- MODAL FINALIZAR ATENDIMENTO -->
      <div class="modal fade" id="atd_finalizar" tabindex="-1" role="dialog">
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
                    <label class="my-0 small"><span style="color: grey;"><b>O atendimento ser? finalizado!</b></span></label>
                    <textarea name="desc_fechamento" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                    <!-- <textarea name="desc_fechamento" class="form-control form-control-sm" rows="4" required="required" tabindex="1" ></textarea>-->
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_finalizar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal fade" id="atd_feedback" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-check-circle text-primary"></i>Feedback</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body py-1">
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Deseja Solicitar o Feedback do Cliente?</label>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_feedback">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-primary">Solicitar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>
    <!-- MODAL DE AJUDA PARA A GEST?O DE UM ATENDIMENTO -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Gest?o do atendimento</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>

          <div class="modal-body">
            <p><strong>O atendimento deve ser gerido da seguinte forma:</strong></p>
            <ul class="list">
              <li>Registre tudo atrav?s de <span class="badge badge-light"><i class="fas fa-headset"></i> Nova Intera??o </span>
                <ul>
                  <li class="small">Coment?rios do cliente, informa??es que voc? observar e o trabalho que voc? executou devem ser registrados.</li>
                  <li class="small">Cada registro que voc? fizer ser? exibido no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Hist?rico do atendimento</span> com a data/hora e o seu nome.</li>
                </ul>
              </li>
              <li class="pt-1">Iniciei a execu??o do atendimento atrav?s do <span class="badge badge-light"><i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar</span>
                <ul>
                  <li class="small">Se voc? for o t?cnico que executar? o atendimento, apenas confirme o seu nome como <em>T?cnico Respos?vel</em>.</li>
                  <li class="small">Quando voc? confirmar seu nome como <em>T?cnico Respos?vel</em> pelo atendimento outras op??es de gest?o do atendimento aparecer?o na sua tela.</li>
                  <li class="small">Se n?o for voc? quem executar? o atendimento, voc? pode tamb?m informar quem ser? o t?cnico que dever? executar o atendimento.</li>
                  <li class="small">Cada a??o que voc? fizer ser? exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Hist?rico do atendimento</span> com a data/hora e o seu nome.</li>
                </ul>
              </li>
              <li class="pt-1">Voc? pode usar o recurso <span class="badge badge-light"><i class="far fa-pause-circle"></i> Colocar em Espera</span> caso o atendimento precise ser <em>pausado</em> enquanto aguarda um retorno externo.
                <ul>
                  <li class="small">Mas, este recurso s? deve ser utilizado quando estamos aguardando um retorno de algu?m externo a N?vel 3 TI.</li>
                  <li class="small">Voc? precisar? informar uma Data/Hora futura como previs?o para encessamento da espera.</li>
                  <li class="small">Quando voc? colocar um atendimento em espera o prazo para finalizar ser? <em>pausado</em>.</li>
                  <li class="small">Quando o prazo estabelecido <em>vencer</em> o atendimento voltar? para o status <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execu??o</span>.</li>
                </ul>
              </li>
              <li class="pt-1">Voc? pode usar o recurso <span class="badge badge-light"><i class="far fa-arrow-alt-circle-up"></i> Recusar</span> para <em>devolver</em> o atendimento a fila de espera ou tranfer?-lo para outro t?cnico.
                <ul>
                  <li class="small">Para fazer isso, voc? ter? que inserir uma justificativa.</li>
                  <li class="small">Cada a??o que voc? fizer ser? exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Hist?rico do atendimento</span> com a data/hora e o seu nome.</li>
                </ul>
              </li>
              <li class="pt-1">Voc? deve <span class="badge badge-light"><i class="far fa-check-circle"></i> Finalizar</span> o atendimento quando o problema do cliente for sanado.
                <ul>
                  <li class="small">Para fazer isso, voc? ter? que inserir um relato de encerramento.</li>
                  <li class="small">Procure descrever bem o trabalho que voc? realizou e com quais pessoas voc? falou.</li>
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
  <script src="../js/bootstrap.min.js"></script>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <!-- bootstrap.bundle e bootstrap-select s?o necess?rios para seja poss?vel pesquisar por nome no select cliente-->
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>
  <script>
    $('.selectpicker').selectpicker();
  </script>

  <?php if (empty($atd) || $exibe_bt_atd_espera == true) { ?>
    <!-- CAMPO DE DATA E HORA DA TELA DE ESPERA -->
    <script type="text/javascript" src="../js/bootstrap-datetimepicker.js" charset="UTF-8"></script>
    <script type="text/javascript">
      $.fn.datetimepicker.dates['en'] = {
        format: 'dd/mm/yyyy',
        days: ["Domingo", "Segunda", "Ter?a", "Quarta", "Quinta", "Sexta", "S?bado", "Domingo"],
        daysShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S?b", "Dom"],
        daysMin: ["Do", "Se", "Te", "Qu", "Qu", "Se", "Sa", "Do"],
        months: ["Janeiro", "Fevereiro", "Mar?o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
        monthsShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        today: "Hoje",
        suffix: [],
        meridiem: []
      };
    </script>
    <script type="text/javascript">
      $(".form_datetime").datetimepicker({
        format: "yyyy-mm-dd hh:ii"
      });
    </script>
  <?php } ?>
  <?php if (empty($atd) || $exibe_bt_atd_concluido == true) { ?>
    <!-- CAMPO DE DATA E HORA DA TELA DE conclu?do -->
    <script type="text/javascript" src="../js/bootstrap-datetimepicker.js" charset="UTF-8"></script>
    <script type="text/javascript">
      $.fn.datetimepicker2.dates['en'] = {
        format: 'dd/mm/yyyy',
        days: ["Domingo", "Segunda", "Ter?a", "Quarta", "Quinta", "Sexta", "S?bado", "Domingo"],
        daysShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S?b", "Dom"],
        daysMin: ["Do", "Se", "Te", "Qu", "Qu", "Se", "Sa", "Do"],
        months: ["Janeiro", "Fevereiro", "Mar?o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
        monthsShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        today: "Hoje",
        suffix: [],
        meridiem: []
      };
    </script>
    <script type="text/javascript">
      $(".form_datetime2").datetimepicker2({
        format: "yyyy-mm-dd hh:ii"
      });
    </script>
  <?php } ?>


  <!-- loader e os js abaixo s?o necess?rios para popular os selects dependentes (solicitante, local e subcategoria) -->
  <script src="../js/loader.js" type="text/javascript"></script>
  <?php if (empty($atd)) { ?>
    <script type="text/javascript">
      //pupula os selects solicitante e local de acordo com o cliente escolhido
      $(function() {
        $('#cliente').change(function() {
          if ($(this).val()) {
            $('#solicitante').hide();
            $('#local').hide();
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
              $('#solicitante').html(options).show();
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
              $('#local').html(options).show();
              $('.carregando2').hide();
            });
          } else {
            $('#solicitante').html('<option value="">Escolha o Solicitante</option>');
            $('#local').html('<option value="">Escolha o Local</option>');
          }
        });
      });
    </script>
  <?php } ?>
  <script type="text/javascript">
    //popula os selects subcategoria de acordo com a categoria escolhida
    $(function() {
      $('#categoria').change(function() {
        if ($(this).val()) {
          $('#subcategoria').hide();
          $('.carregando3').show();
          $.getJSON('busca_subcategorias.php?search=', {
            categoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha a Subcategoria</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#subcategoria').html(options).show();
            $('.carregando3').hide();
          });

        } else {
          $('#subcategoria').html('<option value="">Escolha a Subcategoria</option>');
        }
      });
    });
  </script>
  <script type="text/javascript">
    //pupula os selects ITEM de acordo com a SUBcategoria escolhida
    $(function() {
      $('#subcategoria').change(function() {
        if ($(this).val()) {
          $('#item').hide();
          $('.carregando4').show();
          $.getJSON('busca_itens.php?search=', {
            subcategoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha o Item</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#item').html(options).show();
            $('.carregando4').hide();
          });
        } else {
          $('#item').html('<option value="">Escolha o Item</option>');
        }
      });
    });
  </script>

  <script type="text/javascript">
    //popula o nivel 
    $(function() {
      $('#recorrente').change(function() {
        if ($(this).val()) {
          var data = {
            recorrente: $('#recorrente').val(),
            ajax: 'true'
          };
          $.post('recorrente.php', data, function(response) {
            var aparecer = response.aparece;

            if (aparecer == 1) {
              $('#recorrente_date').removeAttr('hidden')
              $('#recorrente_datee').removeAttr('hidden');
              $('#recorrente_dateee').removeAttr('hidden');
            } else {
              $('#recorrente_date').attr('hidden', 'hidden');
              $('#recorrente_datee').attr('hidden', 'hidden');
              $('#recorrente_dateee').attr('hidden', 'hidden');
            }
          }, 'json');
        }
      });
    });
  </script>
  <script type="text/javascript">
    $(function() {
      $('#abertura_recorrente').change(function() {
        if ($(this).val()) {
          var data = {
            abertura_recorrente: $('#abertura_recorrente').val(),
            ajax: 'true'
          };
          $.post('recorrente_data.php', data, function(response) {
            var semana_mes = response.semana_mes;
            var dia_semana = response.dia_semana;
            $('#semana_mes_output').text('Toda ' + dia_semana + " na " + semana_mes + "? semana do m?s");
            $('#semana').val(semana_mes);
          }, 'json');
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
</body>

</html>