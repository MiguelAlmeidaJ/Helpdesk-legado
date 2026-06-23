<?php

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");
//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_tarefa_interacao=true; 
$exibe_bt_tarefa_aceitar=false; 
$exibe_bt_tarefa_devolver=false; 
$exibe_bt_tarefa_espera=false; 
$exibe_bt_tarefa_finalizar=false; 
$exibe_bt_tarefa_retomar=false;

if($m8_00==0){header("Location: ../index.php");}
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
    <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
    
    <title>Allterus</title>
    <style type="text/css">
      /* usado apenas para formatar a mensagem de espera para os selectbox dependentes */
      .carregando{
        color:#ff0000;
        display:none;
      }
      .carregando2{
        color:#ff0000;
        display:none;
      }
      .carregando3{
        color:#ff0000;
        display:none;
      }
      .carregando4{
        color:#ff0000;
        display:none;
      }
    </style>
  </head>
  <body>
<?php include_once("../all/loading.php"); ?>
<?php include_once("../all/sidebar.php"); ?>
<?php 
//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

//verifico se existe alguma requisição via post cahamda tarefa
$tarefa = filter_input(INPUT_POST, 'tarefa', FILTER_SANITIZE_NUMBER_INT);

if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

if ($usar_token=="true") {
  if($action){
    if ($action == "tarefa_adc") {
      $nome_tarefa = filter_input(INPUT_POST, 'nome_tarefa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
      $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      //$abertura = date("Y-m-d H:i:s");
      $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $id_projeto = filter_input(INPUT_POST, 'id_projeto', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

      //VERIFICA SE DATA HORA ABERTURA É MAIOR DO QUE DATA HORA ATUAL.
      //SE POSITIVO: UM TAREFA AGENDADO
      //MUDA O STATUS PADRÃO DE ABERTURA PARA 0 (AGENDADO)
      if(strtotime($abertura) > strtotime($agora)){
        $tarefa_sts = 0;
        $agendamento = date("d/m/Y H:i",strtotime($abertura));
        $inter_msg = "Registrou o Agendamento da Tarefa para $agendamento.";
      }else{
        $tarefa_sts = 1;
        $inter_msg = "Registrou solicitação de Tarefa.";
      }

      //VERIFICA SE EXISTE UM TAREFA ABERTO PARA O MESMO CLIENTE, COM A MESMA CATEGORIA E MESMA SUBCATEGORIA NOS ÚLTIMOS 30 DIAS
      //SE HOUVER, CLASSIFICA O TAREFA COMO REINCIDENTE
      $prazo_reincidente = 30; //PERIODO EM DIAS PARA VERIFICAR REINCIDÊNCIA
      $data_reincidente = date("Y-m-d",strtotime($hoje." - $prazo_reincidente days"));
      $show = $pdo->prepare("SELECT tarefas_mkt.id FROM tarefas_mkt WHERE tarefas_mkt.abertura > '$data_reincidente' AND tarefas_mkt.cliente = '$cliente' AND tarefas_mkt.categoria = '$categoria' AND tarefas_mkt.subcategoria = '$subcategoria'");      
      $show->execute();
      $conta_tarefa = $show->rowCount();
      if($conta_tarefa>0){$reincidente = 1;}else{$reincidente = 0;}
      
      
      //SELECIONAR TABELA PROJETO PARA `PEGAR` O ID DO PROJETO




      //INICIA PROCESSO DE GRAVAÇÃO DO TAREFA NA BASE DE DADOS
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `tarefas_mkt` (`nome_tarefa`, `cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `dias`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `id_projeto`) VALUES (:nome_tarefa, :cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :dias, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$tarefa_sts', :id_projeto);");
      $adc->bindParam(':nome_tarefa', $nome_tarefa);
      $adc->bindParam(':cliente', $cliente);
      $adc->bindParam(':pessoa', $pessoa);
      $adc->bindParam(':local', $local);
      $adc->bindParam(':tipo', $tipo);
      $adc->bindParam(':categoria', $categoria);
      $adc->bindParam(':subcategoria', $subcategoria);
      $adc->bindParam(':item', $item);
      $adc->bindParam(':dias', $dias);
      $adc->bindParam(':forma', $forma);
      $adc->bindParam(':desc_abertura', $desc_abertura);
      $adc->bindParam(':abertura', $abertura);
      $adc->bindParam(':tecnico', $tecnico);
      $adc->bindParam(':id_projeto', $id_projeto);

      //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
      //if($tecnico>0 && $tecnico!= $user_id){
      //}
      
      if($adc->execute()){
        $tarefa = $pdo->lastInsertId();
        $mensagem = "<i class=\"fas fa-check\"></i> Tarefa cadastrada!";
        $mensagem_cor = "alert-success";
        $log = "true";
        
        //cadastra abertura do tarefa na tabela de interatividade
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$tarefa', '$user_id', '$agora', '$inter_msg');");
        $adc->execute();
        
        //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
        //registra interação de direcionamento de tarefa
        if($tecnico>0 && $tecnico!= $user_id){
          $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
          $show_tec->execute();
          $exibe=$show_tec->fetch(PDO::FETCH_ASSOC);
          $tecnico_nome = $exibe["user_nome"];            

          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$tarefa', '$user_id', '$agora', 'Direcionou o tarefa para $tecnico_nome.')");
          $adc->execute();
        }        
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar tarefa!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      } 
    }

    //EDITA A CATEGORIZAÇÃO DA TAREFA
    if ($action == "tarefa_edt") {   
      $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if($tipo==1){$tarefa_tipo_nome="Falha";}
        if($tipo==2){$tarefa_tipo_nome="Relacionamento";}
        if($tipo==3){$tarefa_tipo_nome="Requisição de Serviços";}
        if($tipo==4){$tarefa_tipo_nome="Requisição de informação";}
        if($tipo==5){$tarefa_tipo_nome="Notificação de monitoramento";}
        if($tipo==0){$tarefa_tipo_nome="Não informado";}          
      $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        $show_cat->execute();
        $row=$show_cat->fetch(PDO::FETCH_ASSOC);
        $tarefa_cat_nome=$row["cat_nome"];
        
      $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        $show_scat->execute();
        $row=$show_scat->fetch(PDO::FETCH_ASSOC);
        $tarefa_scat_nome=$row["scat_nome"];
        
      $tarefa_dias=$row["dias"];
        if($tarefa_dias==0){$tarefa_diasn="Não informado"; $sla = $sla_n0;}
        if($tarefas_dias==1){$tarefas_diasn="Arte"; $sla = $sla_n1;}
        if($tarefas_dias==2){$tarefas_diasn="AjusteI"; $sla = $sla_n2;}
        if($tarefas_dias==3){$tarefas_diasn="AjusteC"; $sla = $sla_n3;}
        if($tarefas_dias==4){$tarefas_diasn="Texto"; $sla = $sla_n4;}
        if($tarefas_dias==5){$tarefas_diasn="Calendario"; $sla = $sla_n5;}
        if($tarefas_dias==6){$tarefas_diasn="Encarte"; $sla = $sla_n6;}
        if($tarefas_dias==7){$tarefas_diasn="Projetosn1"; $sla = $sla_n7;}
        if($tarefas_dias==8){$tarefas_diasn="Projetosn2"; $sla = $sla_n8;}
        if($tarefas_dias==9){$tarefas_diasn="Projetosn3"; $sla = $sla_n9;}
        if($tarefas_dias==10){$tarefas_diasn="Ses_fotos"; $sla = $sla_n10;}
        if($tarefas_dias==11){$tarefas_diasn="Edi_fotos"; $sla = $sla_n11;}
        if($tarefas_dias==12){$tarefas_diasn="Grav_video"; $sla = $sla_n12;}
        if($tarefas_dias==13){$tarefas_diasn="Edi_video"; $sla = $sla_n13;}
        if($tarefas_dias==14){$tarefas_diasn="Reuniao"; $sla = $sla_n14;}
        
      //BUSCA A CLASSIFICAÇÃO ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICAÇÃO
      $pdo = ConnectionN3();
      $show_tarefa = $pdo->prepare("SELECT tarefas_mkt.`tipo`, tarefas_mkt.`categoria`, tarefas_mkt.`subcategoria`, tarefas_mkt.`dias`,
      categorias.cat_nome,
      subcategorias.scat_nome
      FROM tarefas_mkt 
      LEFT JOIN categorias ON categorias.cat_id = tarefas_mkt.categoria
      LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas_mkt.subcategoria
      WHERE tarefas_mkt.id = '$tarefa'");
      $show_tarefa->execute();
      $row=$show_tarefa->fetch(PDO::FETCH_ASSOC);
      $tarefa_tipo_original=$row["tipo"];
        if($tarefa_tipo_original==1){$tarefa_tipo_original_nome="Falha";}
        if($tarefa_tipo_original==2){$tarefa_tipo_original_nome="Relacionamento";}
        if($tarefa_tipo_original==3){$tarefa_tipo_original_nome="Requisição de Serviços";}
        if($tarefa_tipo_original==4){$tarefa_tipo_original_nome="Requisição de informação";}
        if($tarefa_tipo_original==5){$tarefa_tipo_original_nome="Notificação de monitoramento";}
        if($tarefa_tipo_original==0){$tarefa_tipo_original_nome="Não informado";}      
      $tarefa_cat_original=$row["categoria"];
        $tarefa_cat_original_nome=$row["cat_nome"];
      $tarefa_scat_original=$row["subcategoria"];
        $tarefa_scat_original_nome=$row["scat_nome"];
      $tarefa_dias=$row["dias"];
        if($tarefa_dias_original==1){$tarefa_dias_original_nome="Não informado";}
        if($tarefa_dias_original==2){$tarefa_dias_original_nome="Arte";}
        if($tarefa_dias_original==3){$tarefa_dias_original_nome="AjusteI";}
        if($tarefa_dias_original==4){$tarefa_dias_original_nome="AjusteC";}
        if($tarefa_dias_original==5){$tarefa_dias_original_nome="Texto";}
        if($tarefa_dias_original==6){$tarefa_dias_original_nome="Calendario";}
        if($tarefa_dias_original==7){$tarefa_dias_original_nome="Encarte";}
        if($tarefa_dias_original==8){$tarefa_dias_original_nome="Projetosn1";}
        if($tarefa_dias_original==9){$tarefa_dias_original_nome="Projetosn2";} 
        if($tarefa_dias_original==10){$tarefa_dias_original_nome="Projeton3";} 
        if($tarefa_dias_original==11){$tarefa_dias_original_nome="Ses_fotos";} 
        if($tarefa_dias_original==12){$tarefa_dias_original_nome="Edi_fotos";} 
        if($tarefa_dias_original==13){$tarefa_dias_original_nome="Grav_video";} 
        if($tarefa_dias_original==14){$tarefa_dias_original_nome="Reuniao";}  
      
      //COMPARA O TIPO DA TAREFA:
      //SE DIFERENTE:
      if($tipo!=$tarefa_tipo_original){
        //ALTERA O CÓDIGO DO TIPO NA TABELA DE tarefas_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `tipo`='$tipo' WHERE `id`='$tarefa';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou o Tipo: <s>De: $tarefa_tipo_original_nome</s> para $tarefa_tipo_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação da tarefa alterada!";
            $mensagem_cor = "alert-success";
          }
        }        
      }
      
      //COMPARA O DIA(S) DA TAREFA:
      //SE DIFERENTE:
      if($dias!=$tarefa_dias_original){
        //ALTERA O CÓDIGO DO NºVEL NA TABELA DE tarefas_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `dias`='$dias' WHERE `id`='$tarefa';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou o Nível: <s>De: $tarefa_dias_original_nome</s> para $tarefa_dias_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação da tarefa alterada!";
            $mensagem_cor = "alert-success";
          }
        }        
      }
      
      //COMPARA A CATEGORIA :
      //SE DIFERENTE:
      if($categoria!=$tarefa_cat_original){
        //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE tarefas_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `categoria`='$categoria' WHERE `id`='$tarefa';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou a Categoria: <s>De: $tarefa_cat_original_nome</s> para $tarefa_cat_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação da tarefa alterada!";
            $mensagem_cor = "alert-success";
          }
        }        
      }
      
      
      //COMPARA A SUBCATEGORIA :
      //SE DIFERENTE:
      if($subcategoria!=$tarefa_scat_original){
        //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE tarefas_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `subcategoria`='$subcategoria' WHERE `id`='$tarefa';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$tarefa', '$user_id', '$agora', 'Editou a Sub Categoria: <s>De: $tarefa_scat_original_nome</s> para $tarefa_scat_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação DA TAREFA alterada!";
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
      $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :tarefa, '$user_id', '$agora', :inter_desc);");
      $adc->bindParam(':inter_desc', $inter_desc);
      $adc->bindParam(':tarefa', $tarefa);
      if($adc->execute()){
         $mensagem = "<i class=\"fas fa-check\"></i> Interação cadastrada!";
         $mensagem_cor = "alert-success";
       }else{
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
      if($tecnico==$user_id){ 
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$tarefa';");
        if($adc->execute()){
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$tarefa', '$user_id', '$agora', 'Iniciou a tarefa.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O status da tarefa foi alterado para 'Em Execução'!";
            $mensagem_cor = "alert-success";
          }        
        }
      }
      //SE FALSO:
      //1 - mantem status da tarefa como 1 (ATENDIMENTO AGUARDANDO EXECUÇÃO)
      //1 - registra na tabela de atendimento o novo técnico responsóvel 
      //2 - busca o NOME do técnico responsóvel
      //3 - registra na tabela de interatividade a atribuição do chamando
      if($tecnico!=$user_id){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `tecnico`='$tecnico', `status`='1' WHERE  `id`='$tarefa';");
        if($adc->execute()){
          $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
          $show_tec->execute();
          $exibe=$show_tec->fetch(PDO::FETCH_ASSOC);
          $tecnico_nome = $exibe["user_nome"];            

          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$tarefa', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi direcionado para $tecnico_nome.";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento a outro técnico!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento a outro técnico!";
          $mensagem_cor = "alert-danger"; 
        }
      }        
    }
    
    //USUÁRIO RETOMA UM ATENDIMENTO
    if ($action == "tarefa_retomar") {
      $pdo = ConnectionN3();
      
      //altera o status da tarefa para 2 (Em execução)
      $edt= $pdo->prepare("UPDATE `tarefas_mkt` SET `status`='2' WHERE  `id`='$tarefa';");
      if($edt->execute()){
        //busca o ID do registro de espera, na tabela espera
        $show_espera = $pdo->prepare("SELECT espera.espera_id FROM espera WHERE espera.espera_tarefa = '$tarefa' ORDER BY espera.espera_id DESC LIMIT 0,1");
        $show_espera->execute();
        $exibe=$show_espera->fetch(PDO::FETCH_ASSOC);
        $espera_id = $exibe["espera_id"]; 
        
        //registra A data hora final de espera, na tabela espera
        $edt_espera= $pdo->prepare("UPDATE `espera` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
        if($edt_espera->execute()){

          //insere o registro de uma nova interação 
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$tarefa', '$user_id', '$agora', 'Retomou a tarefa.');");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interAções com o cliente!";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
          $mensagem_cor = "alert-danger"; 
        }        
      }else{
         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o atendimento!";
         $mensagem_cor = "alert-danger"; 
      } 
    }
    
    //USUÁRIO RECUSA UM ATENDIMENTO
    if ($action == "tarefa_recusar") {
      $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
      $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    //VERIFICA SE O ATENDIMENTO FOI DIRECIONADO PARA OUTRO TÉCNICO
      //SE VERDADEIRO:
      //1 - muda o status da tarefa para 1 (aguardando atendimento)
      //1 - registra na tabela de atendimento o novo técnico responsóvel 
      //2 - busca o NOME do técnico responsóvel
      //2 - registra na tabela de interatividade que o usuário direcionou o atendimento.      
      if($tecnico!=0){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `tecnico`='$tecnico', `status`='1' WHERE `id`='$tarefa';");
        if($adc->execute()){
          
          $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
          $show_tec->execute();
          $exibe=$show_tec->fetch(PDO::FETCH_ASSOC);
          $tecnico_nome = $exibe["user_nome"];     
          
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$tarefa', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome: <br> $inter_desc');");
          if($adc->execute()){
             $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Atendimento direcionado para $tecnico_nome. <br> O que vamos fazer agora?";
             $mensagem_cor = "alert-warning";
          }        
        }else{
           $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento!";
           $mensagem_cor = "alert-danger"; 
        } 
      }
      //SE FALSO:
      //1 - muda o status da tarefa para 1 (aguardando atendimento)
      //1 - remove o técnico como responsóvel pelo atendimento
      //2 - registra na tabela de interatividade que o usuário recusou o atendimento.     
      if($tecnico==0){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `tecnico`='0', `status`='1' WHERE `id`='$tarefa';");
        if($adc->execute()){ 
          
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', '$tarefa', '$user_id', '$agora', 'Recusou o atendimento: <br> $inter_desc');");
          if($adc->execute()){
             $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Atendimento recusado. <br> O que vamos fazer agora?";
             $mensagem_cor = "alert-warning";
          }        
        }else{
           $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o atendimento!";
           $mensagem_cor = "alert-danger"; 
        } 
      }

    }
    
    //COLOCAR ATENDIMENTO EM ESPERA
    if ($action == "tarefa_espera") {
      $espera_desc = filter_input(INPUT_POST, 'espera_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $espera_prev = filter_input(INPUT_POST, 'espera_prev', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
      $pdo = ConnectionN3();
      //altera status da tarefa para 3 (Em espera)
      $edt= $pdo->prepare("UPDATE `tarefas_mkt` SET `status`='3' WHERE  `id`='$tarefa';");
      if($edt->execute()){
        //insere registro de espera na tabela de espera
        $adc= $pdo->prepare("INSERT INTO `espera` (`espera_tarefa`, `espera_start`, `espera_prev`, `espera_desc`, `espera_user`) VALUES ('$tarefa', '$agora', '$espera_prev', '$espera_desc', '$user_id');");
        if($adc->execute()){
          //insere registro da ação na tabela de interatividade
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$tarefa', '$user_id', '$agora', 'Colocou o atendimento Em Espera. <br> Previsão de retorno: $espera_prev_br <br> Descrição: $espera_desc');");
          if($adc->execute()){
             $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> A tarefa foi colocada Em Espera.";
             $mensagem_cor = "alert-warning";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar tarefa em espera!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de espera!";
          $mensagem_cor = "alert-danger"; 
        } 
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status da tarefa!";
        $mensagem_cor = "alert-danger"; 
      }
    }
    
    //USUÁRIO FINALIZA UM ATENDIMENTO
    if ($action == "tarefa_finalizar") {
      $desc_fechamento = filter_input(INPUT_POST, 'desc_fechamento', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("UPDATE `tarefas_mkt` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$tarefa';");
      $adc->bindParam(':desc_fechamento', $desc_fechamento);
      $adc->bindParam(':fechamento', $agora);
      if($adc->execute()){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$tarefa', '$user_id', '$agora', 'Finalizou o atendimento. <br> Descrição: $desc_fechamento');");
        if($adc->execute()){
           $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O que mais temos para hoje?!";
           $mensagem_cor = "alert-success";
        }        
      }else{
         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o atendimento!";
         $mensagem_cor = "alert-danger"; 
      } 
    }
  }
}
?>
<?php 
// Verifica de existe o ID de um atendimento setado.
// Se não houver, exibe a parte de CADASTRO tarefas_mkt
if (empty($tarefa)){ 
if($m8_01==0){header("Location: ../index.php");}  
  ?>
    <div class="container-fluid">
      <div class="row mt-2 justify-content-md-center">       
        <div class="col-12 col-sm-12 col-md-11 col-lg-10">
          <div class="card">
            <div class="h6 card-header">
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitação de tarefa
            </div>
            <div class="card-body py-3">
              <form action="#" method="POST">
                <div class="form-row">
                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Projeto:</label>
                    <select name="cliente" id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
                      <option></option>
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT proj_mkt.id, proj_mkt.nome_proj, proj_mkt.cliente FROM proj_mkt INNER JOIN CLIENTES ON proj_mkt.CLIENTE = CLIENTEs.clt_ID ORDER BY proj_mkt.nome_proj ASC");                         
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $id = $exibe["id"];
  $nome_proj = $exibe["nome_proj"];
  $cliente = $exibe["cliente"];
?>
                      <option value="<?php echo $cliente; ?>"><?php echo $nome_proj;?><?php echo $id?> </option>
                      
<?php } ?>
                    
                    </select>
                  </div>
                  
<!-- -->

                  

<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Solicitante:</label>
                    <span class="carregando small">Carregando...</span>
                    <select name="solicitante" id="solicitante"  class="form-control form-control-sm" required="required" tabindex="2">
                    
                    <option></option>
                    </select>
                  </div>

<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
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
                      <option value="2">Relacionamento</option>
                      <option value="3">Requisição de Serviços</option>
                      <option value="4">Requisição de informação</option>
                      <option value="5">Notificação de monitoramento</option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Categoria:</label>
                    <select name="categoria" id="categoria"  class="form-control form-control-sm" required="required" tabindex="5">
                      <option></option>
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $cat_id = $exibe["cat_id"];
  $cat_nome = $exibe["cat_nome"];
?>
                      <option value="<?php echo $cat_id; ?>"><?php echo $cat_nome;?></option>
<?php } ?>
                    </select>
                  </div>

<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Sub Categoria:</label>
                    <span class="carregando3 small">Aguarde, carregando...</span>
                    <select name="subcategoria" id="subcategoria"  class="form-control form-control-sm" required="required" tabindex="6">
                      <option></option>
                    </select>
                  </div>

<!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Item:</label>
                    <span class="carregando4 small">Aguarde, carregando...</span>
                    <select name="item" id="item"  class="form-control form-control-sm" required="required" tabindex="7">
                      <option></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Dias:</label>
                    <input type="number" id="dias" name="dias" min="1" max="999" class="form-control form-control-sm" required="required" tabindex="8">
                    <!--<select name="dias" class="form-control form-control-sm" required="required" tabindex="8">
                      <option></option>
                      <option value="5">1 dia</option>
                      <option value="6">2 dias</option>
                      <option value="7">5 dias</option>
                      <option value="8">15 dias</option>
                      <option value="9">30 dias</option>
                      <option value="10">60 dias</option>
                      <option value="11">90 dias</option>
                      <option value="1">NA</option>
                    </select> -->
                  </div>
                </div>
                
                <div class="form-row pt-2">
                  
                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Nome da Tarefa:</label>
                    <textarea name="nome_tarefa" class="form-control form-control-sm" rows="1" required="required" tabindex="9" ></textarea>
                  </div>
                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea name="desc_abertura" class="form-control form-control-sm" rows="1" required="required" tabindex="9" ></textarea>
                  </div>
                  
                  <div class="form-group col-sm-6 col-md-6">
                    <div class="form-row">
                      
                  <div class="form-group col-sm-12 col-md-6">
                    <label class="my-0 small">Tecnico:</label>
                    <select name="tecnico" id="tecnico"  class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="10">
                      <option></option>
                      <option value="0">Não determinado</option>
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' AND usuarios.user_id > '1' ORDER BY usuarios.user_nome ASC");
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $user_id = $exibe["user_id"];
  $user_nome = $exibe["user_nome"];
?>
                      <option value="<?php echo $user_id; ?>"><?php echo $user_nome;?></option>
<?php } ?>
                    </select>
                  </div>
                  
                  <div class="form-group col-sm-12 col-md-6">
                    <label class="my-0 small">Forma de atendimento:</label>
                    <select name="forma" class="form-control form-control-sm" required="required" tabindex="11">
                      <option value="1">Remoto</option>
                      <option value="2">Presencial</option>
                      <option value="3">Remoto - Plantão</option>
                      <option value="4">Presencial - Plantão</option>
                    </select>
                  </div>
                  
                  <div class="form-group col-sm-12 col-md-6">
                    <label class="my-0 small">Abertura:</label>
                    <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i",strtotime($agora));?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                  </div>
                  
                  <div class="form-group col-sm-12 col-md-6 pt-3 text-center">
                    <input type="hidden" name="token" value="<?php echo $token;?>">
                    <input type="hidden" name="action" value="tarefa_adc">
                    <button type="submit" class="btn btn-danger btn-sm p-1"><i class="fas fa-plus"></i> Iniciar atendimento</button>
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
<!-- MODAL DE AJUDA PARA CADASTRO tarefas_mkt -->    
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
//GED NOVA PASTA
    if ($action == "ged_new_folder") {
      $ged_fd_folder = filter_input(INPUT_POST, 'ged_fd_folder', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      
      $pdo = ConnectionN3();      
      $adc= $pdo->prepare("INSERT INTO `ged_folder_mkt` (`ged_fd_cont`, `ged_fd_folder`, `ged_fd_dt`, `ged_fd_user`) VALUES (:inter_mkt, :ged_fd_folder, '$agora', '$user_id');");
      $adc->bindParam(':inter_mkt', $tarefa);
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
      $ged_fd_folder = filter_input(INPUT_POST, 'ged_fd_folder', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $ged_fd_id = filter_input(INPUT_POST, 'ged_fd_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_folder_mkt` SET `ged_fd_folder` = :ged_fd_folder WHERE  `ged_fd_id`=:ged_fd_id;");
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
      $edt= $pdo->prepare("UPDATE `ged_folder_mkt` SET `ged_fd_sts` = '0' WHERE  `ged_fd_id`=:ged_fd_id;");
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
      $ged_fl_name = filter_input(INPUT_POST, 'ged_fl_name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
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
      $destino = '../docs_mkt/'.$file_url;
      // salva o arquivo na pasta 
      if(@move_uploaded_file($arquivo_tmp,$destino)){        
        //grava os dados do documento na tabela ged_file para gestão do documento
        $pdo = ConnectionN3();      
        $adc= $pdo->prepare("INSERT INTO `ged_file_mkt` (`ged_fl_folder`, `ged_fl_cont`, `ged_fl_name`, `ged_fl_ext`, `ged_fl_url`, `ged_fl_dt`, `ged_fl_user`) VALUES (:ged_fl_folder, :inter_mkt, :ged_fl_name, '$file_ext', '$file_url', '$agora', '$user_id');");
        $adc->bindParam(':inter_mkt', $tarefa);
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
      $ged_fl_folder = filter_input(INPUT_POST, 'ged_fl_folder', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $ged_fl_name = filter_input(INPUT_POST, 'ged_fl_name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $ged_fl_id = filter_input(INPUT_POST, 'ged_fl_id', FILTER_SANITIZE_NUMBER_INT);
 
      $pdo = ConnectionN3();      
      $edt= $pdo->prepare("UPDATE `ged_file_mkt` SET `ged_fl_folder` = :ged_fl_folder, `ged_fl_name`=:ged_fl_name WHERE  `ged_fl_id`=:ged_fl_id");
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
      $edt= $pdo->prepare("UPDATE `ged_file_mkt` SET `ged_fl_sts` = '1' WHERE  `ged_fl_id`=:ged_fl_id");
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
      $edt= $pdo->prepare("UPDATE `ged_file_mkt` SET `ged_fl_sts` = '2' WHERE  `ged_fl_id`=:ged_fl_id");
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
      $edt= $pdo->prepare("UPDATE `ged_file_mkt` SET `ged_fl_sts` = '0' WHERE  `ged_fl_id`=:ged_fl_id");
      $edt->bindParam(':ged_fl_id', $ged_fl_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Documento Deletado!";
        $mensagem_cor = "alert-danger";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao deletar documento!";
        $mensagem_cor = "alert-danger"; 
      }
    }  
    ?>
<?php    
// Verifica de existe o ID de um atendimento setado.
// Se não houver, exibe a parte de CADASTRO DE tarefas
if (isset($tarefa)){ ?>
<?php
//Busca informações da tarefa

$pdo = ConnectionN3();
$show_tarefa = $pdo->prepare("SELECT tarefas_mkt.`area`, tarefas_mkt.`tipo`, tarefas_mkt.`categoria`, tarefas_mkt.`subcategoria`, tarefas_mkt.`item`, tarefas_mkt.`local`, tarefas_mkt.dias, tarefas_mkt.forma, tarefas_mkt.desc_abertura, tarefas_mkt.desc_fechamento, tarefas_mkt.abertura, tarefas_mkt.fechamento, tarefas_mkt.reincidente, tarefas_mkt.`status`, tarefas_mkt.`tecnico`,
clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
categorias.cat_nome,
subcategorias.scat_nome,
itens.itens_nome,
usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
FROM tarefas_mkt 
LEFT JOIN clientes ON clientes.clt_id = tarefas_mkt.cliente
LEFT JOIN pessoas ON pessoas.pessoa_id = tarefas_mkt.pessoa
LEFT JOIN locais ON locais.local_id = tarefas_mkt.`local`
LEFT JOIN categorias ON categorias.cat_id = tarefas_mkt.categoria
LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas_mkt.subcategoria
LEFT JOIN itens ON itens.itens_id = tarefas_mkt.item
LEFT JOIN usuarios ON usuarios.user_id = tarefas_mkt.tecnico
WHERE tarefas_mkt.id = '$tarefa'");
$show_tarefa->execute();
$row=$show_tarefa->fetch(PDO::FETCH_ASSOC);
  $tarefa_desc_abertura=$row["desc_abertura"];
  $tarefa_desc_fechamento=$row["desc_fechamento"];
  $tarefa_hora_abertura=$row["abertura"];
  $tarefa_hora_fechamento=$row["fechamento"];
  $tarefa_reincidente=$row["reincidente"];
  $tarefa_status=$row["status"];
  $tarefa_tipo=$row["tipo"];
    if($tarefa_tipo==1){$tarefa_tipo_nome="Falha";}
    if($tarefa_tipo==2){$tarefa_tipo_nome="Relacionamento";}
    if($tarefa_tipo==3){$tarefa_tipo_nome="Requisição de Serviços";}
    if($tarefa_tipo==4){$tarefa_tipo_nome="Requisição de informação";}
    if($tarefa_tipo==5){$tarefa_tipo_nome="Notificação de monitoramento";}
    if($tarefa_tipo==0){$tarefa_tipo_nome="Não informado";}
  $tarefa_dias=$row["dias"];
    if($tarefa_dias==0){$tarefa_dias_nome="Não informado";}
    if($tarefa_dias==1){$tarefa_dias_nome="Arte";}
    if($tarefa_dias==2){$tarefa_dias_nome="AjusteI";}
    if($tarefa_dias==3){$tarefa_dias_nome="AjusteC";}
    if($tarefa_dias==4){$tarefa_dias_nome="Texto";}
    if($tarefa_dias==5){$tarefa_dias_nome="Calendario";}
    if($tarefa_dias==6){$tarefa_dias_nome="Encarte";}
    if($tarefa_dias==7){$tarefa_dias_nome="Projetosn1";}
    if($tarefa_dias==8){$tarefa_dias_nome="Projetosn2";}
    if($tarefa_dias==9){$tarefa_dias_nome="Projetosn3";}
    if($tarefa_dias==10){$tarefa_dias_nome="Ses_fotos";}
    if($tarefa_dias==11){$tarefa_dias_nome="Edi_fotos";}
    if($tarefa_dias==12){$tarefa_dias_nome="Grav_videos";}
    if($tarefa_dias==13){$tarefa_dias_nome="Edi_videos";}
    if($tarefa_dias==14){$tarefa_dias_nome="Reuniao";}

  $tarefa_forma=$row["forma"];
  
  $clt_id=$row["clt_id"];
  $clt_nomer=$row["clt_nomer"];
  $clt_nomef=$row["clt_nomef"];
  $clt_cnpj=$row["clt_cnpj"];

  $pessoa_nom=$row["pessoa_nom"];
  $pessoa_cargo=$row["pessoa_cargo"];
  $pessoa_tel=$row["pessoa_tel"];
  $pessoa_mail=$row["pessoa_mail"];
  
  $local=$row["local"];
  $local_nom=$row["local_nom"];
  if($local==0){$local_nom = "Não informado";}
  $local_end=$row["local_end"];
  $local_city=$row["local_city"];
  $local_uf=$row["local_uf"];
  $tarefa_cat=$row["categoria"];
  $tarefa_item=$row["item"];
  $cat_nome=$row["cat_nome"];
  $tarefa_scat=$row["subcategoria"];
  $scat_nome=$row["scat_nome"];
  $itens_nome=$row["itens_nome"];
  
  $tecnico_nome=$row["tecnico_nome"];
  $tecnico_id=$row["tecnico"];
  if($tecnico_id==0){$tecnico_nome = "Não Atribuído";}
?>    
    <div class="container-fluid">
      <div class="row mt-2">
        <div class="col-md-3 px-1">
          
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-headset text-danger"></i> Tarefa #<?php echo str_pad($tarefa , 5 , '0' , STR_PAD_LEFT); ?>
            </div>
            <div class="card-body pt-1 pl-0 pr-0"> 
              <ul class="list-unstyled">
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-building mr-2"></i><?php echo $clt_nomer; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-paste small ml-3 pl-3 mr-2"></i><small>CNPJ: <?php echo $clt_cnpj; ?></small></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-building small ml-3 pl-3 mr-2"></i><small><?php echo $clt_nomef; ?></small></li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-user-tag mr-2"></i><?php echo $pessoa_nom; ?></li>
<?php if($pessoa_cargo!=""){ ?>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-sitemap small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_cargo; ?></small></li>
<?php } ?>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-mobile-alt small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_tel; ?></small></li>
                <hr class="p-0 mt-1 mb-0">                        
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-map-marked-alt mr-2"></i><?php echo $local_nom; ?></li>
<?php if($local>0){   ?>                      
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-map-signs small ml-3 pl-3 mr-2"></i><small><?php echo "$local_end - $local_city - $local_uf"; ?></small></li>
<?php } ?>
                <hr class="p-0 mt-2 mb-0">
                <li class="mt-1 align-items-center">
                  <div class="row px-0 mx-0 ">
                    <div class="col-10 pt-1 small">
                    <strong>Classificação da Tarefa:</strong>                   
                    </div>
<?php if($m3_01==3){ ?>
                    <div class="col-2 text-right">
                      <button type="button" class="btn btn-outline-secondary btn-sm small" data-toggle="modal" data-target="#tarefa_edt"> <i class="far fa-edit"></i></button>
                    </div>
<?php } ?>
                  </div>
                </li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center">               
<?php if($tarefa_forma==1){ ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> Tarefa Remota <?php } ?>
<?php if($tarefa_forma==2){ ?> <i class="fas fa-briefcase mr-2 text-danger"></i> Tarefa Presencial <?php } ?>
<span class="badge badge-warning ml-3"><?php echo $tarefa_dias; ?> Dias<span> 
<?php if($tarefa_reincidente==1){ ?> 
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
<?php if($tarefa_status==0){ ?>
                  <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Atendimento Agendado </button>
<?php } ?>
<?php if($tarefa_status==1){ ?>
                  <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="fas fa-hourglass-half"></i> Aguardando Execução </button>
<?php } ?>
<?php if($tarefa_status==2){ ?>
                  <button type="button" class="btn btn-primary btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Atendimento em Execução </button>
<?php } ?>
<?php if($tarefa_status==3){ ?>
                  <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Atendimento em Espera </button>
<?php } ?>
<?php if($tarefa_status==4){ ?>
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
                  <input class="form-control form-control-sm" value="<?php echo $time_limit_to_close = date("d/m/y H:i",strtotime($tarefa_hora_abertura." +20 hours")); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Tecnico:</label>
                  <input class="form-control form-control-sm" value="<?php echo $tecnico_nome; ?>" disabled="">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descrição de abertura:</label>
                  <textarea class="form-control form-control-sm" rows="4" disabled="" ><?php echo $tarefa_desc_abertura; ?></textarea>
                </div>
              </div>
<?php if($tarefa_status==4){ ?>
              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descrição de fechamento:</label>
                  <textarea class="form-control form-control-sm" rows="3" disabled="" ><?php echo $tarefa_desc_fechamento; ?></textarea>
                </div>
              </div>
<?php } ?>
              <div class="row">
<?php 
//ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

//SE NºO HOUVER TÉCNICO ATRIBUÍDO PARA O ATENDIMENTO
if($tecnico_id==0){ $exibe_bt_tarefa_aceitar=true; }

//SE O ATENDIMENTO ESTIVER AGUARDANDO E O USUÁRIO FOR O TÉCNICO
if($tarefa_status==1 && $tecnico_id==$user_id){ $exibe_bt_tarefa_aceitar=true; }

//SE O ATENDIMENTO ESTIVER EM ESPERA E O USUÁRIO FOR O TÉCNICO
if($tarefa_status==3 && $tecnico_id==$user_id){ $exibe_bt_tarefa_retomar=true; }

//SE O ATENDIMENTO ESTIVER EM EXECUÇÃO E O USUÁRIO FOR O TÉCNICO
if($tarefa_status==2 && $tecnico_id==$user_id){ $exibe_bt_tarefa_devolver=true; $exibe_bt_tarefa_espera=true; $exibe_bt_tarefa_finalizar=true; }

//ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM A PERMISSÃO DO USUÁRIO
if($m3_02==0){ $exibe_bt_tarefa_aceitar=false; $exibe_bt_tarefa_finalizar=false;}
if($m3_03==0){ $exibe_bt_tarefa_espera=false; }
if($m3_04==0){ $exibe_bt_tarefa_devolver=false; }


if($m3_05==2){ //se usuário com permissão para editar tarefas de terceiros
  if($tarefa_status==3){$exibe_bt_tarefa_retomar=true;}
  $exibe_bt_tarefa_devolver=true;
  if($tarefa_status==2){$exibe_bt_tarefa_espera=true;}
  if($tarefa_status>1 && $tarefa_status<4){$exibe_bt_tarefa_finalizar=true;}
}

?>
<?php if($exibe_bt_tarefa_interacao==true){ ?>
                <div class="col-3 px-1">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_new_inter"> <i class="fas fa-headset"></i> Nova Interação </button>
                </div>
<?php } ?>
<?php if($exibe_bt_tarefa_aceitar==true){ ?>
                <div class="col-3 px-1">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_aceitar"> <i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar </button>
                </div>
<?php } ?>
<?php if($exibe_bt_tarefa_retomar==true){ ?>
                <div class="col-3 px-1">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_retomar"> <i class="far fa-arrow-alt-circle-down"></i> Retomar </button>
                </div>
<?php } ?>
<?php if($exibe_bt_tarefa_espera==true){ ?>
                <div class="col-3 px-1">
                  <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_espera"> <i class="far fa-pause-circle"></i> Colocar em Espera </button>
                </div>
<?php } ?>
<?php if($exibe_bt_tarefa_devolver==true){ ?>
                <div class="col-3 px-1">
                  <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_recusar"> <i class="far fa-arrow-alt-circle-up"></i> Recusar </button>
                </div>
<?php } ?>
<?php if($exibe_bt_tarefa_finalizar==true){ ?>
                <div class="col-3 px-1">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#tarefa_finalizar"> <i class="far fa-check-circle"></i> Finalizar </button>
                </div>
<?php } ?>    
              </div>
              
              
            </div>
          </div>
        
        <div class="card mt-3">
            <div class="card-header py-1 h6 pt-2 pb-2">                
              <a href="#" data-toggle="collapse" data-target="#gdoc" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
                <i class="fas fa-file-invoice"></i> Gestão de Documentos da Tarefa <i class="icon-action fa fa-chevron-down"></i>
              </a>
            </div>
            <!-- MODAL GED NOVA PASTA-->

<?php
//VERIFICA SE Há ALGUMA PASTA ABERTA
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
$show_folder = $pdo->prepare("SELECT ged_folder_mkt.* FROM ged_folder_mkt WHERE ged_folder_mkt.ged_fd_cont = '$tarefa' AND ged_folder_mkt.ged_fd_sts = '2' ORDER BY ged_folder_mkt.ged_fd_folder ASC");
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
                                <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
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
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
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
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
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
                                  Nenhuma pasta criada para esta tarefa.
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
$ged_exibir = filter_input(INPUT_POST, 'ged_exibir', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
if(empty($ged_exibir)){$ged_exibir="ativos";}
if($ged_exibir=="ativos"){$ged_fl_sts="2";}
if($ged_exibir=="arquivados"){$ged_fl_sts="1";}
if($ged_exibir=="excluidos"){$ged_fl_sts="0";}
if($ged_exibir=="todos"){$ged_fl_sts="0,1,2";}

//VERIFICA AS PREFERENCIAS ORDENAÇÃO DE ARQUIVOS 
$ged_ordenar = filter_input(INPUT_POST, 'ged_ordenar', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
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
                                      <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">                                      
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
                                      <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">                                      
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
FROM ged_file_mkt
INNER JOIN usuarios ON ged_file_mkt.ged_fl_user = usuarios.user_id
WHERE ged_file_mkt.ged_fl_folder = '$ged_open_folder'
AND ged_file_mkt.ged_fl_sts IN ($ged_fl_sts)
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
                                  <a href="../docs_mkt/<?php echo "$ged_fl_url"; ?>" target="_blank"><?php echo "$ged_fl_name.$ged_fl_ext"; ?></a> 
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
              <i class="fas fa-list-ol"></i> Histórico da Tarefa  #<?php echo str_pad($tarefa , 5 , '0' , STR_PAD_LEFT); ?>
            </div>
            <div class="card-body">
              
                <div class="timeline">
<?php 
$pdo = ConnectionN3();
$show_inter = $pdo->prepare("SELECT inter_tarefa_mkt.*, usuarios.user_nome FROM inter_tarefa_mkt INNER JOIN usuarios ON usuarios.user_id = inter_tarefa_mkt.inter_user WHERE inter_tarefa_mkt.inter_tarefa = '$tarefa' AND inter_tarefa_mkt.inter_tipo > '0' ORDER BY inter_id DESC");
$show_inter->execute();
while($exibe=$show_inter->fetch(PDO::FETCH_ASSOC)){
$inter_tipo=$exibe["inter_tipo"];
$inter_data=$exibe["inter_data"];
$inter_desc=$exibe["inter_desc"];
$inter_user=$exibe["user_nome"];

//define cores de acordo com o tipo da interatividade
if($inter_tipo==1){$tl_dot_color = "b-primary"; $tl_active_color = "active-primary";}//1 = Abertura de Atendimento
if($inter_tipo==2){$tl_dot_color = "b-success"; $tl_active_color = "active-success";}//2 = Aceite de Atendimento
if($inter_tipo==3){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//3 = Devolução de Atendimento
if($inter_tipo==4){$tl_dot_color = "b-warning"; $tl_active_color = "active-warning";}//4 = Transferência de Atendim
if($inter_tipo==5){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//5 = Envio para espera
if($inter_tipo==6){$tl_dot_color = "b-primary"; $tl_active_color = "active-primary";}//6 = Retomada da tarefa
if($inter_tipo==7){$tl_dot_color = "b-primary"; $tl_active_color = "active-primary";}//7 = Interação com o solicita
if($inter_tipo==8){$tl_dot_color = "b-success"; $tl_active_color = "active-success";}//8 = Conclusão de Atendimento
if($inter_tipo==9){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//9 = Edição da classificação da tarefa
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
              <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1" ></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
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
        <div class="modal-body py-1">
                <div class="form-row pt-2">
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Tipo de atendimento:</label>
                    <select name="tipo" class="form-control form-control-sm" required="required" tabindex="4">
                      <option></option>
                      <option value="1"<?php if($tarefa_tipo==1){ echo" selected";}?>>Falha</option>
                      <option value="2"<?php if($tarefa_tipo==2){ echo" selected";}?>>Relacionamento</option>
                      <option value="3"<?php if($tarefa_tipo==3){ echo" selected";}?>>Requisição de Serviços</option>
                      <option value="4"<?php if($tarefa_tipo==4){ echo" selected";}?>>Requisição de informação</option>
                      <option value="5"<?php if($tarefa_tipo==5){ echo" selected";}?>>Notificação de monitoramento</option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Categoria:</label>
                    <select name="categoria" id="categoria"  class="form-control form-control-sm" required="required" tabindex="5">
                      <option></option>
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT categorias.cat_id, categorias.cat_nome FROM categorias WHERE categorias.cat_sts = '1' AND categorias.cat_setor = '1' ORDER BY categorias.cat_nome ASC");
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $cat_id = $exibe["cat_id"];
  $cat_nome = $exibe["cat_nome"];
?>
                      <option value="<?php echo $cat_id; ?>" <?php if($cat_id==$tarefa_cat){ echo" selected";}?>><?php echo $cat_nome;?></option>
<?php } ?>
                    </select>
                  </div>

<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Sub Categoria:</label>
                    <span class="carregando3 small">Aguarde, carregando...</span>
                    <select name="subcategoria" id="subcategoria"  class="form-control form-control-sm" required="required" tabindex="6">
                      <option value="<?php echo $tarefa_scat; ?>"><?php echo $scat_nome; ?></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Dias:</label>
                    <input type="number" id="dias" name="dias" min="1" max="999" class="form-control form-control-sm" required="required" tabindex="7">
                    <!--<select name="dias" class="form-control form-control-sm" required="required" tabindex="7">
                      <option></option>
                      <option value="5"</?php if($tarefa_dias==1){ echo" selected";}?>>1 dia</option>
                      <option value="6"</?php if($tarefa_dias==2){ echo" selected";}?>>2 dias</option>
                      <option value="7"</?php if($tarefa_dias==3){ echo" selected";}?>>5 dias</option>
                      <option value="8"</?php if($tarefa_dias==4){ echo" selected";}?>>15 dias</option>
                      <option value="9"</?php if($tarefa_dias==0){ echo" selected";}?>>30 dias</option>
                      <option value="10"</?php if($tarefa_dias==0){ echo" selected";}?>>60 dias</option>
                      <option value="11"</?php if($tarefa_dias==0){ echo" selected";}?>>90 dias</option> -->
                    </select>
                  </div>
                </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="tarefa_edt">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
    
<?php if($exibe_bt_tarefa_aceitar==true){ ?>
<!-- MODAL ACEITE DO CHAMADO -->
<div class="modal fade" id="tarefa_aceitar" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down text-success"></i> Iniciar atendimento ou direcionar para outro Tecnico</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <label class="small"><strong>Iniciar o atendimento:</strong></label>
          <label class="small">Se o técnico informado for o próprio usuário: a) este atendimento ficará sob sua responsabilidade; b) o status da tarefa será alterado para "Em execução".</label>
          <label class="small pt-1"><strong>Direcionar a outro técnico:</strong></label>
          <label class="small">Se o técnico informado NºO for o próprio usuário: a) este atendimento será redirecionado para a fila de tarefas do técnico informado; b) este atendimento contuará com o status "Aguardando atendimento" até que o técnico responsóvel confirme o início da execução.</label>
          <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Tecnico responsóvel:</label>
              <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="9">
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $tecnico_id = $exibe["user_id"];
  $tecnico_nome = $exibe["user_nome"];
?>
                <option value="<?php echo $tecnico_id; ?>" <?php if($tecnico_id==$user_id){echo " selected";} ?>><?php echo $tecnico_nome;?></option>
<?php } ?>
              </select>
            </div>
          </div>        
        </div>
        <div class="modal-footer">
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="tarefa_aceitar">        
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_tarefa_retomar==true){ ?>
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
        <label class="small">Confirmação de retomada da tarefa.</label>
        <label class="small">Este atendimento estava aguardando o retorno de um terceiro. Ao retomar este atendimento ele ficará sob sua responsabilidade. Não esqueça de informar todas as interação com o cliente.</label>
      </div>
      <div class="modal-footer">
        <form action="#" method="POST">
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="tarefa_retomar">        
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-success">Retomar o atendimento</button>
        </form>
      </div>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_tarefa_espera==true){ ?>
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
              <textarea name="espera_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1" ></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group col-sm-12">
              <label class="my-0 small">Data prevista para encerramento da espera:</label>
              <input type="text" id="datetimepicker" name="espera_prev" value="<?php echo date("Y-m-d H:i",strtotime($agora." +2 days"));?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="2">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="tarefa_espera">        
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-success">Colocar em espera</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_tarefa_devolver==true){ ?>
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
            <label class="small">Ao confirmar esta tela SEM informar um técnico: a) o atendimento voltará para a fila de atendimento sem um responsóvel; b) este atendimento contuará com o status "Aguardando atendimento" até que um técnico o aceite.</label>
            <label class="small pt-1"><strong>Direcionar atendimento:</strong></label>
            <label class="small">Ao confirmar esta tela informando um técnico responsóvel: a) este atendimento será redirecionado para a fila de tarefas do técnico informado; b) este atendimento contuará com o status "Aguardando atendimento" até que o técnico responsóvel confirme o início da execução.</label>
            <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
          </div>
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Tecnico responsóvel:</label>
              <select name="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="9">
                <option value="0">Não atribuído</option>                
<?php
$pdo = ConnectionN3();
$show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' ORDER BY usuarios.user_nome ASC");
$show_clt->execute();
while($exibe=$show_clt->fetch(PDO::FETCH_ASSOC)){
  $tecnico_id = $exibe["user_id"];
  $tecnico_nome = $exibe["user_nome"];
?>
                <option value="<?php echo $tecnico_id; ?>"><?php echo $tecnico_nome;?></option>
<?php } ?>
              </select>
            </div>
          </div>           
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Justificativa para recusa ou direcionamento:</label>
              <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1" ></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="tarefa_recusar">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Recusar Atendimento</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_tarefa_finalizar==true){ ?>
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
              <textarea name="desc_fechamento" class="form-control form-control-sm" rows="4" required="required" tabindex="1" ></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="tarefa_finalizar">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
        </div>
      </form>
    </div>
  </div>
</div>  
<?php } ?>

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
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
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
$show_folder = $pdo->prepare("SELECT ged_folder_mkt.* FROM ged_folder_mkt WHERE ged_folder_mkt.ged_fd_cont = '$tarefa' AND ged_folder_mkt.ged_fd_sts = '2' ORDER BY ged_folder_mkt.ged_fd_folder ASC");
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
          <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="ged_new_file">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
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
              <li class="small">Se você for o técnico que executará o atendimento, apenas confirme o seu nome como <em>Tecnico Resposável</em>.</li>
              <li class="small">Quando você confirmar seu nome como <em>Tecnico Resposável</em> pelo atendimento outras opçães de gestão da tarefa aparecerão na sua tela.</li>
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
<!-- bootstrap.bundle e bootstrap-select são necessários para seja possível pesquisar por nome no select cliente-->    
    <script src="../js/bootstrap.bundle.min.js"></script>
    <script src="../js/bootstrap-select.min.js"></script>
    <script>
      $('.selectpicker').selectpicker();
    </script>

<?php if(empty($tarefa) || $exibe_bt_tarefa_espera==true){ ?>    
<!-- CAMPO DE DATA E HORA DA TELA DE ESPERA -->    
    <script type = "text/javascript" src = "../js/bootstrap-datetimepicker.js" charset = "UTF-8"></script>
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
          format: "yyyy-mm-dd hh:ii"
      });
    </script>
<?php } ?>


<!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
    <script src="../js/loader.js" type="text/javascript"></script>
<?php  if(empty($tarefa)){ ?>      
    <script type="text/javascript">
      //pupula os selects solicitante e local de acordo com o cliente escolhido
      $(function(){
        $('#cliente').change(function(){
          if( $(this).val() ) {
            $('#solicitante').hide();
            $('#local').hide();
            $('.carregando').show();
            $('.carregando2').show();
            $.getJSON('busca_solicitantes.php?search=',{cliente: $(this).val(), ajax: 'true'}, function(j){
              var options = '<option value="">Escolha o solicitante</option>';	
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }
              $('#solicitante').html(options).show();
              $('.carregando').hide();
            });
            $.getJSON('busca_locais.php?search=',{cliente: $(this).val(), ajax: 'true'}, function(j){
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
<?php }?>    
    <script type="text/javascript">
      //pupula os selects subcategoria de acordo com a categoria escolhida
      $(function(){
        $('#categoria').change(function(){
          if( $(this).val() ) {
            $('#subcategoria').hide();
            $('.carregando3').show();
            $.getJSON('busca_subcategorias.php?search=',{categoria: $(this).val(), ajax: 'true'}, function(j){
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
      $(function(){
        $('#subcategoria').change(function(){
          if( $(this).val() ) {
            $('#item').hide();
            $('.carregando4').show();
            $.getJSON('busca_itens.php?search=',{subcategoria: $(this).val(), ajax: 'true'}, function(j){
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


<?php if (isset($mensagem)){ ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000); 
    </script>
<?php }?>
  </body>
</html>