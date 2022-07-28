<?php
session_start();
//include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//if($m3_00==0){header("Location: ../index.php");}

if (isset($_POST['ord'])) {$ord = $_POST['ord'];} else {$ord = "vencimento";}
if ($ord == "vencimento") {$orderby = "custos.data_vencimento DESC";}
if ($ord == "competencia") {$orderby = "custos.data_competencia DESC";}
if ($ord == "tipo") {$orderby = "custos.tipo ASC";}
if ($ord == "valor") {$orderby = "custos.valor DESC";}
if ($ord == "status") {$orderby = "custos.status DESC";}
?>
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico"> 
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/timeline.css">
    <link rel="stylesheet" href="../css/ged_folder_files.css">   
<!-- Calendário -->
    <link rel="stylesheet" href="../css/jquery-ui.min_date.css">
    <title>Allterus</title>
    <style type="text/css">
      /* usado apenas para formatar a mensagem de espera para os selectbox dependentes */
      .carregando1{
        color:#ff0000;
        display:none;
      }
    </style>    
  </head>
  <body>
<?php // include_once("../all/loading.php"); ?>
<?php include_once("../all/header.php"); ?>
<?php 
//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);

//verifico se existe alguma requisição via post cahamda atd
$contrato_id = filter_input(INPUT_POST, 'contrato', FILTER_SANITIZE_NUMBER_INT);

if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

if ($usar_token=="true") {
  if($action){
    if ($action == "contrato_adc") {
      $cliente= filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_NUMBER_INT);
      $data_inicio = filter_input(INPUT_POST, 'data_inicio', FILTER_SANITIZE_STRING);
      $data_termino = filter_input(INPUT_POST, 'data_termino', FILTER_SANITIZE_STRING);
      $dia_pagamento = filter_input(INPUT_POST, 'dia_pagamento', FILTER_SANITIZE_NUMBER_INT);
      $valor_inicial = filter_input(INPUT_POST, 'valor_inicial', FILTER_SANITIZE_NUMBER_FLOAT);
      $forma_pag = filter_input(INPUT_POST, 'forma_pag', FILTER_SANITIZE_NUMBER_INT);
      $indice_reajuste = filter_input(INPUT_POST, 'indice_reajuste', FILTER_SANITIZE_NUMBER_INT);
      $c_cst = filter_input(INPUT_POST, 'centro_custo', FILTER_SANITIZE_NUMBER_INT);
      $class_contabil = filter_input(INPUT_POST, 'class_contabil', FILTER_SANITIZE_NUMBER_INT);
      $observacoes = filter_input(INPUT_POST, 'observacoes', FILTER_SANITIZE_STRING);
      $bancos = filter_input(INPUT_POST, 'bancos', FILTER_SANITIZE_STRING);
      $agencia= filter_input(INPUT_POST, 'agencia', FILTER_SANITIZE_STRING);
      $conta = filter_input(INPUT_POST, 'conta', FILTER_SANITIZE_STRING);

      //INICIA PROCESSO DE GRAVAÇÃO DO CONTRATO NA BASE DE DADOS
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `contratos` (`cliente`, `data_inicio`, `data_termino`, `dia_pagamento`, `valor_inicial`, `forma_pag`, `indice_reajuste`, `centro_custo`, `class_contabil`, `observacoes`, `bancos`, `agencia`, `conta`)
      VALUES (:cliente, :data_inicio, :data_termino, :dia_pagamento, :valor_inicial, :forma_pag, :indice_reajuste, :centro_custo, :class_contabil, :observacoes, :bancos, :agencia, :conta);");
      $adc->bindParam(':cliente', $cliente);
      $adc->bindParam(':data_inicio', $data_inicio);
      $adc->bindParam(':data_termino', $data_termino);
      $adc->bindParam(':dia_pagamento', $dia_pagamento);
      $adc->bindParam(':valor_inicial', $valor_inicial);
      $adc->bindParam(':forma_pag', $forma_pag);
      $adc->bindParam(':indice_reajuste', $indice_reajuste);
      $adc->bindParam(':centro_custo', $c_cst);
      $adc->bindParam(':class_contabil', $class_contabil);
      $adc->bindParam(':observacoes', $observacoes);
      $adc->bindParam(':bancos', $bancos);
      $adc->bindParam(':agencia', $agencia);
      $adc->bindParam(':conta', $conta);

      if($adc->execute()){
        $contrato_id = $pdo->lastInsertId();
        $mensagem = "<i class=\"fas fa-check\"></i> Contrato cadastrado!";
        $mensagem_cor = "alert-success";
        $log = "true";
        $valor_inicial_br = number_format($valor_inicial, 2, ',', '.');
        $inter_msg = "Cadastrou o contrato. Valor: R$ $valor_inicial. Término: ".date('d/m/Y', strtotime($data_termino));".";
        
        //cadastra abertura do atendimento na tabela de inter_contrato
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$contrato_id', '$user_id', '$agora', '$inter_msg');");
        $adc->execute();
                
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar atendimento!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      } 
    }  

    //REGISTRAR NOVA INTERAÇÃO
    if ($action == "cont_new_inter") {
      $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_STRING);
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', :inter_contrato, '$user_id', '$agora', :inter_desc);");
      $adc->bindParam(':inter_desc', $inter_desc);
      $adc->bindParam(':inter_contrato', $contrato_id);
      if($adc->execute()){
         $mensagem = "<i class=\"fas fa-check\"></i> Interação cadastrada!";
         $mensagem_cor = "alert-success";
       }else{
         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
         $mensagem_cor = "alert-danger"; 
       } 
    }

    //ENCERRAMENTO DO CONTRATO
    if ($action == "cont_encerrar") {
      $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_STRING);
      $inter_desc = "Contrato encerrado. <br> $inter_desc";
      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `contratos` SET `status`='2' WHERE `id`='$contrato_id';");
      if($edt->execute()){
        $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :inter_contrato, '$user_id', '$agora', :inter_desc);");
        $adc->bindParam(':inter_desc', $inter_desc);
        $adc->bindParam(':inter_contrato', $contrato_id);
        if($adc->execute()){
           $mensagem = "<i class=\"fas fa-check\"></i> Contrato encerrado!";
           $mensagem_cor = "alert-danger";
        }else{
           $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
           $mensagem_cor = "alert-danger"; 
        }
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
        $mensagem_cor = "alert-danger"; 
      }
    }

    //RENOVAÇÃO DO CONTRATO
    if ($action == "cont_new_renovacao") {
      $data_termino = filter_input(INPUT_POST, 'data_termino', FILTER_SANITIZE_STRING);
      $valor_atual = filter_input(INPUT_POST, 'valor_atual', FILTER_SANITIZE_STRING);
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("UPDATE `contratos` SET `data_termino`='$data_termino', `valor_atual`='$valor_atual' WHERE `id`='$contrato_id';");
      if($adc->execute()){
        //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃ
        $valor_atual_br = number_format($valor_atual, 2, ',', '.');
        $inter_desc = "Renovou o Contrato: Valor: R$ $valor_atual_br. Término: ".date('d/m/Y', strtotime($data_termino));".";
        $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', :inter_contrato, '$user_id', '$agora', '$inter_desc');");
        $adc->bindParam(':inter_contrato', $contrato_id);
        if($adc->execute()){
          $mensagem = "<i class=\"fas fa-check\"></i> Renovação de Contrato cadatsrada!";
          $mensagem_cor = "alert-success";
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao Renovar o Contrato!";
          $mensagem_cor = "alert-danger"; 
        }
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao Renovar o Contrato!";
        $mensagem_cor = "alert-danger"; 
      }
    }

    //EDIÇÃO DA CLASSIFICAÇÃO DO CONTRATO
    if ($action == "cont_edt_centro_custo") {
      $c_cst = filter_input(INPUT_POST, 'centro_custo', FILTER_SANITIZE_NUMBER_INT);
      $class_contabil = filter_input(INPUT_POST, 'class_contabil', FILTER_SANITIZE_NUMBER_INT);
      $pdo = ConnectionN3();
      //BUSCA CLASSIFICAÇÃO ORIGINAL DO CONTRATO
        $show = $pdo->prepare("SELECT
        cads_centro_custo.centro_custo, cads_centro_custo.id AS centro_custo_id,
        cads_class_contab.categoria, cads_class_contab.id as categoria_id
        FROM contratos
        INNER JOIN cads_centro_custo ON cads_centro_custo.id = contratos.centro_custo
        INNER JOIN cads_class_contab ON cads_class_contab.id = contratos.class_contabil
        WHERE contratos.id = '$contrato_id'");
        $show->execute();
        $row=$show->fetch(PDO::FETCH_ASSOC);
        $c_cst_orig_nome=$row["centro_custo"];  
        $c_cst_orig_id=$row["centro_custo_id"];  
        $class_contab_orig_nome=$row["categoria"];
        $class_contab_orig_id=$row["categoria_id"]; 

      //SE HOUVE ALTERAÇÃO NO CENTRO DE CUSTO:
      if($c_cst!=$c_cst_orig_id){
        //BUSCA NOME DO NOVO CENTRO DE CUSTOS
        $show = $pdo->prepare("SELECT cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.id  = '$c_cst'");
        $show->execute();
        $row=$show->fetch(PDO::FETCH_ASSOC);
        $c_cst_novo_nome=$row["centro_custo"];  
        //EDITA NA TABELA DO CONTRATO
        $adc= $pdo->prepare("UPDATE `contratos` SET `centro_custo`='$c_cst' WHERE `id`='$contrato_id';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃ
          $inter_desc = "Centro de Custo editado para: $c_cst_novo_nome <s>$c_cst_orig_nome</s>";
          $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', :inter_contrato, '$user_id', '$agora', '$inter_desc');");
          $adc->bindParam(':inter_contrato', $contrato_id);
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Edição da Classificação realizada!";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar classificação!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar classificação!";
          $mensagem_cor = "alert-danger"; 
        }
      }
        
      //SE HOUVE ALTERAÇÃO NA CLASSIFICAÇÃO DE DESPESA:
      if($class_contabil!=$class_contab_orig_id){
        //BUSCA NOME DA NOVA CLASSE CONTÁBIL
        $show = $pdo->prepare("SELECT cads_class_contab.categoria FROM cads_class_contab WHERE cads_class_contab.id  = '$class_contabil'");
        $show->execute();
        $row=$show->fetch(PDO::FETCH_ASSOC);
        $class_contab_novo_nome=$row["categoria"];  
        //EDITA NA TABELA DO CONTRATO
        $adc= $pdo->prepare("UPDATE `contratos` SET `class_contabil`='$class_contabil' WHERE `id`='$contrato_id';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO
          $inter_desc = "Classificação Contábil editado para: $class_contab_novo_nome <s>$class_contab_orig_nome</s>";
          $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', :inter_contrato, '$user_id', '$agora', '$inter_desc');");
          $adc->bindParam(':inter_contrato', $contrato_id);
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Edição da Classificação realizada!";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar classificação!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar classificação!";
          $mensagem_cor = "alert-danger"; 
        }
      }
    }

    //EDIÇÃO DA INFORMAÇÕES FINANCEIRAS DO CONTRATO
    if ($action == "cont_edt_inf_financeiras") {
      $indice_reajuste = filter_input(INPUT_POST, 'indice_reajuste', FILTER_SANITIZE_NUMBER_INT);
      $dia_pagamento = filter_input(INPUT_POST, 'dia_pagamento', FILTER_SANITIZE_NUMBER_INT);
      $forma_pag = filter_input(INPUT_POST, 'forma_pag', FILTER_SANITIZE_NUMBER_INT);
      $pdo = ConnectionN3();
      //BUSCA CLASSIFICAÇÃO ORIGINAL DO CONTRATO
      $show = $pdo->prepare("SELECT contratos.dia_pagamento, 
      cads_forma_pag.forma, cads_forma_pag.id AS forma_id,
      cads_ind_reaju.indice, cads_ind_reaju.id AS indice_id
      FROM contratos
      INNER JOIN cads_forma_pag ON cads_forma_pag.id = contratos.forma_pag
      INNER JOIN cads_ind_reaju ON cads_ind_reaju.id = contratos.indice_reajuste
      WHERE contratos.id = '$contrato_id'");
      $show->execute();
      $row=$show->fetch(PDO::FETCH_ASSOC);
      $dia_pagamento_orig=$row["dia_pagamento"];
      $forma_orig_nome=$row["forma"];
      $forma_orig_id=$row["forma_id"];
      $indice_orig_nome=$row["indice"];
      $indice_orig_id=$row["indice_id"];

      //SE HOUVE ALTERAÇÃO DIA DE PAGAMENTO
      if($dia_pagamento!=$dia_pagamento_orig){
        //EDITA NA TABELA DO CONTRATO
        $adc= $pdo->prepare("UPDATE `contratos` SET `dia_pagamento`='$dia_pagamento' WHERE `id`='$contrato_id';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃ
          $inter_desc = "Dia de Pagamento editado para: $dia_pagamento <s>$dia_pagamento_orig</s>";
          $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', :inter_contrato, '$user_id', '$agora', '$inter_desc');");
          $adc->bindParam(':inter_contrato', $contrato_id);
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Edição no dia de pagamento realizada!";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar!";
          $mensagem_cor = "alert-danger"; 
        }
      }

      //SE HOUVE ALTERAÇÃO NA FORMA DE PAGAMENTO
      if($forma_pag!=$forma_orig_id){
        //BUSCA NOME DA NOVA FORMA DE PAGAMENTO
        $show = $pdo->prepare("SELECT cads_forma_pag.forma FROM cads_forma_pag WHERE cads_forma_pag.id  = '$forma_pag'");
        $show->execute();
        $row=$show->fetch(PDO::FETCH_ASSOC);
        $forma_novo_nome=$row["forma"];  
        //EDITA NA TABELA DO CONTRATO
        $adc= $pdo->prepare("UPDATE `contratos` SET `forma_pag`='$forma_pag' WHERE `id`='$contrato_id';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃ
          $inter_desc = "Forma de Pagamento editado para: $forma_novo_nome <s>$forma_orig_nome</s>";
          $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', :inter_contrato, '$user_id', '$agora', '$inter_desc');");
          $adc->bindParam(':inter_contrato', $contrato_id);
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Edição da forma de pagamento realizada!";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar!";
          $mensagem_cor = "alert-danger"; 
        }
      }

      //SE HOUVE ALTERAÇÃO NO ÍNDICE DE REAJUSTE:
      if($indice_reajuste!=$indice_orig_id){
        //BUSCA NOME DO NOVO INDICE
        $show = $pdo->prepare("SELECT cads_ind_reaju.indice FROM cads_ind_reaju WHERE cads_ind_reaju.id  = '$indice_reajuste'");
        $show->execute();
        $row=$show->fetch(PDO::FETCH_ASSOC);
        $indice_novo_nome=$row["indice"];  
        //EDITA NA TABELA DO CONTRATO
        $adc= $pdo->prepare("UPDATE `contratos` SET `indice_reajuste`='$indice_reajuste' WHERE `id`='$contrato_id';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃ
          $inter_desc = "Índice de Reajuste editado para: $indice_novo_nome <s>$indice_orig_nome</s>";
          $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', :inter_contrato, '$user_id', '$agora', '$inter_desc');");
          $adc->bindParam(':inter_contrato', $contrato_id);
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Edição do índice de reajuste realizada!";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar!";
          $mensagem_cor = "alert-danger"; 
        }
      }
        
    }

    //CADASTRA NOVO CUSTO AO CONTRATO
    if ($action == "cont_new_custo") {
      $c_cst = filter_input(INPUT_POST, 'centro_custo', FILTER_SANITIZE_NUMBER_INT);
      $custo = filter_input(INPUT_POST, 'custo', FILTER_SANITIZE_NUMBER_INT);
      $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_NUMBER_INT);
      $data_comp = filter_input(INPUT_POST, 'data_competencia', FILTER_SANITIZE_STRING);
      $data_comp="$data_comp-01";
      $data_venc = filter_input(INPUT_POST, 'data_vencimento', FILTER_SANITIZE_STRING);
      $valor = filter_input(INPUT_POST, 'valor', FILTER_SANITIZE_STRING);
      $info_consumo = filter_input(INPUT_POST, 'info_consumo', FILTER_SANITIZE_STRING);
      $nf = filter_input(INPUT_POST, 'nf', FILTER_SANITIZE_NUMBER_INT);
      $descricao = filter_input(INPUT_POST, 'descricao', FILTER_SANITIZE_STRING);

      //INICIA PROCESSO DE GRAVAÇÃO DO CUSTO NA BASE DE DADOS
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `custos` (`contrato`, `tipo`, `custo`, `centro_custo`, `data_competencia`, `data_vencimento`, `valor`, `info_consumo`, `nf`, `descricao`) 
      VALUES (:contrato, :tipo, :custo, :centro_custo, :data_competencia, :data_vencimento, :valor, :info_consumo, :nf, :descricao);");
      $adc->bindParam(':contrato', $contrato_id);
      $adc->bindParam(':tipo', $tipo);
      $adc->bindParam(':custo', $custo);
      $adc->bindParam(':centro_custo', $c_cst);
      $adc->bindParam(':data_competencia', $data_comp);
      $adc->bindParam(':data_vencimento', $data_venc);
      $adc->bindParam(':valor', $valor);
      $adc->bindParam(':info_consumo', $info_consumo);
      $adc->bindParam(':nf', $nf);
      $adc->bindParam(':descricao', $descricao);

      if($adc->execute()){
        $custo_id = $pdo->lastInsertId();
        $mensagem = "<i class=\"fas fa-check\"></i> Custo adicionado!";
        $mensagem_cor = "alert-success";
        $valor_br = number_format($valor, 2, ',', '.');
        $inter_msg = "Cadastrou novo custo: $descricao. Valor: R$ $valor_br Data: ".date('d/m/Y', strtotime($data_venc));".";
        
        //cadastra abertura do atendimento na tabela de inter_contrato
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$contrato_id', '$user_id', '$agora', '$inter_msg');");
        $adc->execute();
                
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar novo Custo!";
        $mensagem_cor = "alert-danger"; 
      } 
    }  
  
    //EDIÇÃO DE CUSTO DO CONTRATO
    if ($action == "cont_edt_custo") {
      $custo_id = filter_input(INPUT_POST, 'custo_id', FILTER_SANITIZE_NUMBER_INT);
      $c_cst = filter_input(INPUT_POST, 'centro_custo', FILTER_SANITIZE_NUMBER_INT);
      $custo_tipo = filter_input(INPUT_POST, 'custo_tipo', FILTER_SANITIZE_NUMBER_INT);
      $custo = filter_input(INPUT_POST, 'custo_edt', FILTER_SANITIZE_NUMBER_INT);
      $data_comp = filter_input(INPUT_POST, 'data_competencia', FILTER_SANITIZE_STRING);
      $data_comp= "$data_comp-01";
      $data_comp_br = date('m/Y', strtotime($data_comp));
      $data_venc = filter_input(INPUT_POST, 'data_vencimento', FILTER_SANITIZE_STRING);
      $data_venc_br = date('d/m/Y', strtotime($data_venc));
      $valor = filter_input(INPUT_POST, 'valor', FILTER_SANITIZE_STRING);
      $valor_br = number_format($valor,2,",",".");
      $info_consumo = filter_input(INPUT_POST, 'info_consumo', FILTER_SANITIZE_STRING);
      $nf = filter_input(INPUT_POST, 'nf', FILTER_SANITIZE_NUMBER_INT);
      $status = filter_input(INPUT_POST, 'status', FILTER_SANITIZE_NUMBER_INT);
      if($status==0){$status_nome = "Excluído";}
      if($status==1){$status_nome = "Executado";}
      if($status==2){$status_nome = "Planejado";}
      
      $descricao = filter_input(INPUT_POST, 'descricao', FILTER_SANITIZE_STRING);

      if($custo_tipo==1){$sql="SELECT cads_tipo_despe.despesa as custo FROM cads_tipo_despe WHERE cads_tipo_despe.`id` = '$custo'";}
      if($custo_tipo==2){$sql="SELECT cads_tipo_servi.servico as custo FROM cads_tipo_servi WHERE cads_tipo_servi.`id` = '$custo'";}
      if($custo_tipo==3){$sql="SELECT cads_tipo_taxa.taxa as custo FROM cads_tipo_taxa WHERE cads_tipo_taxa.`id` = '$custo'";}
      $show = $pdo->prepare("$sql");
      $show->execute();
      $row=$show->fetch(PDO::FETCH_ASSOC);
      $custo_nome = $row["custo"]; 
      
      $sql="SELECT cads_centro_custo.* FROM cads_centro_custo WHERE cads_centro_custo.id = '$c_cst'";
      $show = $pdo->prepare("$sql");
      $show->execute();
      $row=$show->fetch(PDO::FETCH_ASSOC);
      $c_cst_nome = $row["centro_custo"]; 
      
      $pdo = ConnectionN3();
      //BUSCA INFORMAÇÃO ORIGINAIS DO CUSTO
      $show = $pdo->prepare("SELECT custos.*, cads_tipo_despe.despesa, cads_tipo_despe.class_contab AS clas_cont_despesa,
      cads_tipo_servi.servico, cads_tipo_servi.class_contab AS clas_cont_servico,
      cads_tipo_taxa.taxa, cads_tipo_taxa.class_contab AS clas_cont_taxa,
      cads_centro_custo.centro_custo as centro_custo_nome
      FROM custos
      LEFT JOIN cads_tipo_despe ON cads_tipo_despe.id = custos.custo
      LEFT JOIN cads_tipo_servi ON cads_tipo_servi.id = custos.custo
      LEFT JOIN cads_tipo_taxa ON cads_tipo_taxa.id = custos.custo
      INNER JOIN cads_centro_custo ON cads_centro_custo.id = custos.centro_custo
      WHERE custos.id = '$custo_id'");
      $show->execute();
      $exibe=$show->fetch(PDO::FETCH_ASSOC);
      $cst_dt_comp_orig = $exibe["data_competencia"];
      $cst_dt_comp_orig_br =  date('m/Y', strtotime($cst_dt_comp_orig));
      $cst_dt_venc_orig = $exibe["data_vencimento"];
      $cst_dt_venc_orig_br =  date('d/m/Y', strtotime($cst_dt_venc_orig));
      $valor_orig = $exibe["valor"];
      $valor_orig_br = number_format($valor_orig,2,",",".");
      $info_consumo_orig = $exibe["info_consumo"];
      $nf_orig = $exibe["nf"];
      $descricao_orig = $exibe["descricao"];
      
      $status_orig = $exibe["status"];
      if($status_orig==0){$status_orig_nome = "Excluído";}
      if($status_orig==1){$status_orig_nome = "Executado";}
      if($status_orig==2){$status_orig_nome = "Planejado";}
      
      $c_cst_orig = $exibe["centro_custo"];
      $c_cst_nome_orig = $exibe["centro_custo_nome"];
      
      $custo_tipo_orig = $exibe["tipo"];
      $custo_orig = $exibe["custo"];
      if($custo_tipo_orig==1){$sql="SELECT cads_tipo_despe.despesa as custo FROM cads_tipo_despe WHERE cads_tipo_despe.`id` = '$custo_orig'";}
      if($custo_tipo_orig==2){$sql="SELECT cads_tipo_servi.servico as custo FROM cads_tipo_servi WHERE cads_tipo_servi.`id` = '$custo_orig'";}
      if($custo_tipo_orig==3){$sql="SELECT cads_tipo_taxa.taxa as custo FROM cads_tipo_taxa WHERE cads_tipo_taxa.`id` = '$custo_orig'";}
      $show = $pdo->prepare("$sql");
      $show->execute();
      $row=$show->fetch(PDO::FETCH_ASSOC);
      $custo_nome_orig = $row["custo"]; 
  
      //Verifica quais dados foram alterado spara montar o registro de log da edição

        if($status!=$status_orig){ $msg_custo_sts = " Status: $status_nome <s> $status_orig_nome </s>. "; }else{$msg_custo_sts = " Status: $status_orig_nome.";}

        if($custo_nome!=$custo_nome_orig){ $msg_custo_nome = " $custo_nome <s> $custo_nome_orig </s>. "; }else{$msg_custo_nome = " $custo_nome_orig.";}

        if($valor!=$valor_orig){ $msg_valor = "Valor: R$ $valor_br <s> R$ $valor_orig_br </s>. ";}else{$msg_valor = " Valor: R$ $valor_orig_br. ";}

        if($data_venc!=$cst_dt_venc_orig){  $msg_data_vencimento = "Venc: $data_venc_br <s> $cst_dt_venc_orig_br </s>. ";}else{$msg_data_vencimento = " Venc: $cst_dt_venc_orig_br. ";}

        if($data_comp!=$cst_dt_comp_orig){  $msg_data_competencia = "Comp: $data_comp_br <s> $cst_dt_comp_orig_br </s>. ";}else{$msg_data_competencia = " Comp: $cst_dt_comp_orig_br. ";}

        $msg_info_consumo = "";
        if($info_consumo!=$info_consumo_orig){  $msg_info_consumo = "Inf Consumo: $info_consumo <s> $info_consumo_orig </s>. ";}
        if($info_consumo==$info_consumo_orig && $info_consumo_orig != ""){$msg_info_consumo = " Inf Consumo: $info_consumo_orig. ";}

        $msg_nf = "";
        if($nf!=$nf_orig){ $msg_nf = "NF: $nf <s> $nf_orig </s>. ";}
        if($nf==$nf_orig && $nf_orig != ""){$msg_nf = " NF: $nf_orig. ";}

        if($c_cst!=$c_cst_orig){ $msg_centro_custo = "Centro de Custos: $c_cst_nome <s> $c_cst_nome_orig </s>. "; }else{$msg_centro_custo = " Centro de Custos: $c_cst_nome_orig. ";}

        $msg_descricao = "";
        if($descricao!=$descricao_orig){ $msg_descricao = "Descrição: $descricao <s> $descricao_orig </s>. ";}
        if($descricao==$descricao_orig && $descricao_orig != ""){$msg_descricao = " Descrição: $descricao. ";}

        
        //BUSCA NOME DO NOVO CENTRO DE CUSTOS
        $show = $pdo->prepare("SELECT cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.id  = '$c_cst'");
        $show->execute();
        $row=$show->fetch(PDO::FETCH_ASSOC);
        $c_cst_novo_nome=$row["centro_custo"];  
        //EDITA NA TABELA DO CONTRATO
        $edt= $pdo->prepare("UPDATE `custos` SET
        `custo`='$custo',
        `centro_custo`='$c_cst',
        `data_vencimento`='$data_venc',
        `data_competencia`='$data_comp',
        `info_consumo`='$info_consumo',
        `nf`='$nf',
        `valor`='$valor',
        `descricao`='$descricao',
        `status`='$status'
        WHERE  `id`='$custo_id';");
        
        if($edt->execute()){
          
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃ
          $inter_desc = "Editou dados do custo: $msg_custo_nome $msg_data_vencimento $msg_data_competencia $msg_valor $msg_descricao $msg_info_consumo $msg_nf $msg_centro_custo $msg_custo_sts";
          $adc= $pdo->prepare("INSERT INTO `inter_contrato` (`inter_tipo`, `inter_contrato`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', :inter_contrato, '$user_id', '$agora', '$inter_desc');");
          $adc->bindParam(':inter_contrato', $contrato_id);
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Edição do custo realizada!";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar custo!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar custo!";
          $mensagem_cor = "alert-danger"; 
        }
      }
    }
  
  
    //GED NOVA PASTA
    if ($action == "ged_new_folder") {
      $ged_fd_folder = filter_input(INPUT_POST, 'ged_fd_folder', FILTER_SANITIZE_STRING);
      
      $pdo = ConnectionN3();      
      $adc= $pdo->prepare("INSERT INTO `ged_folder` (`ged_fd_cont`, `ged_fd_folder`, `ged_fd_dt`, `ged_fd_user`) VALUES (:inter_contrato, :ged_fd_folder, '$agora', '$user_id');");
      $adc->bindParam(':inter_contrato', $contrato_id);
      $adc->bindParam(':ged_fd_folder', $ged_fd_folder);
      if($adc->execute()){
        $ged_fd_id = $pdo->lastInsertId();
        $mensagem = "<i class=\"fas fa-check\"></i> Nova pasta cadastrada!";
        $mensagem_cor = "alert-success";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar nova pasta!";
        $mensagem_cor = "alert-danger"; 
      }
    }

    //GED EDITAR PASTA
    if ($action == "ged_edt_folder") {
      $ged_fd_folder = filter_input(INPUT_POST, 'ged_fd_folder', FILTER_SANITIZE_STRING);
      $ged_fd_id = filter_input(INPUT_POST, 'ged_fd_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_folder` SET `ged_fd_folder` = :ged_fd_folder WHERE  `ged_fd_id`=:ged_fd_id;");
      $edt->bindParam(':ged_fd_folder', $ged_fd_folder);
      $edt->bindParam(':ged_fd_id', $ged_fd_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Pasta Renomeada!";
        $mensagem_cor = "alert-success";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao renomear a pasta!";
        $mensagem_cor = "alert-danger"; 
      }
    }

    //GED EXCLUIR PASTA
    if ($action == "ged_del_folder") {
      $ged_fd_id = filter_input(INPUT_POST, 'ged_fd_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_folder` SET `ged_fd_sts` = '0' WHERE  `ged_fd_id`=:ged_fd_id;");
      $edt->bindParam(':ged_fd_id', $ged_fd_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Pasta Excluída!";
        $mensagem_cor = "alert-success";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao Excluir a pasta!";
        $mensagem_cor = "alert-danger"; 
      }
    }
  
    //GED NOVO ARQUIVO
    if ($action == "ged_new_file") {
      $ged_fl_name = filter_input(INPUT_POST, 'ged_fl_name', FILTER_SANITIZE_STRING);
      $ged_fd_id = $ged_fl_folder = filter_input(INPUT_POST, 'ged_fl_folder', FILTER_SANITIZE_NUMBER_INT);
      
      $arquivo_tmp = $_FILES['arquivo']['tmp_name'];
      $nome = $_FILES['arquivo']['name'];
      // Pega a extensão
      $file_ext = pathinfo ($nome, PATHINFO_EXTENSION);
      // Converte a extensão para minúsculo
      $file_ext = strtolower($file_ext);
      // cria nome único para armazenar o documento na pasta
      $file_url = uniqid(time()).'.'.$file_ext; 
      // define endereço completo para gravação do documento
      $destino = '../documentos/'.$file_url;
      // salva o arquivo na pasta 
      if(@move_uploaded_file($arquivo_tmp,$destino)){        
        //grava os dados do documento na tabela ged_file para gestão do documento
        $pdo = ConnectionN3();      
        $adc= $pdo->prepare("INSERT INTO `ged_file` (`ged_fl_folder`, `ged_fl_cont`, `ged_fl_name`, `ged_fl_ext`, `ged_fl_url`, `ged_fl_dt`, `ged_fl_user`) VALUES (:ged_fl_folder, :inter_contrato, :ged_fl_name, '$file_ext', '$file_url', '$agora', '$user_id');");
        $adc->bindParam(':inter_contrato', $contrato_id);
        $adc->bindParam(':ged_fl_folder', $ged_fl_folder);
        $adc->bindParam(':ged_fl_name', $ged_fl_name);
        if($adc->execute()){
          $mensagem = "<i class=\"fas fa-check\"></i> Novo arquivo cadastrado!";
          $mensagem_cor = "alert-success";
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar novo arquivo!";
          $mensagem_cor = "alert-danger"; 
        }
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar novo arquivo!";
        $mensagem_cor = "alert-danger"; 
      }
    }
    
    //GED EDITAR arquivo
    if ($action == "ged_edt_file") {
      $ged_fl_folder = filter_input(INPUT_POST, 'ged_fl_folder', FILTER_SANITIZE_STRING);
      $ged_fl_name = filter_input(INPUT_POST, 'ged_fl_name', FILTER_SANITIZE_STRING);
      $ged_fl_id = filter_input(INPUT_POST, 'ged_fl_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_file` SET `ged_fl_folder` = :ged_fl_folder, `ged_fl_name`=:ged_fl_name WHERE  `ged_fl_id`=:ged_fl_id");
      $edt->bindParam(':ged_fl_folder', $ged_fl_folder);
      $edt->bindParam(':ged_fl_name', $ged_fl_name);
      $edt->bindParam(':ged_fl_id', $ged_fl_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Arquivo Editado!";
        $mensagem_cor = "alert-success";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o arquivo!";
        $mensagem_cor = "alert-danger"; 
      }
    }    
    
    //GED ARQUIVAR DOCUMENTO
    if ($action == "ged_arq_file") {
      $ged_fl_id = filter_input(INPUT_POST, 'ged_fl_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_file` SET `ged_fl_sts` = '1' WHERE  `ged_fl_id`=:ged_fl_id");
      $edt->bindParam(':ged_fl_id', $ged_fl_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Documento Arquivado!";
        $mensagem_cor = "alert-success";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao arquivar documento!";
        $mensagem_cor = "alert-danger"; 
      }
    }
    
    //GED RECUPERAR DOCUMENTO
    if ($action == "ged_rec_file") {
      $ged_fl_id = filter_input(INPUT_POST, 'ged_fl_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_file` SET `ged_fl_sts` = '2' WHERE  `ged_fl_id`=:ged_fl_id");
      $edt->bindParam(':ged_fl_id', $ged_fl_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Documento recuperado!";
        $mensagem_cor = "alert-success";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao recuperar documento!";
        $mensagem_cor = "alert-danger"; 
      }
    }
    
    //GED EXCLUIR DOCUMENTO
    if ($action == "ged_del_file") {
      $ged_fl_id = filter_input(INPUT_POST, 'ged_fl_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_file` SET `ged_fl_sts` = '0' WHERE  `ged_fl_id`=:ged_fl_id");
      $edt->bindParam(':ged_fl_id', $ged_fl_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Documento Deletado!";
        $mensagem_cor = "alert-danger";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao deletar documento!";
        $mensagem_cor = "alert-danger"; 
      }
    }  
    
  }

?>
<?php 
// Verifica de existe o ID de um atendimento setado.
// Se não houver, exibe a parte de CADASTRO DE NOVO CONTRATO
if (empty($contrato_id)){ 
// if($m3_01==0){header("Location: ../index.php");}  
  ?>
    <div class="container-fluid">
      <div class="row mt-2 justify-content-md-center">       
        <div class="col-12 col-sm-12 col-md-11 col-lg-10">
          <div class="card">
            <div class="h6 card-header">
              <i class="far fa-building"></i> Cadastro de novo Contrato de Locação Predial
            </div>
            <div class="card-body py-3">
              <form action="#" method="POST">                  
                <div class="form-row">
                  
                  <div class="form-group col-sm-12 col-md-6">
                    <label class="my-0 small">Cliente:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-address-book"></i></div>
                      </div> 
                      <select name="cliente" id="cliente"  class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
                        <option></option>
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1' ORDER BY clientes.clt_nomef ASC");
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $clt_id = $exibe["clt_id"];
  $clt_nome = $exibe["clt_nomef"];
?>
                        <option value="<?php echo $clt_id; ?>"><?php echo $clt_nome;?></option>
<?php } ?>
                      </select>
                    </div>
                  </div>
                  
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Data Início:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-calendar-check"></i></div>
                      </div> 
                      <input type="date" name="data_inicio" value="<?php echo $hoje; ?>" required="required" class="form-control form-control-sm" tabindex="2">
                    </div>
                  </div>
                  
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Data Término:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-calendar-times"></i></div>
                      </div>                     
                      <input type="date" name="data_termino" value="" required="required" class="form-control form-control-sm" tabindex="3">
                    </div>
                  </div>
                                 
                </div>
                
                
              <div class="form-row pt-2">
                  
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Valor Inicial:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-dollar-sign"></i></div>
                      </div> 
                      <input type="number" step="0.01" min="0" name="valor_inicial" value="" required="required" class="form-control form-control-sm" tabindex="4">
                    </div>
                  </div>
                  
                  
                  
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Forma Pagamento:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-comments-dollar"></i></div>
                      </div>                    
                      <select name="forma_pag"id="forma_pag" class="form-control form-control-sm" required="required" tabindex="5">
                      <option value="Depósito"></option>
                        <div id="menu1" class="tab-pane fade">
        
                    </div>
                  </div>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_forma_pag.id, cads_forma_pag.forma FROM cads_forma_pag WHERE cads_forma_pag.`status` = '1' ORDER BY cads_forma_pag.forma ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $forma_pagto_id = $exibe["id"];
  $forma_pagto_nome = $exibe["forma"];
?>
                        <option value="<?php echo $forma_pagto_id; ?>"><?php echo $forma_pagto_nome;?></option>
<?php } ?>

                      </select>
                    </div>
                  </div>

                  <div class="form-group col-sm-2 col-md-3">
                    <label class="my-0 small"> Dados Bancários:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-landmark" value="1" ></i></div>
                      </div> 
                      <input name="bancos"  id="bancos"  class="form-control form-control-sm"  type="text" placeholder="Banco:" ></input>
                      <input name="agencia" id="agencia" class="form-control form-control-sm"  type="text" placeholder="Agência:" ></input>
                      <input name="conta" id="conta"  class="form-control form-control-sm"  type="text" placeholder="Conta:" ></input>
                      
                    </div>
                  </div>

                 
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Data de Pagamento:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-calendar-day"></i></div>
                      </div> 
                      <select name="dia_pagamento" class="form-control form-control-sm" required="required" tabindex="6">
                        <option value="1">Dia 01</option>
                        <option value="5">Dia 05</option>
                        <option value="10">Dia 10</option>
                        <option value="15">Dia 15</option>
                        <option value="20">Dia 20</option>
                        <option value="25">Dia 25</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Reajuste:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-donate"></i></div>
                      </div>
                      <select name="indice_reajuste" class="form-control form-control-sm" required="required" tabindex="7">
                        <option></option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_ind_reaju.id, cads_ind_reaju.indice FROM cads_ind_reaju WHERE cads_ind_reaju.`status` = '1' ORDER BY cads_ind_reaju.id ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $indice_id = $exibe["id"];
  $indice_nome = $exibe["indice"];
?>
                        <option value="<?php echo $indice_id; ?>"><?php echo $indice_nome;?></option>
<?php } ?>
                      </select>
                    </div>
                  </div>
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Centro de Custo:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-funnel-dollar"></i></div>
                      </div>
                      <select name="centro_custo" class="form-control form-control-sm" required="required" tabindex="8">
                        <option></option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_centro_custo.id, cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.`status` = '1' ORDER BY centro_custo ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $c_cst_id = $exibe["id"];
  $c_cst_nome = $exibe["centro_custo"];
?>
                        <option value="<?php echo $c_cst_id; ?>"><?php echo $c_cst_nome;?></option>
<?php } ?>
                      </select>
                    </div>
                  </div>
                  
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Clas. Contábil:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="fas fa-tags"></i></div>
                      </div>
                      <select name="class_contabil" class="form-control form-control-sm" required="required" tabindex="9">
                        <option></option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_class_contab.id, cads_class_contab.categoria FROM cads_class_contab WHERE cads_class_contab.`status` = '1' ORDER BY categoria ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
  $class_contab_id = $exibe["id"];
  $class_contab_nome = $exibe["categoria"];
?>
                        <option value="<?php echo $class_contab_id; ?>"><?php echo $class_contab_nome;?></option>
<?php } ?>
                      </select>
                    </div>
                  </div>

                  
                </div>
                
                <div class="form-row pt-2">

                  <div class="form-group col-sm-5 col-md-6">
                    <label class="my-0 small">Observações importantes:</label>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <div class="input-group-text"><i class="far fa-comment-alt"></i></div>
                      </div>
                      <textarea name="observacoes" class="form-control form-control-sm" rows="3" required="required" tabindex="10" ></textarea>
                    </div>
                  </div>

                <div class="form-row pt-2">  
                  
                  <div class="form-group col-sm-12 col-md-4">
                    <div class="form-group col-sm-12 col-md-6 pt-3 text-center">
                      <input type="hidden" name="token" value="<?php echo $token;?>">
                      <input type="hidden" name="action" value="contrato_adc">
                      <button type="submit" class="btn btn-danger btn-sm p-1"><i class="fas fa-plus"></i> Adicionar</button>
                    </div>
                  </div>
                  
                </div>
                  
              </form>
            </div>
          </div>
        </div>
       </div>
    </div>
<!-- MODAL DE AJUDA PARA CADASTRO DE NOVO CONTRATO -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de novo contrato</h6>
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
// Verifica de existe o ID de um contrato setado.
// Se houver, exibe a parte de EDIÇÃO DO CONTRATO
if (isset($contrato_id)){ ?>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT contratos.data_inicio, contratos.status, contratos.data_termino, contratos.dia_pagamento, contratos.valor_inicial, contratos.valor_atual, contratos.observacoes, contratos.bancos, contratos.agencia, contratos.conta,
clientes.clt_id,clientes.clt_cnpj,clientes.clt_nomer,clientes.clt_nomef,clientes.clt_end, clientes.clt_city, clientes.clt_uf, clientes.clt_mail, clientes.clt_tel,
cads_forma_pag.forma, cads_forma_pag.id AS forma_id,
cads_ind_reaju.indice, cads_ind_reaju.id AS indice_id,
cads_centro_custo.centro_custo, cads_centro_custo.id AS centro_custo_id,
cads_class_contab.categoria, cads_class_contab.id as categoria_id
FROM contratos
INNER JOIN clientes ON clientes.clt_id = contratos.cliente
INNER JOIN cads_forma_pag ON cads_forma_pag.id = contratos.forma_pag
INNER JOIN cads_ind_reaju ON cads_ind_reaju.id = contratos.indice_reajuste
INNER JOIN cads_centro_custo ON cads_centro_custo.id = contratos.centro_custo
INNER JOIN cads_class_contab ON cads_class_contab.id = contratos.class_contabil
WHERE contratos.id = '$contrato_id'");
$show->execute();
$row=$show->fetch(PDO::FETCH_ASSOC);
  $cont_sts=$row["status"];
  $data_inicio=$row["data_inicio"];
  $data_termino=$row["data_termino"];
  $dia_pagamento=$row["dia_pagamento"];
  $valor_inicial=$row["valor_inicial"];
  $valor_atual=$row["valor_atual"];
  if($valor_atual==""){$valor_atual=$valor_inicial;}
  $clt_id=$row["clt_id"];
  $clt_nomer=$row["clt_nomer"];
  $clt_nomef=$row["clt_nomef"];
  $clt_cnpj=$row["clt_cnpj"];
  $clt_end=$row["clt_end"];
  $clt_city=$row["clt_city"];
  $clt_uf=$row["clt_uf"];
  $clt_mail=$row["clt_mail"];
  $clt_tel=$row["clt_tel"];
  $forma=$row["forma"];
  $forma_id=$row["forma_id"];
  $indice=$row["indice"];
  $indice_id=$row["indice_id"];
  $c_cst=$row["centro_custo"];  
  $c_cst_id=$row["centro_custo_id"];  
  $categoria=$row["categoria"];
  $class_contab_id=$row["categoria_id"]; 
  $observacao=$row["observacoes"];
  $bancos=$row["bancos"];
  $agencia=$row["agencia"];
  $conta=$row["conta"];
?>    
    <div class="container-fluid">
      <div class="row mt-2">
        <div class="col-md-3 px-1">
          
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="far fa-file-alt text-danger"></i> CONTRATO #<?php echo str_pad($contrato_id , 5 , '0' , STR_PAD_LEFT); ?>
<?php if($cont_sts==0){ ?> <span class="badge badge-danger px-1 float-right"> <i class="far fa-trash-alt"></i> Excluído </span> <?php } ?>
<?php if($cont_sts==1){ ?> <span class="badge badge-success px-1 float-right"> <i class="fas fa-hourglass-start"></i> Vigente </span> <?php } ?>
<?php if($cont_sts==2){ ?> <span class="badge badge-secondary px-1 float-right"><i class="fas fa-hourglass-end"></i> Encerrado </span> <?php } ?>
            </div>
            <div class="card-body pt-1 pl-0 pr-0"> 
                
              <div class="col-12 border-bottom py-1">
                <div class="row align-items-center">
                  <div class="col-sm-10">
                    <div class="row pl-1 mt-0 align-items-center">
                      <?php echo $clt_nomer; ?>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-paste small ml-2 pl-2 mr-2"></i><small>CNPJ/CPF: <?php echo $clt_cnpj; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="far fa-building small ml-2 pl-2 mr-2"></i><small><?php echo $clt_nomef; ?></small>
                    </div>
                  </div>
                  <div class="col-sm-2">
                  </div>
                </div>
              </div>   

              <div class="col-12 border-bottom py-1">
                <div class="row align-items-center">
                  <div class="col-sm-10">
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="far fa-calendar-check small ml-2 pl-2 mr-2"></i><small> Data Início: <?php echo date('d/m/Y', strtotime($data_inicio)); ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="far fa-calendar-times small ml-2 pl-2 mr-2"></i><small> Data Término: <?php echo date('d/m/Y', strtotime($data_termino)); ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-donate small ml-2 pl-2 mr-2"></i><small> Rejuste: <?php echo $indice; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-dollar-sign small ml-2 pl-2 mr-2"></i><small> Valor Atual: <?php echo number_format($valor_atual,2,",","."); ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-comments-dollar small ml-2 pl-2 mr-2"></i><small> Forma de pagamento: <?php echo $forma; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                    <i class="fas fa-landmark small ml-2 pl-2 mr-2"></i><small> Dados Bancários: <?php echo $bancos; ?></small>//
                      <?php echo $agencia; ?></small>// 
                      <?php echo $conta; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-calendar-day small ml-2 pl-2 mr-2"></i><small> Dia de pagamento: <?php echo $dia_pagamento; ?></small>
                    </div>
                  </div>
                  <div class="col-sm-2">
<?php
if($cont_sts==1){
?>                    
                    <button type="button" class="btn btn-light btn-sm text-center text-dark py-1 px-1" data-toggle="modal" data-target="#cont_edt_inf_financeiras"> <i class="fas fa-edit small"></i> </button>
<?php } ?>
                  </div>
                </div>
              </div>   

              <div class="col-12 border-bottom py-1">
                <div class="row align-items-center">
                  <div class="col-sm-10">
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-funnel-dollar small ml-2 pl-2 mr-2"></i><small>Centro de Custo: <?php echo $c_cst; ?>  </small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-tags small ml-2 pl-2 mr-2"></i><small>Clas. Contábil: <?php echo $categoria; ?>  </small></li>
                    </div>
                  </div>
                  <div class="col-sm-2">
<?php
if($cont_sts==1){
?>                    
                    <button type="button" class="btn btn-light btn-sm text-center text-dark py-1 px-1" data-toggle="modal" data-target="#cont_edt_centro_custo"> <i class="fas fa-edit small"></i> </button>
<?php } ?>
                  </div>
                </div>
              </div>                  

              <div class="col-12 border-bottom py-1">
                <div class="row align-items-center">
                  <div class="col-sm-10">
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-phone small ml-2 pl-2 mr-2"></i><small> Telefone: <?php echo $clt_tel; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-at small ml-2 pl-2 mr-2"></i><small> E-mail: <?php echo $clt_mail; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-map-signs small ml-2 pl-2 mr-2"></i><small><?php echo "$clt_end - $clt_city - $clt_uf"; ?></small>
                    </div>
                  </div>
                  <div class="col-sm-2">
                    <button type="button" class="btn btn-light btn-sm text-center text-dark py-1 px-1" data-toggle="modal" data-target="#cont_edt_inf_contato_locador"> <i class="fas fa-edit small"></i> </button>
                  </div>
                </div>
              </div>   

              <div class="col-12 border-bottom py-1">
                <div class="row align-items-center">
                  <div class="col-sm-10">
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="far fa-comment-alt small ml-2 pl-2 mr-2"></i><small><?php echo $observacao; ?></small>
                    </div>
                  </div>
                  <div class="col-sm-2">

                  </div>
                </div>
              </div>
              <div class="col-12 pt-1">
                <div class="row">
<?php 
//ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CONTRATO

//SEMPRE PERMITIR UMA NOVA INTERAÇÃO PARA QUE SEJA POSSÍVEL ADICIONAR COMENTÁRIOS
$exibe_bt_cont_new_inter=true;

//RENOVAR CONTRATO
if($cont_sts==1){
  $exibe_bt_cont_new_renovacao=true;
}else{
  $exibe_bt_cont_new_renovacao=false;
}

//ADICIONAR CUSTO
if($cont_sts==1){
  $exibe_bt_cont_new_custo=true;
}else{
  $exibe_bt_cont_new_custo=false;
}

//ENCERRAR CONTRATO
if($cont_sts==1){
  $exibe_bt_cont_encerrar=true;
}else{
  $exibe_bt_cont_encerrar=false;
}

?>
<?php if($exibe_bt_cont_new_renovacao==true){ ?>
                  <div class="col-sm-6 px-1 py-1">
                    <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#cont_new_renovacao"> <i class="fas fa-sync-alt"></i> Renovar Contrato </button>
                  </div>
<?php } ?>
<?php if($exibe_bt_cont_new_inter==true){ ?>
                  <div class="col-sm-6 px-1 py-1">
                    <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#cont_new_inter"> <i class="fas fa-headset"></i> Nova Interação </button>
                  </div>
<?php } ?>
<?php if($exibe_bt_cont_new_custo==true){ ?>
                  <div class="col-sm-6 px-1 py-1">
                     <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#new_custo"> <i class="fas fa-plus text-dark"></i> Adicionar custo </button>
                  </div>
<?php } ?>
<?php if($exibe_bt_cont_encerrar==true){ ?>
                  <div class="col-sm-6 px-1 py-1">
                     <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#cont_encerrar"> <i class="far fa-calendar-times text-dark"></i> Encerrar Contrato </button>
                  </div>
<?php } ?>
                </div>
              </div>   
              
              <div class="col-12 border-top py-1">
<?php 
$show_contatos = $pdo->prepare("SELECT pessoas.* 
FROM pessoas
WHERE pessoas.pessoa_clt = '$clt_id' AND pessoas.pessoa_sts = '1'
ORDER BY pessoas.pessoa_nom ASC");
$show_contatos->execute();
$conta_contatos = $show_contatos->rowCount();
if($conta_contatos>0){
while($row_contatos=$show_contatos->fetch(PDO::FETCH_ASSOC)){
$pessoa_id=$row_contatos["pessoa_id"];
$pessoa_nom=$row_contatos["pessoa_nom"];
$pessoa_cargo=$row_contatos["pessoa_cargo"];
$pessoa_tel=$row_contatos["pessoa_tel"];
$pessoa_mail=$row_contatos["pessoa_mail"];    
?>                      
                <div class="row align-items-center">
                  <div class="col-sm-10">
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-user-tag small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_nom; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-phone small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_tel; ?></small>
                    </div>
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-at small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_mail; ?></small>
                    </div>
                  </div>
                  <div class="col-sm-2">
                    <button type="button" class="btn btn-light btn-sm text-center text-dark py-1 px-1" data-toggle="modal" data-target="#cont_edt_inf_contato"> <i class="fas fa-edit small"></i> </button>
                  </div>
                </div>
<?php } ?>
<?php }else{ ?> 
                <div class="row align-items-center">
                  <div class="col-sm-10">
                    <div class="row pl-1 mt-0 align-items-center">
                      <i class="fas fa-user-alt-slash small ml-3 pl-3 mr-2"></i><small>Não existem contatos adicionais cadastrados para este locador.</small>
                    </div>
                  </div>
                  <div class="col-sm-2">
                  </div>
                </div>
<?php } ?>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6 px-1">
<?php
if(strtotime($hoje) > strtotime($data_termino)){ ?>          
<div class="alert alert-danger alert-dismissible fade show my-0 mb-3" role="alert">
  <strong>Atenção: </strong> Este contrato está vencido!
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>            
<?php } ?>  
<?php
$data_30 =  date('Y-m-d', strtotime($hoje. ' +30 days'));
if(strtotime($hoje) < strtotime($data_termino) && strtotime($data_30) > strtotime($data_termino)){ ?>          
<div class="alert alert-warning alert-dismissible fade show my-0 mb-3" role="alert">
  <strong>Atenção: </strong> Este contrato vencerá em breve!
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>            
<?php } ?>  
<?php




//VERIFICA AS PREFERENCIAS DE EXIBIÇÃO DE ARQUIVOS 
$cst_exibir_ccusto = filter_input(INPUT_POST, 'cst_exibir_ccusto', FILTER_SANITIZE_STRING);
if(empty($cst_exibir_ccusto)){$cst_exibir_ccusto=0; $cst_pesquisar_ccusto=""; $show_card_cst = false; }else{$show_card_cst = true; $cst_pesquisar_ccusto = "AND custos.centro_custo = '$cst_exibir_ccusto'";}

$cst_exibir_tipo = filter_input(INPUT_POST, 'cst_exibir_tipo', FILTER_SANITIZE_STRING);
if(empty($cst_exibir_tipo)){$cst_exibir_tipo="todos"; $show_card_cst = false; }else{$show_card_cst = true;}
if($cst_exibir_tipo=="despesas"){$cst_tipo="1";}
if($cst_exibir_tipo=="servicos"){$cst_tipo="2";}
if($cst_exibir_tipo=="taxas"){$cst_tipo="3";}
if($cst_exibir_tipo=="todos"){$cst_tipo="1,2,3";}


$cst_exibir_inicio_br = filter_input(INPUT_POST, 'cst_exibir_inicio', FILTER_SANITIZE_STRING);
if(empty($cst_exibir_inicio_br)){  
  $cst_exibir_inicio_br = date('d/m/y', strtotime($hoje. ' -91 days'));
  $cst_exibir_inicio_usa = date('Y-m-d', strtotime($hoje. ' -91 days'));
  $show_card_cst = false;
}else{
    $show_card_cst = true; 
    $cst_exibir_inicio_usa = implode('-', array_reverse(explode('/', "$cst_exibir_inicio_br")));
}

$cst_exibir_fim_br = filter_input(INPUT_POST, 'cst_exibir_fim', FILTER_SANITIZE_STRING);
if(empty($cst_exibir_fim_br)){
  $cst_exibir_fim_br = date("d/m/y");
  $cst_exibir_fim_usa = date("Y-m-d");
  $show_card_cst = false; 
}else{
    $show_card_cst = true; 
    $cst_exibir_fim_usa = implode('-', array_reverse(explode('/', "$cst_exibir_fim_br")));
}
?>
          
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <a href="#" data-toggle="collapse" data-target="#gcst" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
                <i class="fas fa-file-invoice-dollar"></i> Custos do contrato <i class="icon-action fa fa-chevron-down"></i>
              </a>
            </div>            
            <div class="collapse <?php if($show_card_cst == true){ echo " show";}?>" id="gcst">
              <div class="card-body p-0">
                <div class="col-12 border-bottom ">
                  <div class="row py-2">

                    <div class="col-sm-4">
                      <div class="btn-group btn-block ">
                        <button id="btnGroupDrop1" type="button" class="btn btn-outline-secondary btn-block btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                          <?php echo "$cst_exibir_inicio_br a $cst_exibir_fim_br"; ?>
                        </button>
                        <div class="dropdown-menu small" aria-labelledby="btnGroupDrop1">
                          <form method="POST" action="#">
                            <div class="form-row mx-2">
                              <div class="form-group col-sm-12">
                                <label class="my-0 small">Início:</label>
                                <input name="cst_exibir_inicio" id="from" type="text" class="form-control form-control-sm" required="required" >
                              </div>
                            </div>
                            <div class="form-row mx-2">
                              <div class="form-group col-sm-12">
                                <label class="my-0 small">Até:</label>
                                <input name="cst_exibir_fim" id="to" type="text" class="form-control form-control-sm" required="required" >
                              </div>
                            </div>
                            
                            <button type="submit" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                              <i class="fas fa-calendar-check ml-3 mr-1"></i> Definir Período
                            </button>
                            
                            <input type="hidden" name="ord" value="<?php echo $ord; ?>">
                            <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                            <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                            <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">                                      
                          </form>

                        </div>
                      </div>
                    </div>

                    <div class="col-sm-4">
                      <div class="btn-group btn-block ">
                        <button id="btnGroupDrop1" type="button" class="btn btn-outline-secondary btn-block btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                          Tipo: 
<?php  if($cst_exibir_tipo=="despesas"){?><i class="fas fa-tag text-warning"></i> Despesas <span class="caret"></span> <?php } ?>
<?php if($cst_exibir_tipo=="servicos"){?><i class="fas fa-tag text-danger"></i> Serviços <span class="caret"></span> <?php } ?>
<?php if($cst_exibir_tipo=="taxas"){?><i class="fas fa-tag text-secundary"></i> Taxas <span class="caret"></span> <?php } ?>
<?php if($cst_exibir_tipo=="todos"){?><i class="fas fa-tags"></i> Todos <span class="caret"></span> <?php } ?>

                        </button>
                        <div class="dropdown-menu small" aria-labelledby="btnGroupDrop1">
                          <form method="POST" action="#">
                            <button type="submit" name="cst_exibir_tipo" value="despesas" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                              <i class="fas fa-tag text-warning ml-2"></i> Despesas
                            </button>

                            <button type="submit" name="cst_exibir_tipo" value="servicos" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                              <i class="fas fa-tag text-danger ml-2"></i> Serviços
                            </button>

                            <button type="submit" name="cst_exibir_tipo" value="taxas" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                              <i class="fas fa-tag text-secundary ml-2"></i> Taxas
                            </button>

                            <button type="submit" name="cst_exibir_tipo" value="todos" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                              <i class="fas fa-tags ml-2"></i> Todos 
                            </button>


                            <input type="hidden" name="ord" value="<?php echo $ord; ?>">
                            <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                            <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                            <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                            <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">                                      
                          </form>

                        </div>
                      </div>
                    </div>
                    <div class="col-sm-4">
                      <div class="btn-group btn-block ">
                        <button id="btnGroupDrop1" type="button" class="btn btn-outline-secondary btn-block btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                          CC:
<?php if($cst_exibir_ccusto==0){?><i class="fas fa-funnel-dollar"></i> Todos <span class="caret"></span> <?php }else{ 
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.`id` = '$cst_exibir_ccusto'");
$show->execute();
$exibe=$show->fetch(PDO::FETCH_ASSOC);
$c_cst_nome = $exibe["centro_custo"];  
?>
<i class="fas fa-funnel-dollar"></i> <?php echo $c_cst_nome;?> <span class="caret"></span>
<?php } ?>
                        </button>
                        <div class="dropdown-menu small" aria-labelledby="btnGroupDrop1">
                          <form method="POST" action="#">
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_centro_custo.id, cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.`status` = '1' ORDER BY centro_custo ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$centro_c_id = $exibe["id"];
$c_cst_nome = $exibe["centro_custo"];
?>
                            <button type="submit" name="cst_exibir_ccusto" value="<?php echo $centro_c_id; ?>" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                              <i class="fas fa-tag text-warning ml-2"></i> <?php echo $c_cst_nome; ?>
                            </button>
<?php } ?>                                      
                            <button type="submit" name="cst_exibir_ccusto" value="0" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                              <i class="fas fa-tag text-warning ml-2"></i> Todos
                            </button>                                      

                            <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                            <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                            <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">                            
                            <input type="hidden" name="ord" value="<?php echo $ord; ?>">
                            <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">                                      
                          </form>

                        </div>
                      </div>
                    </div>

                  </div>
                </div>


                <div class="drive-wrapper drive-list-view p-0">
                  <div class="table-responsive drive-items-table-wrapper">
                    <table class="table table-sm small mb-0">
                      <thead>
                        <tr>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="vencimento">
                              <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                              <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                              <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Venc </button>
                            </form>                    
                          </th>
                          <th class="px-1">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="competencia">
                              <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                              <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                              <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Comp </button>
                            </form>
                          </th>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="tipo">
                              <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                              <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                              <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Tipo </button>
                            </form>
                          </th>
                          <th class="px-1">
                            <button type="submit" class="btn btn-light btn-sm btn-block px-0 disabled"> Classificação </button>
                          </th>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="valor">
                              <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                              <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                              <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Valor </button>
                            </form>
                          </th>
                          <th class="px-1">
                            <button type="submit" class="btn btn-light btn-sm btn-block px-0 disabled"> Descrição </button>
                          </th>
                          <th class="px-0">
                            <form action="#" method="POST">
                              <input type="hidden" name="ord" value="status">
                              <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                              <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                              <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                              <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                              <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                              <button type="submit" class="btn btn-light btn-sm btn-block px-0"><i class="fas fa-sort-amount-down-alt"></i> Status </button>
                            </form>
                          </th>
                          <th class="px-1"></th>
                        </tr>
                      </thead>
                      <tbody>
<?php 
$show = $pdo->prepare("SELECT custos.*,
cads_tipo_despe.despesa, cads_tipo_despe.class_contab AS clas_cont_despesa,
cads_tipo_servi.servico, cads_tipo_servi.class_contab AS clas_cont_servico,
cads_tipo_taxa.taxa, cads_tipo_taxa.class_contab AS clas_cont_taxa,
cads_centro_custo.centro_custo
FROM custos
LEFT JOIN cads_tipo_despe ON cads_tipo_despe.id = custos.custo
LEFT JOIN cads_tipo_servi ON cads_tipo_servi.id = custos.custo
LEFT JOIN cads_tipo_taxa ON cads_tipo_taxa.id = custos.custo
INNER JOIN cads_centro_custo ON cads_centro_custo.id = custos.centro_custo
WHERE custos.contrato = '$contrato_id'
AND custos.tipo IN ($cst_tipo)
AND custos.data_vencimento BETWEEN '$cst_exibir_inicio_usa' AND '$cst_exibir_fim_usa'
$cst_pesquisar_ccusto
ORDER BY $orderby");
$show->execute();
$conta_tipo_custo = $show->rowCount();
if($conta_tipo_custo>0){  
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$custo_id = $exibe["id"];
$custo_tipo = $exibe["tipo"];
$cst_dt_comp = $exibe["data_competencia"];
$cst_dt_venc = $exibe["data_vencimento"];
$valor = $exibe["valor"];
$info_consumo = $exibe["info_consumo"];
$info_nf = $exibe["nf"];
$descricao = $exibe["descricao"];
$cst_status = $exibe["status"];
$c_cst = $exibe["centro_custo"];
if($custo_tipo==1){
$custo_nome = $exibe["despesa"];
$custo_clas_cont = $exibe["clas_cont_despesa"];
}
if($custo_tipo==2){
$custo_nome = $exibe["servico"];
$custo_clas_cont = $exibe["clas_cont_servico"];
}
if($custo_tipo==3){
$custo_nome = $exibe["taxa"];
$custo_clas_cont = $exibe["clas_cont_taxa"];
}

$sql="SELECT cads_class_contab.* FROM cads_class_contab WHERE cads_class_contab.id = '$custo_clas_cont'";
$show_class = $pdo->prepare("$sql");
$show_class->execute();
$row_class=$show_class->fetch(PDO::FETCH_ASSOC);
$custo_clas_cont = $row_class["categoria"]; 
?>
            <tr>
              <td class="align-middle"><?php echo date('d/m/y', strtotime($cst_dt_venc)); ?></td>
              <td class="align-middle text-center"><?php echo date('m/y', strtotime($cst_dt_comp)); ?></td>
              <td class="align-middle">
<?php if($custo_tipo==1){ ?> <span class="badge badge-warning"> Despesa </span> <?php } ?>
<?php if($custo_tipo==2){ ?> <span class="badge badge-danger"> Serviço </span> <?php } ?>
<?php if($custo_tipo==3){ ?> <span class="badge badge-secondary"> Taxa </span> <?php } ?>
              </td>
              <td class="align-middle">
                <span class="pl-1 badge badge-secondary"><i class="fas fa-tag pr-1"></i> <?php echo $custo_nome; ?></span>
                <span class="pl-1 badge badge-info"><i class="fas fa-tags pr-1"></i> <?php echo $custo_clas_cont; ?></span>
                <span class="pl-1 badge badge-light"><i class="fas fa-funnel-dollar pr-1"></i> <?php echo $c_cst; ?></span>
              </td>
              <td class="align-middle text-right">R$<?php echo number_format($valor,2,",","."); ?></td>
              <td class="align-middle">
<?php if($info_consumo!="" || $info_nf!=""){ ?>
                <button type="button" class="btn btn-light btn-sm px-1 py-0" data-container="body" data-toggle="popover" data-trigger="focus" data-placement="left" data-content="<?php if($info_nf!=""){echo "NF: $info_nf. ";} ?><?php if($info_consumo!=""){echo "Consumo: $info_consumo.";} ?>"><i class="far fa-sticky-note text-info"></i></button>
<?php } ?>
                <?php echo substr($descricao, 0, 50);?>
              </td>
              <td class="align-middle">
<?php if($cst_status==0){ ?> <span class="badge badge-danger"> <i class="far fa-trash-alt"></i> Excluído </span> <?php } ?>
<?php if($cst_status==2){ ?> <span class="badge badge-secondary"> <i class="far fa-circle"></i> Planejado </span> <?php } ?>
<?php if($cst_status==1){ ?> <span class="badge badge-primary"> <i class="far fa-check-circle"></i> Executado </span> <?php } ?>
              </td>
              <td class="align-middle">
                <button type="button" class="btn btn-outline-secondary btn-sm view_custo px-1 py-0" id="<?php echo $exibe["id"]; ?>"> <i class="far fa-edit"></i> </button>
              </td>
            </tr>
<?php } ?>
            <tr>
              <td colspan="8" class="align-middle">
                <form method="POST" action="rel_gcst_csv.php"  >
                  <button type="submit" name="action" value="cst_gcst_exportar_csv" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-file-csv text-primary ml-2"></i> Exportar em CSV
                  </button>
                  <input type="hidden" name="ord" value="<?php echo $ord; ?>">
                  <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                  <input type="hidden" name="cst_exibir_tipo" value="<?php echo $cst_exibir_tipo; ?>">
                  <input type="hidden" name="cst_exibir_ccusto" value="<?php echo $cst_exibir_ccusto; ?>">
                  <input type="hidden" name="cst_exibir_inicio" value="<?php echo $cst_exibir_inicio_br; ?>">
                  <input type="hidden" name="cst_exibir_fim" value="<?php echo $cst_exibir_fim_br; ?>">
                </form>
              </td>
            </tr>            
<?php }else{ ?>
            <tr>
              <td colspan="8" class="text-center">Nenhum custo foi encontrato com os filtros acima.</td>
            </tr>
<?php } ?>
          </tbody>
        </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          <div class="card mt-3">
            <div class="card-header py-1 h6 pt-2 pb-2">                
              <a href="#" data-toggle="collapse" data-target="#gdoc" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
                <i class="fas fa-file-invoice"></i> Gestão de Documentos do contrato <i class="icon-action fa fa-chevron-down"></i>
              </a>
            </div>
<?php
//VERIFICA SE HÁ ALGUMA PASTA ABERTA
$ged_open_folder = filter_input(INPUT_POST, 'ged_open_folder', FILTER_SANITIZE_NUMBER_INT);
//SE ESTVER HAVENDO ALGUMA MANIPULAÇÃO EM UMA PASTA, DEFINE ELA COMO PADRÃO
if(isset($ged_fd_id)){$ged_open_folder = $ged_fd_id;}
//SE HOUVER, ABRE O CARD DA GESTÃO DE DOCUMENTOS
if(isset($ged_open_folder)){ $show_card_ged = true; }else{ $show_card_ged = false; }
?>
            <div class="collapse <?php if($show_card_ged == true){ echo " show";}?>" id="gdoc">
              <div class="card-body p-0">  
                <div class="view-account">
                  <div class="content-panel p-0">
                    <div class="content-header-wrapper mb-0">

                      <div class="col-12 border-bottom ">
                        <div class="row p-1">
                          <div class="col-sm-6">
<?php 
$show_folder = $pdo->prepare("SELECT ged_folder.* FROM ged_folder WHERE ged_folder.ged_fd_cont = '$contrato_id' AND ged_folder.ged_fd_sts = '2' ORDER BY ged_folder.ged_fd_folder ASC");
$show_folder->execute();
$conta_folder = $show_folder->rowCount();
if($conta_folder>0){
  while($exibe=$show_folder->fetch(PDO::FETCH_ASSOC)){
    $ged_fd_id = $exibe["ged_fd_id"];
    $ged_fd_folder = $exibe["ged_fd_folder"];
    $ged_fd_dt = $exibe["ged_fd_dt"];
    $ged_fd_user = $exibe["ged_fd_user"];
    $ged_fd_sts = $exibe["ged_fd_sts"];

    if(empty($ged_open_folder)){$ged_open_folder = $ged_fd_id;}
?>
                            <div class="row pl-1 align-items-center text-muted">
                              <form action="#" method="POST">
                                <input type="hidden" name="ged_open_folder" value="<?php echo $ged_fd_id; ?>">
                                <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                                <button type="submit" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                  <?php if($ged_fd_id == $ged_open_folder){ ?> 
                                   <i class="fas fa-folder-open text-primary small pl-2 mr-2"></i>
                                  <?php } else { ?>
                                  <i class="fas fa-folder small pl-2 mr-2 "></i>
                                  <?php } ?>
                                    <?php echo $ged_fd_folder; ?>
                                </button>
                              </form>

<?php if($ged_fd_id == $ged_open_folder){ ?> 
                              <div class="btn-group">                                    
                                <button type="button" class="btn btn-outline-light btn-sm py-1" data-toggle="modal" data-target="#ged_edt_folder" title="Renomear"> <i class="fas fa-edit small text-primary"></i></button>
                                <button type="button" class="btn btn-outline-light btn-sm py-1" data-toggle="modal" data-target="#ged_del_folder" title="Deletar"><i class="fa fa-trash text-danger small"></i></button>
                              </div>

<!-- MODAL GED RENOMEAR PASTA-->
<div class="modal fade" id="ged_edt_folder" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-folder-plus"></i> Renomear Pasta</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Nome da Pasta:</label>
              <input type="text" name="ged_fd_folder" value="<?php echo $ged_fd_folder; ?>" class="form-control form-control-sm" required="required" tabindex="1" >
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="ged_fd_id" value="<?php echo $ged_fd_id; ?>">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="ged_edt_folder">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Renomear</button>
        </div>
      </form>
    </div>
  </div>
</div>
                                
<!-- MODAL GED EXCLUIR PASTA-->
<div class="modal fade" id="ged_del_folder" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fa fa-trash"></i> Excluir Pasta</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
        
          <div class=" text-danger"> Você tem certeza que deseja excluir esta pasta e todos os seus arquivos?</div>
          
        </div>
        <div class="modal-footer">
          <input type="hidden" name="ged_fd_id" value="<?php echo $ged_fd_id; ?>">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="ged_del_folder">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-danger">Sim! Excluir.</button>
        </div>
      </form>
    </div>
  </div>
</div>
                                
<?php } ?>
                              </div>
<?php } } else { ?>
                              <div class="row pl-1 mt-0 align-items-center text-muted">
                                <button type="button" class="btn btn-outline-secondary btn-block text-left">
                                  Nenhuma pasta criada para este contrato.
                                </button>
                              </div>                              
<?php }?>
                            </div>
                            <div class="col-sm-4 ml-auto">

                              <div class="row py-1">
                                <button type="button" class="btn btn-outline-secondary btn-block btn-sm" data-toggle="modal" data-target="#ged_new_folder"> <i class="fas fa-folder-plus"></i> Nova Pasta  </button>
                              </div>
                              <div class="row py-1">
                                <button type="button" class="btn btn-outline-secondary btn-block btn-sm" data-toggle="modal" data-target="#ged_new_file"> <i class="fas fa-file-medical"></i> Novo Arquivo </button>
                              </div>

                              <div class="row py-1">
<?php
//VERIFICA AS PREFERENCIAS DE EXIBIÇÃO DE ARQUIVOS 
$ged_exibir = filter_input(INPUT_POST, 'ged_exibir', FILTER_SANITIZE_STRING);
if(empty($ged_exibir)){$ged_exibir="ativos";}
if($ged_exibir=="ativos"){$ged_fl_sts="2";}
if($ged_exibir=="arquivados"){$ged_fl_sts="1";}
if($ged_exibir=="excluidos"){$ged_fl_sts="0";}
if($ged_exibir=="todos"){$ged_fl_sts="0,1,2";}

//VERIFICA AS PREFERENCIAS ORDENAÇÃO DE ARQUIVOS 
$ged_ordenar = filter_input(INPUT_POST, 'ged_ordenar', FILTER_SANITIZE_STRING);
if(empty($ged_ordenar)){$ged_ordenar="name_asc";}
if($ged_ordenar=="name_asc"){$ged_order_by="ged_fl_name ASC";}
if($ged_ordenar=="name_desc"){$ged_order_by="ged_fl_name DESC";}
if($ged_ordenar=="data_asc"){$ged_order_by="ged_fl_dt ASC, ged_fl_name ASC";}
if($ged_ordenar=="data_desc"){$ged_order_by="ged_fl_dt DESC, ged_fl_name DESC";}
if($ged_ordenar=="user_asc"){$ged_order_by="user_nome ASC, ged_fl_dt ASC, ged_fl_name ASC";}
if($ged_ordenar=="user_desc"){$ged_order_by="user_nome DESC, ged_fl_dt DESC, ged_fl_name DESC";}

?>
                                <div class="btn-group btn-block ">
                                  <button id="btnGroupDrop1" type="button" class="btn btn-outline-secondary btn-block btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    Exibindo: 
<?php if($ged_exibir=="ativos"){?><i class="fas fa-check text-success"></i> Ativos <span class="caret"></span> <?php } ?>
<?php if($ged_exibir=="arquivados"){?><i class="fas fa-archive text-warning"></i> Arquivados <span class="caret"></span> <?php } ?>
<?php if($ged_exibir=="excluidos"){?><i class="far fa-trash-alt text-danger"></i> Deletados <span class="caret"></span> <?php } ?>
<?php if($ged_exibir=="todos"){?><i class="far fa-folder-open"></i> Todos <span class="caret"></span> <?php } ?>
                                  </button>
                                  <div class="dropdown-menu small" aria-labelledby="btnGroupDrop1">
                                    <form method="POST" action="#">
                                      <button type="submit" name="ged_exibir" value="ativos" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="fas fa-check text-success ml-2"></i> Ativos
                                      </button>
                                      
                                      <button type="submit" name="ged_exibir" value="arquivados" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="fas fa-archive text-warning ml-2"></i> Arquivados
                                      </button>

                                      <button type="submit" name="ged_exibir" value="excluidos" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="far fa-trash-alt text-danger ml-2"></i> Deletados
                                      </button>

                                      <button type="submit" name="ged_exibir" value="todos" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="far fa-folder-open ml-2"></i> Todos 
                                      </button>
                                      
                                      <input type="hidden" name="ged_open_folder" value="<?php echo $ged_open_folder; ?>">
                                      <input type="hidden" name="ged_ordenar" value="<?php echo $ged_ordenar; ?>">
                                      <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">                                      
                                    </form>
                                    
                                  </div>
                                </div>
                              </div>
                              <div class="row py-1">
                                <div class="btn-group btn-block ">
                                  <button id="btnGroupDrop2" type="button" class="btn btn-outline-secondary btn-block btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    Ordem: 
<?php if($ged_ordenar=="data_asc"){?><i class="fas fa-sort-amount-down-alt"></i> Mais novo <span class="caret"></span> <?php } ?>
<?php if($ged_ordenar=="data_desc"){?><i class="fas fa-sort-amount-down"></i> Mais antigo <span class="caret"></span> <?php } ?>
<?php if($ged_ordenar=="name_asc"){?><i class="fas fa-sort-alpha-down"></i> Nome A-Z <span class="caret"></span> <?php } ?>
<?php if($ged_ordenar=="name_desc"){?><i class="fas fa-sort-alpha-down-alt"></i> Nome Z-A <span class="caret"></span> <?php } ?>
                                  </button>
                                  <div class="dropdown-menu small" aria-labelledby="btnGroupDrop2">
                                    <form method="POST" action="#">
                                      <button type="submit" name="ged_ordenar" value="data_asc" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="fas fa-sort-amount-down-alt ml-2"></i> Mais novo
                                      </button>
                                      
                                      <button type="submit" name="ged_ordenar" value="data_desc" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="fas fa-sort-amount-down ml-2"></i> Mais antigo
                                      </button>

                                      <button type="submit" name="ged_ordenar" value="name_asc" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="fas fa-sort-alpha-down ml-2"></i> Nome A-Z
                                      </button>

                                      <button type="submit" name="ged_ordenar" value="name_desc" class="btn btn-link btn-block text-left btn-sm" style="color:#000000 !important; text-decoration:none;">
                                        <i class="fas fa-sort-alpha-down-alt ml-2"></i> Nome Z-A
                                      </button>
                                      
                                      <input type="hidden" name="ged_open_folder" value="<?php echo $ged_open_folder; ?>">
                                      <input type="hidden" name="ged_exibir" value="<?php echo $ged_exibir; ?>">
                                      <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">                                      
                                    </form>                                    
                                    
                                    
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>                       

                      </div>
                      <div class="drive-wrapper drive-list-view p-0">
                        <div class="table-responsive drive-items-table-wrapper">
                          <table class="table table-sm  small mb-0">
                            <thead>
                              <tr>
                                <th class="type"></th>
                                <th class="name truncate">Nome</th>
                                <th class="date">Data</th>
                                <th class="size">Tamanho</th>
                                <th class="action"></th>
                              </tr>
                            </thead>
                            <tbody>
<?php 


$show_file = $pdo->prepare("SELECT ged_fl_id, ged_fl_name, ged_fl_ext, ged_fl_url, ged_fl_sts, ged_fl_dt, ged_fl_user, user_nome
FROM ged_file
INNER JOIN usuarios ON ged_file.ged_fl_user = usuarios.user_id
WHERE ged_file.ged_fl_folder = '$ged_open_folder'
AND ged_file.ged_fl_sts IN ($ged_fl_sts)
ORDER BY $ged_order_by");
  $show_file->execute();
  $conta_file = $show_file->rowCount();
  if($conta_file>0){
    while($exibe=$show_file->fetch(PDO::FETCH_ASSOC)){
      $ged_fl_id = $exibe["ged_fl_id"];
      $ged_fl_name = $exibe["ged_fl_name"];
      $ged_fl_ext = $exibe["ged_fl_ext"];
      $ged_fl_url = $exibe["ged_fl_url"];
      $ged_fl_sts = $exibe["ged_fl_sts"];
      $ged_fl_dt = $exibe["ged_fl_dt"];
      $user_nome = $exibe["user_nome"];
      
?>                          
                              <tr>
                                <td class="type align-middle py-0">
<?php
    if($ged_fl_ext=="doc" || $ged_fl_ext=="txt" || $ged_fl_ext=="docx"){?> <i class="fa fa-file-word text-info"></i> <?php } 
elseif($ged_fl_ext=="xls" || $ged_fl_ext=="csv" || $ged_fl_ext=="xlsx"){?> <i class="fa fa-file-excel text-success"></i> <?php }
elseif($ged_fl_ext=="ppt" || $ged_fl_ext=="pps" || $ged_fl_ext=="pptx"){?> <i class="fa fa-file-powerpoint text-warning"></i> <?php }
elseif($ged_fl_ext=="xml" || $ged_fl_ext=="htm" || $ged_fl_ext=="html"){?> <i class="fa fa-file-code text-primary"></i> <?php }
elseif($ged_fl_ext=="jpg" || $ged_fl_ext=="png" || $ged_fl_ext=="jpeg"){?> <i class="fa fa-file-image text-primary"></i> <?php }
elseif($ged_fl_ext=="pdf"){?> <i class="fa fa-file-pdf text-warning"></i> <?php }
else{?> <i class="fa fa-file text-dark"></i> <?php } 
?>
                                </td>
                                <td class="name truncate align-middle py-0">
                                  <a href="../documentos/<?php echo "$ged_fl_url"; ?>" target="_blank"><?php echo "$ged_fl_name.$ged_fl_ext"; ?></a> 
<?php if($ged_fl_sts==0){?> <i class="far fa-trash-alt text-danger ml-2" title="Excluído"></i> <?php } ?>
<?php if($ged_fl_sts==1){?> <i class="fas fa-archive text-warning ml-2" title="Arquivado"></i> <?php } ?>
<?php if($ged_fl_sts==2){?> <i class="fas fa-check text-success ml-2" title="Ativo"></i> <?php } ?>
                                </td>
                                <td class="date align-middle p-0">
                                  <small class="">
                                  <?php echo date('d/m/y H:m', strtotime($ged_fl_dt)); ?> <br> 
                                  <?php echo $user_nome; ?> 
                                  </small>
                                </td>
                                <td class="size align-middle p-0"> 100kb</td>
                                <td class="action px-1 py-0 align-middle">
                                  <div class="btn-group">                                    
<?php if($ged_fl_sts==2){?>         
                                    <button type="button" class="btn btn-outline-light btn-sm py-1 view_ged_edt_file" id="<?php echo $exibe["ged_fl_id"]; ?>" data-toggle="modal" title="Renomear"> <i class="fas fa-edit small text-primary"></i></button> <?php } ?>
<?php if($ged_fl_sts==2){?>         <button type="button" class="btn btn-outline-light btn-sm py-1 view_ged_arq_file" id="<?php echo $exibe["ged_fl_id"]; ?>" data-toggle="modal" title="Arquivar"><i class="fas fa-archive text-warning small"></i></button> <?php } ?>
<?php if($ged_fl_sts==2 || $ged_fl_sts==1){?><button type="button" class="btn btn-outline-light btn-sm py-1 view_ged_del_file" id="<?php echo $exibe["ged_fl_id"]; ?>" data-toggle="modal" title="Deletar"><i class="fa fa-trash text-danger small"></i></button> <?php } ?>
<?php if($ged_fl_sts==1){?>         <button type="button" class="btn btn-outline-light btn-sm py-1 view_ged_rec_file" id="<?php echo $exibe["ged_fl_id"]; ?>" data-toggle="modal" title="Recuperar"><i class="fas fa-upload text-dark small"></i></button><?php } ?>
                                  </div>
                                </td>
                              </tr>
<?php } ?>
<?php }else{ ?>
                              <tr>
                                <td class="type" colspan="5">Não há arquivos nesta pasta.</td>
                              </tr>
<?php }?>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
          </div>

        
        <div class="col-md-3 px-1">
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-list-ol"></i> Histórico do Contrato
            </div>
            <div class="card-body">

              <div class="timeline">
<?php 
//paginação
$total_reg = "10"; // número de registros por página

if (isset($_POST['pagina'])){$pg = $_POST['pagina'];} else {$pg = "1";}
$inicio = $pg - 1;
$inicio = $inicio * $total_reg;

// atribui valor aos botões "Anterior e próximo"
$anterior = $pg -1;
$proximo = $pg +1;

$pdo = ConnectionN3();
//CONTA QUANTOS REGISTROS EXISTEM
$show_inter = $pdo->prepare("SELECT inter_contrato.inter_id FROM inter_contrato WHERE inter_contrato.inter_contrato = '$contrato_id' AND inter_contrato.inter_tipo > '0'");
$show_inter->execute();
$total_inter = $show_inter->rowCount();
$tp = ceil($total_inter / $total_reg); // verifica o número total de páginas



//BUSCA APENAS OS REGISTROS A SEREM EXIBIDOS PELA PAGINAÇÃO
$show_inter = $pdo->prepare("SELECT inter_contrato.*, usuarios.user_nome FROM inter_contrato INNER JOIN usuarios ON usuarios.user_id = inter_contrato.inter_user WHERE inter_contrato.inter_contrato = '$contrato_id' AND inter_contrato.inter_tipo > '0' ORDER BY inter_id DESC LIMIT $inicio,$total_reg");
$show_inter->execute();
while($exibe=$show_inter->fetch(PDO::FETCH_ASSOC)){
$inter_tipo=$exibe["inter_tipo"];
$inter_data=$exibe["inter_data"];
$inter_desc=$exibe["inter_desc"];
$inter_user=$exibe["user_nome"];

//define cores de acordo com o tipo da inter_contrato
if($inter_tipo==1){$tl_dot_color = "b-success"; $tl_active_color = "active-success";}//1 = Cadastro
if($inter_tipo==2){$tl_dot_color = "b-warning"; $tl_active_color = "active-warning";}//2 = Edição
if($inter_tipo==3){$tl_dot_color = "b-primary"; $tl_active_color = "active-primary";}//3 = Interação
if($inter_tipo==4){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//4 = Renovação
if($inter_tipo==5){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//5 = Novo Custo
if($inter_tipo==6){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//6 = Edição de Custo
if($inter_tipo==7){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//7 = Encerramento do contrato
//if($inter_tipo==8){$tl_dot_color = "b-success"; $tl_active_color = "active-success";}//8 = Conclusão de Atendimento
//if($inter_tipo==9){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//9 = Edição da classificação do Atendimento
?>
                <div class="tl-item <?php echo $tl_active_color; ?>">
                  <div class="tl-dot <?php echo $tl_dot_color; ?>"></div>
                  <div class="tl-content">
                    <div class="tl-date text-muted"><i class="far fa-user"></i> <?php echo $inter_user; ?>  <i class="far fa-clock"></i> <?php echo $dt1 = date('d/m/y H:i', strtotime($inter_data));?></div>
                    <div class=""><?php echo $inter_desc; ?> </div>
                  </div>
                </div>
<?php } ?> 
              </div>

            </div>
            <div class="card-footer pt-1 pb-0">
              <nav>
                <ul class="pagination justify-content-center mb-1">
                  <li class="page-item ">
                    <?php if ($pg>1) { ?> <form action="#" method="POST"><?php } ?>
                      <input type="hidden" name="pagina" value="<?php echo $anterior; ?>">
                      <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                      <button type="submit" class="btn btn-light btn-sm"> Anterior <i class="fas fa-chevron-left"></i></button>
                    <?php if ($pg>1) { ?></form><?php } ?>
                  </li>

<?php if ($pg>0) { ?>
                  <li class="page-item">
                    <button type="submit" class="btn btn-light btn-sm"> <?php echo "$pg de $tp";?> </button>
                  </li>
<?php } ?>

                  <li class="page-item">
                    <?php if ($pg<$tp) { ?> <form action="#" method="POST"><?php } ?>
                      <input type="hidden" name="pagina" value="<?php echo $proximo; ?>">
                      <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
                      <button type="submit" class="btn btn-light btn-sm"><i class="fas fa-chevron-right"></i> Próxima </button>
                    <?php if ($pg<$tp) { ?></form><?php } ?>
                  </li>
                </ul>
              </nav>                
            </div>            
          </div>
        </div>

      </div>
    </div>

<?php // MODAL ENCERRAMENTO DE CONTRATO
if($cont_sts==1){
?>
<div class="modal fade" id="cont_encerrar" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="far fa-calendar-times"></i> Encerrar Contrato</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Observações sobre o Encerramento:</label>
              <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1" ></textarea>
            </div>
          </div>
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Atenção: Após o encerramento do contrato não será mais permitido inserir registros de custos ou despesas.</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="cont_encerrar">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Encerrar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>
<!-- MODAL NOVA INTERAÇÃO -->
<div class="modal fade" id="cont_new_inter" tabindex="-1" role="dialog">
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
              <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1" ></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="cont_new_inter">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php // MODAL RENOVAÇÃO DO CONTRATO
if($cont_sts==1){
?>
<div class="modal fade" id="cont_new_renovacao" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-md" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Renovação do período do contrato</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row pt-2">

            <div class="form-group col-sm-6 col-md-6">
              <label class="my-0 small">Data Término:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="far fa-calendar-times"></i></div>
                </div>                     
                <input type="date" name="data_termino" min="<?php echo $data_termino; ?>" value="" required="required" class="form-control form-control-sm" tabindex="3">
              </div>
            </div>

            <div class="form-group col-sm-6 col-md-6">
              <label class="my-0 small">Valor Atualizado:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-dollar-sign"></i></div>
                </div> 
                <input type="number" step="0.01" min="0" name="valor_atual" value="<?php echo $valor_atual; ?>" required="required" class="form-control form-control-sm" tabindex="4">
              </div>
            </div>              

          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="cont_new_renovacao">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?> 
<?php // MODAL EDIÇÃO DA CLASSIFICAÇÃO DO CONTRATO
if($cont_sts==1){
?>
<div class="modal fade" id="cont_edt_centro_custo" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-md" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição da classificação do Contrato</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row pt-2">

            <div class="form-group col-sm-6">
              <label class="my-0 small">Centro de Custo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-funnel-dollar"></i></div>
                </div>
                <select name="centro_custo" class="form-control form-control-sm" required="required" tabindex="8">
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_centro_custo.id, cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.`status` = '1' ORDER BY centro_custo ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$centro_c_id = $exibe["id"];
$c_cst_nome = $exibe["centro_custo"];
?>
                  <option value="<?php echo $centro_c_id; ?>"<?php if($centro_c_id==$c_cst_id){ echo" selected";}?>><?php echo $c_cst_nome;?></option>
<?php } ?>
                </select>
              </div>
            </div>  

            <div class="form-group col-sm-6">
              <label class="my-0 small">Clas. Contábil:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-tags"></i></div>
                </div>
                <select name="class_contabil" class="form-control form-control-sm" required="required" tabindex="9">
                  <option></option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_class_contab.id, cads_class_contab.categoria FROM cads_class_contab WHERE cads_class_contab.`status` = '1' ORDER BY categoria ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$class_c_id = $exibe["id"];
$class_contab_nome = $exibe["categoria"];
?>
                  <option value="<?php echo $class_c_id; ?>"<?php if($class_c_id==$class_contab_id){ echo" selected";}?>><?php echo $class_contab_nome;?></option>
<?php } ?>
                </select>
              </div>
            </div>                

          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="cont_edt_centro_custo">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?> 
<?php // MODAL EDIÇÃO DA INFORMAÇÕES FINANCEIRAS DO CONTRATO
if($cont_sts==1){
?>
<div class="modal fade" id="cont_edt_inf_financeiras" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-md" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição das informações Financeiras</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
            <div class="form-row pt-2">

              <div class="form-group col-sm-6 col-md-4">
                <label class="my-0 small">Forma Pagto:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-comments-dollar"></i></div>
                  </div>                    
                  <select name="forma_pag" class="form-control form-control-sm" required="required" tabindex="5">
                    <option></option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_forma_pag.id, cads_forma_pag.forma FROM cads_forma_pag WHERE cads_forma_pag.`status` = '1' ORDER BY cads_forma_pag.forma ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$forma_pagto_id = $exibe["id"];
$forma_pagto_nome = $exibe["forma"];
?>
                    <option value="<?php echo $forma_pagto_id; ?>"<?php if($forma_pagto_id==$forma_id){echo " selected";} ?>><?php echo $forma_pagto_nome;?></option>
<?php } ?>
                  </select>
                </div>
              </div>

              <div class="form-group col-sm-6 col-md-4">
                <label class="my-0 small">Data de Pagamento:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-calendar-day"></i></div>
                  </div> 
                  <select name="dia_pagamento" class="form-control form-control-sm" required="required" tabindex="6">
                    <option value="1"<?php if($dia_pagamento==1){echo " selected";} ?>>Dia 01</option>
                    <option value="5"<?php if($dia_pagamento==5){echo " selected";} ?>>Dia 05</option>
                    <option value="10"<?php if($dia_pagamento==10){echo " selected";} ?>>Dia 10</option>
                    <option value="15"<?php if($dia_pagamento==15){echo " selected";} ?>>Dia 15</option>
                    <option value="20"<?php if($dia_pagamento==20){echo " selected";} ?>>Dia 20</option>
                    <option value="25"<?php if($dia_pagamento==25){echo " selected";} ?>>Dia 25</option>
                  </select>
                </div>
              </div>
                  
              <div class="form-group col-sm-6 col-md-4">
                <label class="my-0 small">Reajuste:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-donate"></i></div>
                  </div>
                  <select name="indice_reajuste" class="form-control form-control-sm" required="required" tabindex="7">
                    <option></option>
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_ind_reaju.id, cads_ind_reaju.indice FROM cads_ind_reaju WHERE cads_ind_reaju.`status` = '1' ORDER BY cads_ind_reaju.id ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$indice_id1 = $exibe["id"];
$indice_nome = $exibe["indice"];
?>
                    <option value="<?php echo $indice_id1; ?>"<?php if($indice_id1==$indice_id){echo " selected";} ?>><?php echo $indice_nome;?></option>
<?php } ?>
                  </select>
                </div>
              </div>          

            </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="cont_edt_inf_financeiras">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?> 
<!-- MODAL EDIÇÃO DA INFORMAÇÕES DE CONTATO DO LOCADOR-->
<div class="modal fade" id="cont_edt_inf_contato_locador" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-md" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição das informações de Contato do Locador</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row pt-2">

            <div class="form-group col-sm-12 col-md-6">
              <label class="my-0 small">E-mail::</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-at"></i></div>
                </div> 
                <input name="loc_mail" type="email" class="form-control" required="required"  value="<?php echo $loc_mail; ?>">
              </div>
            </div>

            <div class="form-group col-sm-12 col-md-6">
              <label class="my-0 small">Telefone:</label>
              <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                  </div> 
                  <input name="loc_tel" value="<?php echo $loc_tel; ?>" type="text" required="required" class="form-control">
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="cliente" value="<?php echo $cliente; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="cont_edt_inf_contato_locador">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- MODAL DE AJUDA PARA A GESTÃO DE UM ATENDIMENTO -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Gestão do Contrato</h6>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>

      <div class="modal-body">
        <p><strong>O contrato pode ser gerido da seguinte forma:</strong></p>
        <ul class="list">
          <li>Registre tudo através de <span class="badge badge-light"><i class="fas fa-headset"></i> Nova Interação </span>
            <ul>
              <li class="small">Comentários do locador e as informações que você observar devem ser registradas.</li>
              <li class="small">Cada registro que você fizer será exibido no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do Contrato</span> com a data/hora e o seu nome.</li>
            </ul>
          </li>

          <li class="pt-1">Você pode usar o recurso <span class="badge badge-light">Renovar o Contrato</span> para indicar uma nova data de Término e um valor atualizado.
            <ul>
              <li class="small">O valor atualizado deve ser informado manualmente de acordo com as novas condições negociadas com o Locador.</li>
            </ul>
          </li>
          
        </ul>
      </div>

    </div>
  </div>
</div>   
<?php // MODAL ADICIONAR CUSTO AO CONTRATO
if($cont_sts==1){
?>
<div class="modal fade" id="new_custo" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-plus text-danger"></i> Inserir custo ao contrato</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Descrição:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="far fa-comment-alt"></i></div>
                </div>
                <input type="text" name="descricao" class="form-control form-control-sm" tabindex="1">
              </div>
            </div>            
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">NF:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-file-alt"></i></div>
                </div>
                <input type="number" min="0" name="nf" class="form-control form-control-sm" tabindex="2">
              </div>
            </div>
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Inf. Consumo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fab fa-cloudscale"></i></div>
                </div>
                <input type="number" name="info_consumo" class="form-control form-control-sm" tabindex="3">
              </div>
            </div>            
          </div>          
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Valor:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-dollar-sign"></i></div>
                </div>
                <input type="number" step="0.01" min="0" name="valor" value="" required="required" class="form-control form-control-sm" tabindex="4">
              </div>
            </div>
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Vencimento:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="far fa-calendar-check"></i></div>
                </div>
                <input type="date" name="data_vencimento" value="<?php echo $hoje; ?>" required="required" class="form-control form-control-sm" tabindex="5">
              </div>
            </div>
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Competência:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="far fa-calendar-check"></i></div>
                </div>
                <input type="month" name="data_competencia" value="<?php echo $hoje; ?>" required="required" class="form-control form-control-sm" tabindex="6">
              </div>
            </div>
            
          </div>
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Tipo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-tag"></i></div>
                </div>              
                <select name="tipo" id="tipo" class="form-control form-control-sm" required="required" tabindex="7">
                  <option></option>
                  <option value="1">Despesa</option>
                  <option value="2">Serviço</option>
                  <option value="3">Taxa</option>
                </select>
              </div>
            </div>
<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'tipo'-->
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Custo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-tag"></i></div>
                </div>
                <span class="carregando1 small">Aguarde, carregando...</span>
                <select name="custo" id="custo"  class="form-control form-control-sm" required="required" tabindex="8">
                  <option></option>
                </select>
              </div>
            </div>

            <div class="form-group col-sm-4">
              <label class="my-0 small">Centro de Custo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-funnel-dollar"></i></div>
                </div>
                <select name="centro_custo" class="form-control form-control-sm" required="required" tabindex="9">
<?php
$pdo = ConnectionN3();
$show = $pdo->prepare("SELECT cads_centro_custo.id, cads_centro_custo.centro_custo FROM cads_centro_custo WHERE cads_centro_custo.`status` = '1' ORDER BY centro_custo ASC");
$show->execute();
while($exibe=$show->fetch(PDO::FETCH_ASSOC)){
$centro_c_id = $exibe["id"];
$c_cst_nome = $exibe["centro_custo"];
?>
                  <option value="<?php echo $centro_c_id; ?>"<?php if($centro_c_id==$c_cst_id){ echo" selected";}?>><?php echo $c_cst_nome;?></option>
<?php } ?>
                </select>
              </div>
            </div>  

          </div>
<!--         
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Recorrência:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-retweet"></i></div>
                </div>
                <select name="recorrencia" class="form-control form-control-sm" required="required" tabindex="1">
                  <option value="0">Não recorrente</option>
                  <option value="1">Semanal</option>
                  <option value="2">Mensal</option>
                  <option value="3">Anual</option>
                </select>
              </div>
            </div>

          </div>          
-->
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="cont_new_custo">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger"  tabindex="10">Adicionar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?> 
<!-- MODAL GED NOVA PASTA-->
<div class="modal fade" id="ged_new_folder" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-folder-plus"></i> Nova Pasta</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Nome da Pasta:</label>
              <input type="text" name="ged_fd_folder" class="form-control form-control-sm" required="required" tabindex="1" >
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="ged_new_folder">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- MODAL GED NOVO ARQUIVO-->
<div class="modal fade" id="ged_new_file" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST" enctype="multipart/form-data">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-file-medical"></i> Novo Arquivo </h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">

            <div class="form-group col-sm-12">
              <label class="my-0 small">Pasta de armazenamento:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-folder-plus"></i> </div>
                </div>
                <select name="ged_fl_folder" class="form-control form-control-sm" required="required" tabindex="9">
<?php
$pdo = ConnectionN3();
$show_folder = $pdo->prepare("SELECT ged_folder.* FROM ged_folder WHERE ged_folder.ged_fd_cont = '$contrato_id' AND ged_folder.ged_fd_sts = '2' ORDER BY ged_folder.ged_fd_folder ASC");
  $show_folder->execute();
  $conta_folder = $show_folder->rowCount();
  if($conta_folder>0){
    while($exibe=$show_folder->fetch(PDO::FETCH_ASSOC)){
      $ged_fd_id = $exibe["ged_fd_id"];
      $ged_fd_folder = $exibe["ged_fd_folder"];
?>
                  <option value="<?php echo $ged_fd_id; ?>"<?php if($ged_open_folder==$ged_fd_id){ echo" selected";}?>><?php echo $ged_fd_folder;?></option>
<?php } ?>
<?php } ?>
                </select>
              </div>
            </div> 

            <div class="form-group col-sm-12">
              <label class="my-0 small">Nome do arquivo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-file"></i> </div>
                </div>
                <input type="text" name="ged_fl_name" class="form-control form-control-sm" required="required" tabindex="2" >
              </div>
            </div> 

            <div class="form-group col-sm-12">
              <label class="my-0 small">Arquivo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-file"></i> </div>
                </div>
                <input type="file" name="arquivo" class="form-control form-control-sm" required="required" tabindex="3" >
              </div>
            </div> 
          
        </div>
        <div class="modal-footer">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="ged_new_file">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<?php } ?>
<?php if (isset($mensagem)){ ?>
<div class="row pull-right" style="position:absolute; top: 65px; right:25px; z-index: 3;">
  <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
    <?php echo $mensagem; ?> 
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
</div>
<?php }?>
<?php include_once("../all/update_pass.php"); ?>
    <script src="../js/bootstrap.min.js"></script>
    <script src="../js/jquery-3.6.0.min.js"></script>    
<!-- bootstrap.bundle e bootstrap-select são necessários para seja possível pesquisar por nome no select locador-->    
    <script src="../js/bootstrap.bundle.min.js"></script>
    <script src="../js/bootstrap-select.min.js"></script>
<!-- loader e os js abaixo são necessários para popular os selects dependentes (Tipo de despesa) -->
    <script src="../js/loader.js" type="text/javascript"></script>
    <script type="text/javascript">
      //pupula os selects CUSTO de acordo com O TIPO
      $(function(){
        $('#tipo').change(function(){
          if( $(this).val() ) {
            $('#custo').hide();
            $('.carregando1').show();
            $.getJSON('busca_tipo_custo.php?search=',{tipo: $(this).val(), ajax: 'true'}, function(j){
              var options = '<option value="">Escolha um tipo de custo</option>';	
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }	
              $('#custo').html(options).show();
              $('.carregando1').hide();
            });
          } else {
            $('#custo').html('<option value="">– Escolha um tipo de custo –</option>');
          }
        });
      });
    </script>
    
<!--    os js abaixo são necessários para o periodo de datas do relatório de custo do contrato-->
   <script src="../js/jquery-ui.js"></script>
    <script>
      $( function() {
        var dateFormat = "dd/mm/yy",
          from = $( "#from" )
            .datepicker({
              defaultDate: "+1w",
              changeMonth: true,
              numberOfMonths: 1,
              selectOtherMonths: true,
              dateFormat: "dd/mm/yy"
            })
            .on( "change", function() {
              to.datepicker( "option", "minDate", getDate( this ) );
            }),

          to = $( "#to" ).datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            numberOfMonths: 1,
            dateFormat: "dd/mm/yy"
          })
          .on( "change", function() {
            from.datepicker( "option", "maxDate", getDate( this ) );
          });

        function getDate( element ) {
          var date;
          try {
            date = $.datepicker.parseDate( dateFormat, element.value );

          } catch( error ) {
            date = null;
          }

          return date;
        }
      } );
    </script>
  

<!-- MODAL DE EDIÇÃO DE CUSTO -->
<div class="modal fade" id="modalEdtCusto" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog  modal-lg">
    <div class="modal-content">
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title"><i class="fas fa-edit text-danger"></i> Edição de Custo</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <span id="info_edt_custo"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Fechar</button>
          <input type="hidden" name="action" value="cont_edt_custo">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id;?>">
          <button type="submit" class="btn btn-outline-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_custo', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('contrato_custo_edt.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_custo").html(retorna);
          $('#modalEdtCusto').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- --> 
<!-- GED renomear arquivo--> 
<div class="modal fade" id="ged_edt_file" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog  modal-md">
    <div class="modal-content">
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title"><i class="fas fa-file-signature"></i> Edição de arquivo</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
            <div class="form-group col-sm-12">
              <label class="my-0 small">Pasta de armazenamento:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-folder-plus"></i> </div>
                </div>
                <select name="ged_fl_folder" class="form-control form-control-sm" required="required" tabindex="9">
<?php
$pdo = ConnectionN3();
$show_folder = $pdo->prepare("SELECT ged_folder.* FROM ged_folder WHERE ged_folder.ged_fd_cont = '$contrato_id' AND ged_folder.ged_fd_sts = '2' ORDER BY ged_folder.ged_fd_folder ASC");
  $show_folder->execute();
  $conta_folder = $show_folder->rowCount();
  if($conta_folder>0){
    while($exibe=$show_folder->fetch(PDO::FETCH_ASSOC)){
      $ged_fd_id = $exibe["ged_fd_id"];
      $ged_fd_folder = $exibe["ged_fd_folder"];
?>
                  <option value="<?php echo $ged_fd_id; ?>"<?php if($ged_open_folder==$ged_fd_id){ echo" selected";}?>><?php echo $ged_fd_folder;?></option>
<?php } ?>
<?php } ?>
                </select>
              </div>
            </div>          
          <span id="ged_file_renomear"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Cancelar</button>
          <input type="hidden" name="ged_open_folder" value="<?php echo $ged_open_folder; ?>">
          <input type="hidden" name="action" value="ged_edt_file">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id;?>">
          <button type="submit" class="btn btn-outline-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_ged_edt_file', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('ged_file_renomear.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#ged_file_renomear").html(retorna);
          $('#ged_edt_file').modal('show'); 
        });
      }
    });
  });
</script>   
<!-- GED ARQUIVAR documento--> 
<div class="modal fade" id="ged_arq_file" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-md">
    <div class="modal-content">
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title"><i class="fas fa-archive"></i> Arquivar documento</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="h6">
            <br>
            Tem certeza que deseja arquivar este documento?
            <br>
            <br>
          </div>
          <span id="ged_file_arquivar"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Cancelar</button>
          <input type="hidden" name="ged_open_folder" value="<?php echo $ged_open_folder; ?>">
          <input type="hidden" name="action" value="ged_arq_file">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id;?>">
          <button type="submit" class="btn btn-outline-danger">Arquivar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_ged_arq_file', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('ged_file_arquivar.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#ged_file_arquivar").html(retorna);
          $('#ged_arq_file').modal('show'); 
        });
      }
    });
  });
</script>   

<!-- GED RECUPERAR documento--> 
<div class="modal fade" id="ged_rec_file" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-md">
    <div class="modal-content">
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title"><i class="fas fa-upload"></i> Recuperar documento</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="h6">
            <br>
            Tem certeza que deseja Desarquivar este documento?
            <br>
            <br>
          </div>
          <span id="ged_file_recuperar"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Cancelar</button>
          <input type="hidden" name="ged_open_folder" value="<?php echo $ged_open_folder; ?>">
          <input type="hidden" name="action" value="ged_rec_file">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id;?>">
          <button type="submit" class="btn btn-outline-danger">Recuperar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_ged_rec_file', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('ged_file_arquivar.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#ged_file_recuperar").html(retorna);
          $('#ged_rec_file').modal('show'); 
        });
      }
    });
  });
</script>   

<!-- GED DELETAR documento--> 
<div class="modal fade" id="ged_del_file" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-md">
    <div class="modal-content">
      <form method="POST" action="#">
        <div class="modal-header">
          <h6 class="modal-title"><i class="far fa-trash-alt"></i> Excluir documento</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="h6 text-danger">
            <br>
            Tem certeza que deseja Excluir este documento?
            <br>
            Não será possível recupará-lo após esta ação.
            <br>
          </div>
          <span id="ged_file_deletar"></span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Cancelar</button>
          <input type="hidden" name="ged_open_folder" value="<?php echo $ged_open_folder; ?>">
          <input type="hidden" name="action" value="ged_del_file">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="contrato" value="<?php echo $contrato_id;?>">
          <button type="submit" class="btn btn-outline-danger">Excluir!</button>
        </div>
      </form>
    </div>
  </div>
</div>


<script>
  $(document).ready(function(){
    $(document).on('click','.view_ged_del_file', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('ged_file_arquivar.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#ged_file_deletar").html(retorna);
          $('#ged_del_file').modal('show'); 
        });
      }
    });
  });


<?php if (isset($mensagem)){ ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000); 
    </script>
<?php } ?>
    <script>
      $(document).ready(function(){
        $('[data-toggle="popover"]').popover();
      });
    </script>
    
 
<script>
                      let sel = document.getElementById('forma_pag');

function verifica() {
    let nao = document.getElementById('forma_pag');
    if (sel.value == '') {
        nao.required = false;
    } else {
        nao.required = true;
    }
}

sel.addEventListener('change', verifica);


<script/>

  </body>
</html>