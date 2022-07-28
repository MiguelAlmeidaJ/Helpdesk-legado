<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");

$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_projeto_interacao=true; 
$exibe_bt_projeto_aceitar=false; 
$exibe_bt_projeto_devolver=false; 
$exibe_bt_projeto_espera=false; 
$exibe_bt_projeto_finalizar=false; 
$exibe_bt_projeto_retomar=false;

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
<//?php include_once("../all/loading.php"); ?>
<?php include_once("../all/header.php"); ?>
<?php 
//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);

//verifico se existe alguma requisição via post cahamda projeto
$projs_mkt = filter_input(INPUT_POST, 'projeto', FILTER_SANITIZE_NUMBER_INT);

if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

if ($usar_token=="true") {
  if($action){
    if ($action == "projeto_adc") {
      $nome_proj = filter_input(INPUT_POST, 'nome_proj', FILTER_SANITIZE_STRING);
      $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_STRING);
      $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_STRING);
      $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_STRING);
      $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_STRING);
      $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
      $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_STRING);
      $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_STRING);
      $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_STRING);
      $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_STRING);
      $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_STRING);
      //$abertura = date("Y-m-d H:i:s");
      $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_STRING);
      $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_STRING);

      //VERIFICA SE DATA HORA ABERTURA É MAIOR DO QUE DATA HORA ATUAL.
      //SE POSITIVO: UM PROJETO AGENDADO
      //MUDA O STATUS PADRÃO DE ABERTURA PARA 0 (AGENDADO)
      if(strtotime($abertura) > strtotime($agora)){
        $projeto_sts = 0;
        $agendamento = date("d/m/Y H:i",strtotime($abertura));
        $inter_msg = "Registrou o Agendamento do projeto para $agendamento.";
      }else{
        $projeto_sts = 1;
        $inter_msg = "Registrou solicitação de projeto.";
      }

      //VERIFICA SE EXISTE UM PROJETO ABERTO PARA O MESMO CLIENTE, COM A MESMA CATEGORIA E MESMA SUBCATEGORIA NOS ÚLTIMOS 30 DIAS
      //SE HOUVER, CLASSIFICA O PROJETO COMO REINCIDENTE
      $prazo_reincidente = 30; //PERIODO EM DIAS PARA VERIFICAR REINCIDÊNCIA
      $data_reincidente = date("Y-m-d",strtotime($hoje." - $prazo_reincidente days"));
      $show = $pdo->prepare("SELECT proj_mkt.id FROM proj_mkt WHERE proj_mkt.abertura > '$data_reincidente' AND proj_mkt.cliente = '$cliente' AND proj_mkt.categoria = '$categoria' AND proj_mkt.subcategoria = '$subcategoria'");      
      $show->execute();
      $conta_projeto = $show->rowCount();
      if($conta_projeto>0){$reincidente = 1;}else{$reincidente = 0;}
      
      //INICIA PROCESSO DE GRAVAÇÃO DO PROJETO NA BASE DE DADOS
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `proj_mkt` (`nome_proj`, `cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `dias`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`) VALUES (:nome_proj, :cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :dias, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$projeto_sts');");
      $adc->bindParam(':nome_proj', $nome_proj);
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

      //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
      //if($tecnico>0 && $tecnico!= $user_id){
      //}
      
      if($adc->execute()){
        $projs_mkt = $pdo->lastInsertId();
        $mensagem = "<i class=\"fas fa-check\"></i> projeto cadastrado!";
        $mensagem_cor = "alert-success";
        $log = "true";
        
        //cadastra abertura do projeto na tabela de interatividade
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$projs_mkt', '$user_id', '$agora', '$inter_msg');");
        $adc->execute();
        
        //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
        //registra interação de direcionamento de projeto
        if($tecnico>0 && $tecnico!= $user_id){
          $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
          $show_tec->execute();
          $exibe=$show_tec->fetch(PDO::FETCH_ASSOC);
          $tecnico_nome = $exibe["user_nome"];            

          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projs_mkt', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome.')");
          $adc->execute();
        }        
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar projeto!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      } 
    }

    //EDITA A CATEGORIZAÇÃO DO PROJETO
    if ($action == "projeto_edt") {   
      $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_STRING);
        if($tipo==1){$projeto_tipo_nome="Falha";}
        if($tipo==2){$projeto_tipo_nome="Relacionamento";}
        if($tipo==3){$projeto_tipo_nome="Requisição de Serviços";}
        if($tipo==4){$projeto_tipo_nome="Requisição de informação";}
        if($tipo==5){$projeto_tipo_nome="Notificação de monitoramento";}
        if($tipo==0){$projeto_tipo_nome="Não informado";}          
      $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        $show_cat->execute();
        $row=$show_cat->fetch(PDO::FETCH_ASSOC);
        $projeto_cat_nome=$row["cat_nome"];
        
      $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        $show_scat->execute();
        $row=$show_scat->fetch(PDO::FETCH_ASSOC);
        $projeto_scat_nome=$row["scat_nome"];
        
      $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $show_dias = $pdo->prepare("SELECT proj_mkt.dias FROM proj_mkt WHERE proj_mkt.id = '$projs_mkt'");
        $show_dias->execute();
        $row=$show_dias->fetch(PDO::FETCH_ASSOC);
        $dias_nome=$row["dias"];
      // if($nivel==0){$projeto_nivel_nome="Não informado";}
     //  if($nivel==1){$projeto_nivel_nome="Arte";}
     //   if($nivel==2){$projeto_nivel_nome="AjusteI";}
     //   if($nivel==3){$projeto_nivel_nome="AjusteC";}  
    //    if($nivel==4){$projeto_nivel_nome="Texto";}
   //     if($nivel==5){$projeto_nivel_nome="Calendario";}
  //      if($nivel==6){$projeto_nivel_nome="Encarte";}
   //     if($nivel==7){$projeto_nivel_nome="Projetosn1";}
  //      if($nivel==8){$projeto_nivel_nome="Projetosn2";}
  //      if($nivel==9){$projeto_nivel_nome="Projetosn3";}
  //      if($nivel==10){$projeto_nivel_nome="Ses_fotos";}
  //      if($nivel==11){$projeto_nivel_nome="Edi_fotos";}
 //       if($nivel==12){$projeto_nivel_nome="Grav_video";}
    //    if($nivel==13){$projeto_nivel_nome="Edi_video";}
  //      if($nivel==14){$projeto_nivel_nome="Reuniao";}
      
      //BUSCA A CLASSIFICAÇÃO ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICAÇÃO
      $pdo = ConnectionN3();
      $show_projeto = $pdo->prepare("SELECT proj_mkt.`tipo`, proj_mkt.`categoria`, proj_mkt.`subcategoria`, proj_mkt.`dias`,
      categorias.cat_nome,
      subcategorias.scat_nome
      FROM proj_mkt 
      LEFT JOIN categorias ON categorias.cat_id = proj_mkt.categoria
      LEFT JOIN subcategorias ON subcategorias.scat_id = proj_mkt.subcategoria
      WHERE proj_mkt.id = '$projs_mkt'");
      $show_projeto->execute();
      $row=$show_projeto->fetch(PDO::FETCH_ASSOC);
      $projeto_tipo_original=$row["tipo"];
        if($projeto_tipo_original==1){$projeto_tipo_original_nome="Falha";}
        if($projeto_tipo_original==2){$projeto_tipo_original_nome="Relacionamento";}
        if($projeto_tipo_original==3){$projeto_tipo_original_nome="Requisição de Serviços";}
        if($projeto_tipo_original==4){$projeto_tipo_original_nome="Requisição de informação";}
        if($projeto_tipo_original==5){$projeto_tipo_original_nome="Notificação de monitoramento";}
        if($projeto_tipo_original==0){$projeto_tipo_original_nome="Não informado";}      
      $projeto_cat_original=$row["categoria"];
        $projeto_cat_original_nome=$row["cat_nome"];
      $projeto_scat_original=$row["subcategoria"];
        $projeto_scat_original_nome=$row["scat_nome"];
      $projeto_dias_original=$row["dias"];
        $projeto_dias=$row["dias"];
//        if($projeto_nivel_original==0){$projeto_nivel_original_nome="Não informado";}
//        if($projeto_nivel_original==1){$projeto_nivel_original_nome="Nível 1";}
//        if($projeto_nivel_original==2){$projeto_nivel_original_nome="Nível 2";}
//        if($projeto_nivel_original==3){$projeto_nivel_original_nome="Nível 3";}
//        if($projeto_nivel_original==4){$projeto_nivel_original_nome="Rotina";} 
      
      //COMPARA O TIPO DO PROJETO:
      //SE DIFERENTE:
      if($tipo!=$projeto_tipo_original){
        //ALTERA O CÓDIGO DO TIPO NA TABELA DE proj_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `tipo`='$tipo' WHERE `id`='$projs_mkt';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projs_mkt', '$user_id', '$agora', 'Editou o Tipo: <s>De: $projeto_tipo_original_nome</s> para $projeto_tipo_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
            $mensagem_cor = "alert-success";
          }
        }        
      }
      
      //COMPARA O(S) DIAS DO PROJETO:
      //SE DIFERENTE:
      if($dias!=$projeto_dias_original){
        //ALTERA O CÓDIGO DO NÍVEL NA TABELA DE proj_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `dias`='$dias' WHERE `id`='$projs_mkt';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projs_mkt', '$user_id', '$agora', 'Editou o(s) dia(s): <s>De: $projeto_dias_original</s> para $projeto_dias.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Dia(s) do projeto alterado!";
            $mensagem_cor = "alert-success";
          }
        }        
      }
      
      //COMPARA A CATEGORIA :
      //SE DIFERENTE:
      if($categoria!=$projeto_cat_original){
        //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE proj_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `categoria`='$categoria' WHERE `id`='$projs_mkt';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projs_mkt', '$user_id', '$agora', 'Editou a Categoria: <s>De: $projeto_cat_original_nome</s> para $projeto_cat_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
            $mensagem_cor = "alert-success";
          }
        }        
      }
      
      
      //COMPARA A SUBCATEGORIA :
      //SE DIFERENTE:
      if($subcategoria!=$projeto_scat_original){
        //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE proj_mkt
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `subcategoria`='$subcategoria' WHERE `id`='$projs_mkt';");
        if($adc->execute()){
          //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projs_mkt', '$user_id', '$agora', 'Editou a Sub Categoria: <s>De: $projeto_scat_original_nome</s> para $projeto_scat_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
            $mensagem_cor = "alert-success";
          }
        }        
      }

      
    }
    
    
//ACÕES DE GERENCIAMENTO DO PROJETO    
//TIPOS DE INTERATIVIDADE
//0 = Agendamento;
//1 = Abertura de projeto
//2 = Aceite de projeto
//3 = Devolução de projeto para fila
//4 = Transferência de projeto
//5 = Envio para espera
//6 = Retomada do projeto
//7 = Interação com o solicitante
//8 = Conclusão de projeto
//9 = Edição de classificação

    //REGISTRAR NOVA INTERAÇÃO
    if ($action == "projeto_new_inter") {
      $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_STRING);
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :projeto, '$user_id', '$agora', :inter_desc);");
      $adc->bindParam(':inter_desc', $inter_desc);
      $adc->bindParam(':projeto', $projs_mkt);
      if($adc->execute()){
         $mensagem = "<i class=\"fas fa-check\"></i> Interação cadastrada!";
         $mensagem_cor = "alert-success";
       }else{
         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
         $mensagem_cor = "alert-danger"; 
       } 
    }
    
    //USUÁRIO ACEITA INICIAR UM PROJETO
    if ($action == "projeto_aceitar") {
      $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
    //VERIFICA SE TECNICO ATRIBUÍDO É O PRÓPRIO USUÁRIO
      //SE VERDADEIRO:
      //1 - muda o status do projeto para 2 (projeto EM EXECUÇÃO)
      //2 - registra na tabela de interatividade que o usuário iniciou o projeto.
      if($tecnico==$user_id){ 
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$projs_mkt';");
        if($adc->execute()){
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$projs_mkt', '$user_id', '$agora', 'Iniciou o projeto.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Ótimo! <br> O status do projeto foi alterado para 'Em Execução'!";
            $mensagem_cor = "alert-success";
          }        
        }
      }
      //SE FALSO:
      //1 - mantem status do projeto como 1 (projeto AGUARDANDO EXECUÇÃO)
      //1 - registra na tabela de projeto o novo técnico responsável 
      //2 - busca o NOME do técnico responsável
      //3 - registra na tabela de interatividade a atribuição do chamando
      if($tecnico!=$user_id){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `tecnico`='$tecnico', `status`='1' WHERE  `id`='$projs_mkt';");
        if($adc->execute()){
          $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
          $show_tec->execute();
          $exibe=$show_tec->fetch(PDO::FETCH_ASSOC);
          $tecnico_nome = $exibe["user_nome"];            

          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projs_mkt', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome.')");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O projeto foi direcionado para $tecnico_nome.";
            $mensagem_cor = "alert-success";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto a outro técnico!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto a outro técnico!";
          $mensagem_cor = "alert-danger"; 
        }
      }        
    }
    
    //USUÁRIO RETOMA UM PROJETO
    if ($action == "projeto_retomar") {
      $pdo = ConnectionN3();
      
      //altera o status do projeto para 2 (Em execução)
      $edt= $pdo->prepare("UPDATE `proj_mkt` SET `status`='2' WHERE  `id`='$projs_mkt';");
      if($edt->execute()){
        //busca o ID do registro de espera, na tabela espera
        $show_espera = $pdo->prepare("SELECT espera_projeto.espera_id FROM espera WHERE espera_projeto.espera_projeto = '$projs_mkt' ORDER BY espera_projeto.espera_id DESC LIMIT 0,1");
        $show_espera->execute();
        $exibe=$show_espera->fetch(PDO::FETCH_ASSOC);
        $espera_id = $exibe["espera_id"]; 
        
        //registra A data hora final de espera, na tabela espera
        $edt_espera= $pdo->prepare("UPDATE `espera` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
        if($edt_espera->execute()){

          //insere o registro de uma nova interação 
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$projs_mkt', '$user_id', '$agora', 'Retomou o projeto.');");
          if($adc->execute()){
            $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interações com o cliente!";
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
         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao retomar o projeto!";
         $mensagem_cor = "alert-danger"; 
      } 
    }
    
    //USUÁRIO RECUSA UM PROJETO
    if ($action == "projeto_recusar") {
      $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
      $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_STRING);
    //VERIFICA SE O PROJETO FOI DIRECIONADO PARA OUTRO TÉCNICO
      //SE VERDADEIRO:
      //1 - muda o status do projeto para 1 (aguardando projeto)
      //1 - registra na tabela de projeto o novo técnico responsável 
      //2 - busca o NOME do técnico responsável
      //2 - registra na tabela de interatividade que o usuário direcionou o projeto.      
      if($tecnico!=0){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `tecnico`='$tecnico', `status`='1' WHERE `id`='$projs_mkt';");
        if($adc->execute()){
          
          $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
          $show_tec->execute();
          $exibe=$show_tec->fetch(PDO::FETCH_ASSOC);
          $tecnico_nome = $exibe["user_nome"];     
          
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projs_mkt', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome: <br> $inter_desc');");
          if($adc->execute()){
             $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> projeto direcionado para $tecnico_nome. <br> O que vamos fazer agora?";
             $mensagem_cor = "alert-warning";
          }        
        }else{
           $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto!";
           $mensagem_cor = "alert-danger"; 
        } 
      }
      //SE FALSO:
      //1 - muda o status do projeto para 1 (aguardando projeto)
      //1 - remove o técnico como responsável pelo projeto
      //2 - registra na tabela de interatividade que o usuário recusou o projeto.     
      if($tecnico==0){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("UPDATE `proj_mkt` SET `tecnico`='0', `status`='1' WHERE `id`='$projs_mkt';");
        if($adc->execute()){ 
          
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', '$projs_mkt', '$user_id', '$agora', 'Recusou o projeto: <br> $inter_desc');");
          if($adc->execute()){
             $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> projeto recusado. <br> O que vamos fazer agora?";
             $mensagem_cor = "alert-warning";
          }        
        }else{
           $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto!";
           $mensagem_cor = "alert-danger"; 
        } 
      }

    }
    
    //COLOCAR PROJETO EM ESPERA
    if ($action == "projeto_espera") {
      $espera_desc = filter_input(INPUT_POST, 'espera_desc', FILTER_SANITIZE_STRING);
      $espera_prev = filter_input(INPUT_POST, 'espera_prev', FILTER_SANITIZE_STRING);
      $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
      $pdo = ConnectionN3();
      //altera status do projeto para 3 (Em espera)
      $edt= $pdo->prepare("UPDATE `proj_mkt` SET `status`='3' WHERE  `id`='$projs_mkt';");
      if($edt->execute()){
        //insere registro de espera na tabela de espera
        $adc= $pdo->prepare("INSERT INTO `espera_projeto` (`espera_projeto`, `espera_start`, `espera_prev`, `espera_desc`, `espera_user`) VALUES ('$projs_mkt', '$agora', '$espera_prev', '$espera_desc', '$user_id');");
        if($adc->execute()){
          //insere registro da ação na tabela de interatividade
          $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$projs_mkt', '$user_id', '$agora', 'Colocou o projeto Em Espera. <br> Previsão de retorno: $espera_prev_br <br> Descrição: $espera_desc');");
          if($adc->execute()){
             $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O projeto foi colocado Em Espera.";
             $mensagem_cor = "alert-warning";
          }else{
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar projeto em espera!";
            $mensagem_cor = "alert-danger"; 
          }
        }else{
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tebale de espera!";
          $mensagem_cor = "alert-danger"; 
        } 
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do projeto!";
        $mensagem_cor = "alert-danger"; 
      }
    }
    
    //USUÁRIO FINALIZA UM PROJETO
    if ($action == "projeto_finalizar") {
      $desc_fechamento = filter_input(INPUT_POST, 'desc_fechamento', FILTER_SANITIZE_STRING);
      $pdo = ConnectionN3();
      $adc= $pdo->prepare("UPDATE `proj_mkt` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$projs_mkt';");
      $adc->bindParam(':desc_fechamento', $desc_fechamento);
      $adc->bindParam(':fechamento', $agora);
      if($adc->execute()){
        $pdo = ConnectionN3();
        $adc= $pdo->prepare("INSERT INTO `inter_proj_mkt` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$projs_mkt', '$user_id', '$agora', 'Finalizou o projeto. <br> Descrição: $desc_fechamento');");
        if($adc->execute()){
           $mensagem = "<i class=\"fas fa-check\"></i> Ótimo! <br> O que mais temos para hoje?!";
           $mensagem_cor = "alert-success";
        }        
      }else{
         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o projeto!";
         $mensagem_cor = "alert-danger"; 
      } 
    }
  }
}
?>
<?php 
// Verifica de existe o ID de um projeto setado.
// Se não houver, exibe a parte de CADASTRO proj_mkt
if (empty($projs_mkt)){ 
if($m8_01==0){header("Location: ../index.php");}  
  ?>
    <div class="container-fluid">
      <div class="row mt-2 justify-content-md-center">       
        <div class="col-12 col-sm-12 col-md-11 col-lg-10">
          <div class="card">
            <div class="h6 card-header">
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitações
            </div>
            <div class="card-body py-3">
              <form action="#" method="POST">                  
                <div class="form-row">
                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Cliente:</label>
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
                    <select name="local" id="local"  class="form-control form-control-sm" required="required" tabindex="3">
                      <option></option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row pt-2">
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Tipo de projeto:</label>
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
                      <input type="number" id="dias2" name="dias" min="1" max="999" class="form-control form-control-sm" required="required" tabindex="8">
                      
                  </div>
                </div>
                
                <div class="form-row pt-2">
                  
                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Nome do Projeto:</label>
                    <textarea name="nome_proj" class="form-control form-control-sm" rows="1" required="required" tabindex="9" ></textarea>
                  </div>
                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea name="desc_abertura" class="form-control form-control-sm" rows="1" required="required" tabindex="9" ></textarea>
                  </div>
                  
                  <div class="form-group col-sm-6 col-md-6">
                    <div class="form-row">
                      
                  <div class="form-group col-sm-12 col-md-6">
                    <label class="my-0 small">Técnico:</label>
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
                    <label class="my-0 small">Forma de projeto:</label>
                    <select name="forma" class="form-control form-control-sm" required="required" tabindex="11">
                      <option value="1">Remoto</option>
                      <option value="2">Presencial</option>
                    </select>
                  </div>
                  
                  <div class="form-group col-sm-12 col-md-6">
                    <label class="my-0 small">Abertura:</label>
                    <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i",strtotime($agora));?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                  </div>
                  
                  <div class="form-group col-sm-12 col-md-6 pt-3 text-center">
                    <input type="hidden" name="token" value="<?php echo $token;?>">
                    <input type="hidden" name="action" value="projeto_adc">
                    <button type="submit" class="btn btn-danger btn-sm p-1"><i class="fas fa-plus"></i> Iniciar projeto</button>
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
<!-- MODAL DE AJUDA PARA CADASTRO proj_mkt -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de projetos</h6>
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
      $ged_fd_folder = filter_input(INPUT_POST, 'ged_fd_folder', FILTER_SANITIZE_STRING);
      
      $pdo = ConnectionN3();      
      $adc= $pdo->prepare("INSERT INTO `ged_folder_mkt` (`ged_fd_cont`, `ged_fd_folder`, `ged_fd_dt`, `ged_fd_user`) VALUES (:inter_mkt, :ged_fd_folder, '$agora', '$user_id');");
      $adc->bindParam(':inter_mkt', $projs_mkt);
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
      $destino = '../docs_mkt/'.$file_url;
      // salva o arquivo na pasta 
      if(@move_uploaded_file($arquivo_tmp,$destino)){        
        //grava os dados do documento na tabela ged_file para gestão do documento
        $pdo = ConnectionN3();      
        $adc= $pdo->prepare("INSERT INTO `ged_file_mkt` (`ged_fl_folder`, `ged_fl_cont`, `ged_fl_name`, `ged_fl_ext`, `ged_fl_url`, `ged_fl_dt`, `ged_fl_user`) VALUES (:ged_fl_folder, :inter_mkt, :ged_fl_name, '$file_ext', '$file_url', '$agora', '$user_id');");
        $adc->bindParam(':inter_mkt', $projs_mkt);
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
// Verifica de existe o ID de um projeto setado.
// Se não houver, exibe a parte de CADASTRO DE projetos
if (isset($projs_mkt)){ ?>
<?php
//Busca informações do projeto

$pdo = ConnectionN3();
$show_projeto = $pdo->prepare("SELECT proj_mkt.`area`, proj_mkt.`tipo`, proj_mkt.`categoria`, proj_mkt.`subcategoria`, proj_mkt.`item`, proj_mkt.`local`, proj_mkt.`dias`, proj_mkt.forma, proj_mkt.desc_abertura, proj_mkt.desc_fechamento, proj_mkt.abertura, proj_mkt.fechamento, proj_mkt.reincidente, proj_mkt.`status`, proj_mkt.`tecnico`,
clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
categorias.cat_nome,
subcategorias.scat_nome,
itens.itens_nome,
usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
FROM proj_mkt 
INNER JOIN clientes ON clientes.clt_id = proj_mkt.cliente
LEFT JOIN pessoas ON pessoas.pessoa_id = proj_mkt.pessoa
LEFT JOIN locais ON locais.local_id = proj_mkt.`local`
LEFT JOIN categorias ON categorias.cat_id = proj_mkt.categoria
LEFT JOIN subcategorias ON subcategorias.scat_id = proj_mkt.subcategoria
LEFT JOIN itens ON itens.itens_id = proj_mkt.item
LEFT JOIN usuarios ON usuarios.user_id = proj_mkt.tecnico
WHERE proj_mkt.id = '$projs_mkt'");
$show_projeto->execute();
$row=$show_projeto->fetch(PDO::FETCH_ASSOC);
  $projeto_desc_abertura=$row["desc_abertura"];
  $projeto_desc_fechamento=$row["desc_fechamento"];
  $projeto_hora_abertura=$row["abertura"];
  $projeto_hora_fechamento=$row["fechamento"];
  $projeto_reincidente=$row["reincidente"];
  $projeto_status=$row["status"];
  $projeto_tipo=$row["tipo"];
    if($projeto_tipo==1){$projeto_tipo_nome="Falha";}
    if($projeto_tipo==2){$projeto_tipo_nome="Relacionamento";}
    if($projeto_tipo==3){$projeto_tipo_nome="Requisição de Serviços";}
    if($projeto_tipo==4){$projeto_tipo_nome="Requisição de informação";}
    if($projeto_tipo==5){$projeto_tipo_nome="Notificação de monitoramento";}
    if($projeto_tipo==0){$projeto_tipo_nome="Não informado";}
  $projeto_dias=$row["dias"];
//    if($projeto_nivel==5){$projeto_nivel_nome="1 dia";}
//    if($projeto_nivel==6){$projeto_nivel_nome="2 dias";}
//    if($projeto_nivel==7){$projeto_nivel_nome="5 dias";}
//    if($projeto_nivel==8){$projeto_nivel_nome="15 dias";}
//    if($projeto_nivel==9){$projeto_nivel_nome="30 dias";}
//    if($projeto_nivel==10){$projeto_nivel_nome="60 dias";}
//    if($projeto_nivel==11){$projeto_nivel_nome="90 dias";}

  $projeto_forma=$row["forma"];
  
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
  $projeto_cat=$row["categoria"];
  $projeto_item=$row["item"];
  $cat_nome=$row["cat_nome"];
  $projeto_scat=$row["subcategoria"];
  $scat_nome=$row["scat_nome"];
  $itens_nome=$row["itens_nome"];
  
  $tecnico_nome=$row["tecnico_nome"];
  $tecnico_id=$row["tecnico"];
  if($tecnico_id==0){$tecnico_nome = "Não Atribuído";}
  
  
  
//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);

//verifico se existe alguma requisição via post cahamda tarefa
$tarefa = filter_input(INPUT_POST, 'tarefa', FILTER_SANITIZE_NUMBER_INT);

if ($action == "alterar_senha") {include_once("../all/update_senha.php");}

if ($usar_token=="true") {
  if($action){
    if ($action == "new_tarefa") {
      $nome_tarefa = filter_input(INPUT_POST, 'nome_tarefa', FILTER_SANITIZE_STRING);
      $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_STRING);
      $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_STRING);
      $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_STRING);
      $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_STRING);
      $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
      $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_STRING);
      $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_STRING);
      $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_STRING);
      $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_STRING);
      //$abertura = date("Y-m-d H:i:s");
      $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_STRING);
      $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_STRING);
    

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
      $adc= $pdo->prepare("INSERT INTO `tarefas_mkt` (`id_projeto`,`nome_tarefa`, `cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`,`forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `dias`,`status`) VALUES (:id_projeto,:nome_tarefa, :cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', :dias,'$tarefa_sts');");
      $adc->bindParam(':nome_tarefa', $nome_tarefa);
      $adc->bindParam(':cliente', $cliente);
      $adc->bindParam(':pessoa', $pessoa);
      $adc->bindParam(':local', $local);
      $adc->bindParam(':tipo', $tipo);
      $adc->bindParam(':dias', $dias);
      $adc->bindParam(':categoria', $categoria);
      $adc->bindParam(':subcategoria', $subcategoria);
      $adc->bindParam(':item', $item);    
      $adc->bindParam(':forma', $forma);
      $adc->bindParam(':desc_abertura', $desc_abertura);
      $adc->bindParam(':abertura', $abertura);
      $adc->bindParam(':tecnico', $tecnico);
      $adc->bindParam(':id_projeto', $projs_mkt);
      
      

      //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
      //if($tecnico>0 && $tecnico!= $user_id){
      //}


      $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_STRING);
        if($dias==0){$tarefas_dias_n="Não informado";}
        if($dias==1){$atd_dias_nome="sla_n1";}
        if($dias==2){$atd_dias_nome="sla_n2";}
        if($dias==3){$atd_dias_nome="sla_n3";}
        if($dias==4){$atd_dias_nome="sla_n4";}
        if($dias==5){$atd_dias_nome="sla_n5";}
        if($dias==6){$atd_dias_nome="sla_n6";}
        if($dias==7){$atd_dias_nome="sla_n7";}
        if($dias==8){$atd_dias_nome="sla_n8";}
        if($dias==9){$atd_dias_nome="sla_n9";}
        if($dias==10){$atd_dias_nome="sla_n10";}
        if($dias==11){$atd_dias_nome="sla_n11";}
        if($dias==12){$atd_dias_nome="sla_n12";}
        if($dias==13){$atd_dias_nome="sla_n13";}
        if($dias==14){$atd_dias_nome="sla_n14";}
      
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
  }
}

?>
    <div class="container-fluid">
      <div class="row mt-2">
        <div class="col-md-3 px-1">
          
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-headset text-danger"></i> projeto #<?php echo str_pad($projs_mkt , 5 , '0' , STR_PAD_LEFT); ?>
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
                    <strong>Classificação do projeto:</strong>                   
                    </div>
<?php if($m3_01==3){ ?>
                    <div class="col-2 text-right">
                      <button type="button" class="btn btn-outline-secondary btn-sm small" data-toggle="modal" data-target="#projeto_edt"> <i class="far fa-edit"></i></button>
                    </div>
<?php } ?>
                  </div>
                </li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center">               
<?php if($projeto_forma==1){ ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> projeto Remoto <?php } ?>
<?php if($projeto_forma==2){ ?> <i class="fas fa-briefcase mr-2 text-danger"></i> projeto Presencial <?php } ?>
<span class="badge badge-warning ml-3"><?php echo $projeto_dias; ?> Dias<span> 
<?php if($projeto_reincidente==1){ ?> 
<i class=" ml-3 fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
<?php } ?>   
                </li>
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-archive mr-2"></i><?php echo $projeto_tipo_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-folder-open ml-3 mr-2"></i><?php echo $cat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-file-alt ml-5 mr-2 text-primary"></i><?php echo $scat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-list-ol ml-5 pl-4 mr-2"></i><?php echo $itens_nome; ?></li>
              </ul>
              
            
        <?php if($projeto_status==0){ ?>
                  <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Projeto Agendado </button>
<?php } ?>
<?php if($projeto_status==1){ ?>
                  <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="fas fa-hourglass-half"></i> Aguardando Execução </button>
<?php } ?>
<?php if($projeto_status==2){ ?>
                  <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Projeto em Execução </button>
<?php } ?>
<?php if($projeto_status==3){ ?>
                  <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Projeto em Espera </button>
<?php } ?>
<?php if($projeto_status==4){ ?>
                  <button type="button" class="btn btn-success btn-sm btn-block text-center text-dark"> <i class="fas fa-check"></i> Projeto Finalizado </button>
<?php } ?>


<?php
if($projeto_status==2){
  $exibe_bt_cont_new_tarefa=true;
}else{
  $exibe_bt_cont_new_tarefa=false;
}
 ?>
          <?php 
//ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

//SE NÃO HOUVER TÉCNICO ATRIBUÍDO PARA O PROJETO
if($tecnico_id==0){ $exibe_bt_projeto_aceitar=true; }

//SE O PROJETO ESTIVER AGUARDANDO E O USUÁRIO FOR O TÉCNICO
if($projeto_status==1 && $tecnico_id==$user_id){ $exibe_bt_projeto_aceitar=true; }

//SE O PROJETO ESTIVER EM ESPERA E O USUÁRIO FOR O TÉCNICO
if($projeto_status==3 && $tecnico_id==$user_id){ $exibe_bt_projeto_retomar=true; }

//SE O PROJETO ESTIVER EM EXECUÇÃO E O USUÁRIO FOR O TÉCNICO
if($projeto_status==2 && $tecnico_id==$user_id){ $exibe_bt_projeto_devolver=true; $exibe_bt_projeto_espera=true; $exibe_bt_projeto_finalizar=true; }

//ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM A PERMISSÃO DO USUÁRIO
if($m3_02==0){ $exibe_bt_projeto_aceitar=false; $exibe_bt_projeto_finalizar=false;}
if($m3_03==0){ $exibe_bt_projeto_espera=false; }
if($m3_04==0){ $exibe_bt_projeto_devolver=false; }


if($m3_05==2){ //se usuário com permissão para editar projetos de terceiros
  if($projeto_status==3){$exibe_bt_projeto_retomar=true;}
  $exibe_bt_projeto_devolver=true;
  if($projeto_status==2){$exibe_bt_projeto_espera=true;}
  if($projeto_status>1 && $projeto_status<4){$exibe_bt_projeto_finalizar=true;}
}

?>
<?php if($exibe_bt_projeto_interacao==true){ ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_new_inter"> <i class="fas fa-headset"></i> Nova Interação </button>
                </div>
<?php } ?>
<?php if($exibe_bt_projeto_aceitar==true){ ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_aceitar"> <i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar </button>
                </div>
<?php } ?>  
<?php if($exibe_bt_projeto_retomar==true){ ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_retomar"> <i class="far fa-arrow-alt-circle-down"></i> Retomar </button>
                </div>
<?php } ?>
<?php if($exibe_bt_projeto_espera==true){ ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_espera"> <i class="far fa-pause-circle"></i> Colocar em Espera </button>
                </div>
<?php } ?>
<?php if($exibe_bt_projeto_devolver==true){ ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_recusar"> <i class="far fa-arrow-alt-circle-up"></i> Recusar </button>
                </div>
<?php } ?>
<?php if($exibe_bt_projeto_finalizar==true){ ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_finalizar"> <i class="far fa-check-circle"></i> Finalizar </button>
                </div>
<?php } ?>    
<?php if($exibe_bt_cont_new_tarefa==true){ ?>
                  <div class="col-sm-12 px-1 py-1">
                     <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#new_tarefa"> <i class="fas fa-plus text-dark"></i> Adicionar Tarefa </button>
                  </div>
                  <?php } ?>
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

                </div>              
              </div>
            </div>
            <div class="card-body py-1">

              <div class="form-row">
                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Abertura:</label>
                  <input class="form-control form-control-sm" value="<?php echo date('d/m/y H:i', strtotime($projeto_hora_abertura)); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Prazo:</label>
                  <input class="form-control form-control-sm" value="<?php echo $time_limit_to_close = date("d/m/y H:i",strtotime($projeto_hora_abertura." +20 hours")); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                  <label class="my-0 small">Técnico:</label>
                  <input class="form-control form-control-sm" value="<?php echo $tecnico_nome; ?>" disabled="">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descrição de abertura:</label>
                  <textarea class="form-control form-control-sm" rows="4" disabled="" ><?php echo $projeto_desc_abertura; ?></textarea>
                </div>
              </div>
<?php if($projeto_status==4){ ?>
              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descrição de fechamento:</label>
                  <textarea class="form-control form-control-sm" rows="3" disabled="" ><?php echo $projeto_desc_fechamento; ?></textarea>
                </div>
              </div>
<?php } ?>
              <div class="row">
              </div>
              </div>
              
              
<?php 
//ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

//SE NÃO HOUVER TÉCNICO ATRIBUÍDO PARA O PROJETO
if($tecnico_id==0){ $exibe_bt_projeto_aceitar=true; }

//SE O PROJETO ESTIVER AGUARDANDO E O USUÁRIO FOR O TÉCNICO
if($projeto_status==1 && $tecnico_id==$user_id){ $exibe_bt_projeto_aceitar=true; }

//SE O PROJETO ESTIVER EM ESPERA E O USUÁRIO FOR O TÉCNICO
if($projeto_status==3 && $tecnico_id==$user_id){ $exibe_bt_projeto_retomar=true; }

//SE O PROJETO ESTIVER EM EXECUÇÃO E O USUÁRIO FOR O TÉCNICO
if($projeto_status==2 && $tecnico_id==$user_id){ $exibe_bt_projeto_devolver=true; $exibe_bt_projeto_espera=true; $exibe_bt_projeto_finalizar=true; }

//ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM A PERMISSÃO DO USUÁRIO
if($m3_02==0){ $exibe_bt_projeto_aceitar=false; $exibe_bt_projeto_finalizar=false;}
if($m3_03==0){ $exibe_bt_projeto_espera=false; }
if($m3_04==0){ $exibe_bt_projeto_devolver=false; }


if($m3_05==2){ //se usuário com permissão para editar projetos de terceiros
  if($projeto_status==3){$exibe_bt_projeto_retomar=true;}
  $exibe_bt_projeto_devolver=true;
  if($projeto_status==2){$exibe_bt_projeto_espera=true;}
  if($projeto_status>1 && $projeto_status<4){$exibe_bt_projeto_finalizar=true;}
}

?>
<!-- Será add nova sequência de tarefas -->
<?php
if (isset($_POST['f_sts'])) {$p_sts = $f_sts = $_POST['f_sts'];} else {$f_sts = 11;}
if ($f_sts == 10) {$p_sts = "0,1,2,3,4";}
if ($f_sts == 11) {$p_sts = "1,2,3";}

if (isset($_POST['f_sol'])) {$f_sol = $p_sol = $_POST['f_sol'];} else {$f_sol = $p_sol = 0;}
if ($f_sol == 0) {$p_sol = "%";}

if (isset($_POST['f_clt'])) {$f_clt = $p_clt = $_POST['f_clt'];} else {$f_clt = $p_clt = 0;}
if ($f_clt == 0) {$p_clt = "%"; $p_sol = "%";}

if (isset($_POST['f_tec'])) {$f_tec = $p_tec = $_POST['f_tec'];} else {$f_tec = $p_tec = "all";}
if ($f_tec == "all") {$p_tec = "%";}

if (isset($_POST['ord'])) {$ord = $_POST['ord'];} else {$ord = "cliente";}
if ($ord == "id"){$order_by = "tarefas_mkt.id ASC";}
if ($ord == "cliente"){$order_by = "clientes.clt_nomer ASC";}
if ($ord == "abertura"){$order_by = "tarefas_mkt.abertura ASC";}
if ($ord == "tecnico"){$order_by = "tecnico_nome ASC";}
if ($ord == "status"){$order_by = "tarefas_mkt.`status` ASC";}
if ($ord == "dias"){$order_by = "tarefas_mkt.`dias` DESC";}
if ($ord == "forma"){$order_by = "tarefas_mkt.`forma` DESC";}

//BUSCA INFORMAÇÕES DE CONFIGURAÇÃO DE TEMPO DE ATENDIMENTO
//$pdo = ConnectionN3();
//$show = $pdo->prepare("SELECT config_mkt.* FROM config_mkt");
//$show->execute();
//$row=$show->fetch(PDO::FETCH_ASSOC);
//$tempo_alerta=$row["tempo_alerta"];
//$sla_n1=$row["sla_n1"];
//$sla_n2=$row["sla_n2"];
//$sla_n3=$row["sla_n3"];
//$sla_n4=$row["sla_n4"];
//$sla_n5=$row["sla_n5"];
//$sla_n6=$row["sla_n6"];
//$sla_n7=$row["sla_n7"];
//$sla_n8=$row["sla_n8"];
//$sla_n9=$row["sla_n9"];
//$sla_n10=$row["sla_n10"];
//$sla_n11=$row["sla_n11"];
//$sla_n12=$row["sla_n12"];
//$sla_n13=$row["sla_n13"];
//$sla_n14=$row["sla_n14"];


?>



<?php
//BUSCA TODOS AS tarefas_mkt QUE ESTÃO AGENDADOS (STATUS = 0)
//COMPARA DATA HORA DO AGENDAMENTO COM DATA HORA ATUAL
//SE DATA HORA ATUAL MAIOR QUE DATA HORA DE AGENDAMENTO
//ALTERA O STATUS DO ATENDIMENTO PARA 1 (AGUARDANDO EXECUÇÃO)
//REGISTRA ALTERAÇÃO NA TABELA DE INTERATIVIDADE
$time_now = date("Y-m-d H:i:s");
$pdo = ConnectionN3();
$show_tarefas = $pdo->prepare("SELECT tarefas_mkt.id, tarefas_mkt.abertura, tarefas_mkt.id_projeto FROM tarefas_mkt WHERE tarefas_mkt.`status` = '0'");
$show_tarefas->execute();
while($exibe=$show_tarefas->fetch(PDO::FETCH_ASSOC)){
  $tarefa = $exibe["id"];
  $tarefas_agendamento = $exibe["abertura"];
  if(strtotime($time_now) > strtotime($tarefas_agendamento)){
    //altera o status do atendimento para 1 (Aguardando execução)
    $edt= $pdo->prepare("UPDATE `tarefas_mkt` SET `status`='1' WHERE  `id`='$tarefa';");
    if($edt->execute()){
      //insere o registro de uma nova interação 
      $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$tarefa', '1', '$time_now', 'Status do atendimento alterado automaticamente para Aguardando Execução.');");
      if($adc->execute()){
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
        $mensagem_cor = "alert-danger"; 
      }
    }
  }
}


?>


      
      <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <a href="#" data-toggle="collapse" data-target="#gcst" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
                <i class="fas fa-file-invoice-dollar"></i> Tarefas do Projeto <i class="icon-action fa fa-chevron-down"></i>
              </a>
            </div>            
            <div id="gcst">
              <div class="card-body p-0">
                <div class="col-12 border-bottom  ">
                  <div class="row py-2">
                   
             
    
            
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
                        <input type="hidden" name="ord" value="forma">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i></button>
                      </form>  
                    </th>
                    <th class="p-1">
                       
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                        <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                        
                    </th>
                    <th class="p-1">
                      <form action="#" method="POST">
                        
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                        <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                        <input type="hidden" name="ord" value="tecnico">
                        <button type="submit" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Técnico</button>
                      </form>                    
                    </th>
                    <th class="p-1">
                      <form action="#" method="POST">
                       
                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                        <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
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
$show_tarefas = $pdo->prepare("SELECT tarefas_mkt.id, tarefas_mkt.`id_projeto`, tarefas_mkt.`nome_tarefa`, tarefas_mkt.`tipo`, tarefas_mkt.`local`, tarefas_mkt.dias, tarefas_mkt.forma, tarefas_mkt.desc_abertura, tarefas_mkt.desc_fechamento, tarefas_mkt.abertura, tarefas_mkt.fechamento, tarefas_mkt.tecnico, tarefas_mkt.reincidente, tarefas_mkt.`status`,
clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
categorias.cat_nome,
subcategorias.scat_nome,
itens.itens_nome,
usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
FROM tarefas_mkt
INNER JOIN clientes ON clientes.clt_id = tarefas_mkt.cliente
LEFT JOIN pessoas ON pessoas.pessoa_id = tarefas_mkt.pessoa
LEFT JOIN proj_mkt ON proj_mkt.id = id_projeto
LEFT JOIN locais ON locais.local_id = tarefas_mkt.`local`
LEFT JOIN categorias ON categorias.cat_id = tarefas_mkt.categoria
LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas_mkt.subcategoria
LEFT JOIN itens ON itens.itens_id = tarefas_mkt.item
LEFT JOIN usuarios ON usuarios.user_id = tarefas_mkt.tecnico
WHERE tarefas_mkt.id_projeto = $projs_mkt
AND clientes.clt_id LIKE '$p_clt'
AND tarefas_mkt.tecnico LIKE '$p_tec'  
AND tarefas_mkt.pessoa LIKE '$p_sol'  
ORDER BY $order_by
");
$show_tarefas->execute();
while($row=$show_tarefas->fetch(PDO::FETCH_ASSOC)){
  $tarefa=$row["id"];
  $id_projeto=$row["id_projeto"];
  $nome_tarefa=$row["nome_tarefa"];
  $tarefas_desc_abertura=$row["desc_abertura"];
  $tarefas_desc_fechamento=$row["desc_fechamento"];
  $tarefas_hora_abertura=$row["abertura"];
  $tarefas_hora_fechamento=$row["fechamento"];
  $tarefas_reincidente=$row["reincidente"];
  $tarefas_status=$row["status"];
  $tarefas_tipo=$row["tipo"];
    if($tarefas_tipo==1){$tarefas_tipo="Falha";}
    if($tarefas_tipo==2){$tarefas_tipo="Requisição de Serviços";}
    if($tarefas_tipo==3){$tarefas_tipo="Requisição de informação";}
    if($tarefas_tipo==4){$tarefas_tipo="Notificação de monitoramento";}
    if($tarefas_tipo==0){$tarefas_tipo="Não informado";}
  $tarefas_dias=$row["dias"];
   // if($tarefas_dias==0){$tarefas_diasn="Não informado"; $sla = $sla_n1;}
  //  if($tarefas_dias==1){$tarefas_diasn="Arte"; $sla = $sla_n1;}
    //if($tarefas_dias==2){$tarefas_diasn="AjusteI"; $sla = $sla_n2;}
    //if($tarefas_dias==3){$tarefas_diasn="AjusteC"; $sla = $sla_n3;}
    //if($tarefas_dias==4){$tarefas_diasn="Texto"; $sla = $sla_n4;}
    //if($tarefas_dias==5){$tarefas_diasn="Calendario"; $sla = $sla_n5;}
    //if($tarefas_dias==6){$tarefas_diasn="Encarte"; $sla = $sla_n6;}
    //if($tarefas_dias==7){$tarefas_diasn="Projetosn1"; $sla = $sla_n7;}
    //if($tarefas_dias==8){$tarefas_diasn="Projetosn2"; $sla = $sla_n8;}
    //if($tarefas_dias==9){$tarefas_diasn="Projetosn3"; $sla = $sla_n9;}
    //if($tarefas_dias==10){$tarefas_diasn="Ses_fotos"; $sla = $sla_n10;}
    //if($tarefas_dias==11){$tarefas_diasn="Edi_fotos"; $sla = $sla_n11;}
    //if($tarefas_dias==12){$tarefas_diasn="Grav_video"; $sla = $sla_n12;}
    //if($tarefas_dias==13){$tarefas_diasn="Edi_video"; $sla = $sla_n13;}
    //if($tarefas_dias==14){$tarefas_diasn="Reuniao"; $sla = $sla_n14;}

  
  $tarefas_forma=$row["forma"];
    
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
  
  $cat_nome=$row["cat_nome"];
  $scat_nome=$row["scat_nome"];
  $itens_nome=$row["itens_nome"];
  
  $tecnico=$row["tecnico"];
  $tecnico_nome=$row["tecnico_nome"];
  if($tecnico==0){$tecnico_nome = "Não direcionado";}
          
  //TIME TO CLOSE
  //calcula hora limite para o fechamento do atendimento: Abertura + SLA
    $time_limit_to_close = date("Y-m-d H:i:s",strtotime($tarefas_hora_abertura." + minutes"));
  //hora atual
    $time_now = date("Y-m-d H:i:s");
    $start_date = new DateTime($time_now);
    $end_date = new DateTime($time_limit_to_close);
  
  //TRABALHA O TEMPO DE ESPERA
    //SOMA TEMPO TOTAL EM QUE O PROJETO FICOU EM ESPERA
    $pdo = ConnectionN3();
    $show_espera = $pdo->prepare("SELECT SUM(TIMESTAMPDIFF(SECOND, espera_start, espera_end)) AS segundos FROM espera WHERE espera.espera_atd = '$tarefa'");
    $show_espera->execute();
    $conta_espera = $show_espera->rowCount();
    $exibe_espera=$show_espera->fetch(PDO::FETCH_ASSOC);
    $espera_tempo_total=$exibe_espera["segundos"];
    //SE NÃO TIVER RETORNO, ATRIBUI 0 SEGUNDOS AO TEMPO DE ESPERA
    if($espera_tempo_total==""){$espera_tempo_total=0;}
    //SOMA O TEMPO TOTAL DE ESPERA AO PRAZO PARA O FECHAMENTO DO ATENDIMENTO
    $end_date0 = date("Y-m-d H:i:s",strtotime($time_limit_to_close." +$espera_tempo_total SECOND"));
    $end_date = new DateTime($end_date0);
    
  //SE ATENDIMENTO ESTIVER EM ESPERA
  //BUSCA A DATA HORA QUE FOI COLOCADO EM ESPERA
  //BUSCA A DATA HORA QUE ELE DEVE VOLTAR PARA O ATENDIMENTO
  if($tarefas_status==3){
    $pdo = ConnectionN3();
    $show_espera = $pdo->prepare("SELECT espera.espera_start, espera.espera_prev FROM espera_tarefas WHERE espera.espera_tarefas = '$tarefa' ORDER BY espera_id DESC LIMIT 0,1");
    $show_espera->execute();
    $exibe_espera=$show_espera->fetch(PDO::FETCH_ASSOC);
    $espera_start=$exibe_espera["espera_start"];
    $espera_prev=$exibe_espera["espera_prev"];
    
    //VERIFICA DE DATA HORA ATUAL FOR MAIOR DO QUE DATA HORA PREVISTA PARA RETOMADA
    //SE POSITIVO:
    if(strtotime($time_now) > strtotime($espera_prev)){
    //MUDA STATUS DO PEDIDO PARA 2 (EM EXECUÇÃO)
    //ALTERA A INFORMAÇÃO DE ESPERA NA TABELA DE ESPERAS
    //INSERE REGISTRO DE INTERAÇÃO NA TABELA DE INTERAÇÃO
      $pdo = ConnectionN3();
      
      //altera o status do atendimento para 2 (Em execução)
      $edt= $pdo->prepare("UPDATE `tarefas_mkt` SET `status`='2' WHERE  `id`='$tarefa';");
      if($edt->execute()){
        //busca o ID do registro de espera, na tabela espera
        $show_espera = $pdo->prepare("SELECT espera.espera_id FROM espera_tarefas WHERE espera.espera_tarefas = '$tarefa' ORDER BY espera.espera_id DESC LIMIT 0,1");
        $show_espera->execute();
        $exibe=$show_espera->fetch(PDO::FETCH_ASSOC);
        $espera_id = $exibe["espera_id"]; 
        
        //registra A data hora final de espera, na tabela espera
        $edt_espera= $pdo->prepare("UPDATE `espera` SET `espera_end`='$time_now' WHERE `espera_id`='$espera_id';");
        if($edt_espera->execute()){

          //insere o registro de uma nova interação 
          $adc= $pdo->prepare("INSERT INTO `inter_tarefa_mkt` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$tarefa', '1', '$time_now', 'Status do atendimento alterado automaticamente para Em Execução.');");
          if($adc->execute()){
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
      
      
    }else{
    //SE NEGATIVO:
    //DEFINE A DATA HORA DO INÍCIO DA ESPERA COMO A DATA HORA ATUAL PARA CALCULAR QUANTO TEMPO FALTA PARA ENCERRAR O PRAZO DE PROJETO
      $time_now = $espera_start;
      $start_date = new DateTime($espera_start);
    }
  }    

  
  //verifica se ainda existe prazo para atendimento
  if($start_date<$end_date){
  //calcula a diferença entre o prazo de fechamento e a hora atual
    $interval = $start_date->diff($end_date);
    $hours   = $interval->format('%h'); 
    $minutes = $interval->format('%i');
    $progress_color = "blue";
    $tag = $hours."h ".$minutes."m";
  //calcula o tamanho da barra de progresso do chamado
    $minutos_restantes = $hours * 60 + $minutes;
    $progress_width = (110-($minutos_restantes/180*100));
    if($progress_width>92){$progress_color = "orange"; }
  } else { 
    $progress_color = "orange";
    $progress_width = "100";
    $tag = "Vencido";
  }
  //se atendimento concluído
  if($tarefas_status==4){
    $progress_color = "green";
    $progress_width = "100";
    $tag = "ok";
  }
  
  //BUSCA A ÚLTIMA INTERAÇÃO QUE HOUVE NO CHAMADO
  $pdo = ConnectionN3();
  $show_inter = $pdo->prepare("SELECT inter_tarefa_mkt.inter_data FROM inter_tarefa_mkt WHERE inter_tarefa_mkt.inter_tarefa = '$tarefa' AND inter_tarefa_mkt.inter_tipo > '0' ORDER BY inter_id DESC LIMIT 0,1");
  $show_inter->execute();
  $exibe_inter=$show_inter->fetch(PDO::FETCH_ASSOC);
  $last_inter_data=$exibe_inter["inter_data"];
  $end_date = new DateTime($time_now);
  $start_date = new DateTime("$last_inter_data");
  $interval = $start_date->diff($end_date);
  $hours   = $interval->format('%h'); 
  $minutes = $interval->format('%i');
  $time_last_inter = $hours * 60 + $minutes;
  
?>
                  <tr>
                    
                    <td class="align-middle">
                      <strong><?php echo substr($nome_tarefa, 0, 35); ?></strong><br>
                      <?php echo substr($clt_nomer, 0, 35); ?>
                      <?php if($pessoa_nom!=""){ ?> <br> <i class="far fa-user mr-1"></i> <?php echo $pessoa_nom; }?>
                    </td>
                    <td class="align-middle text-center">
                      <?php echo $dt1 = date('d/m/y', strtotime($tarefas_hora_abertura));?>
                      <br>
                      <?php echo $dt1 = date('H:i', strtotime($tarefas_hora_abertura));?> h
                    </td>
                    <td>
                      <?php echo $cat_nome;?> <br/> <?php echo $scat_nome;?> <br/> <?php echo $itens_nome;?>
                   
                    <th class="align-middle">
<?php if($tarefas_forma==1){ ?> <i class="fas fa-laptop-house text-primary" title="Remoto"></i> <?php } ?>
<?php if($tarefas_forma==2){ ?> <i class="fas fa-briefcase text-danger" title="Presencial"></i> <?php } ?>
                    </th>                    
                    <td class="align-middle">
                    </td>
                    <td class="align-middle">
<?php //se atendimento aberto e com mais de 20 minutos sem interação, mostra sino piscando
if($tarefas_status>0 && $tarefas_status<3){ ?>                      
                      
<?php } ?>
                      <?php echo $tecnico_nome; ?>
                    </td>
                    <td class="align-middle">
<?php if($tarefas_status==0){ ?>
                      <i class="far fa-clock"></i> Agendado 
<?php } ?>
<?php if($tarefas_status==1){ ?>
                       <i class="fas fa-hourglass-half"></i> Aguardando
<?php } ?>
<?php if($tarefas_status==2){ ?>
                      <i class="fas fa-magic"></i> Em Execução
<?php } ?>
<?php if($tarefas_status==3){ ?>
                      <i class="far fa-pause-circle"></i> Em Espera
<?php } ?>
<?php if($tarefas_status==4){ ?>
                      <i class="fas fa-check"></i> Finalizada
<?php } ?>                    
                    </td>
                    <td class="align-middle p-1">
                      <form action="tarefa.php" method="POST">
                        <input type="hidden" name="tarefa" value="<?php echo $tarefa;?>">
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
        <div class="card mt-3">
            <div class="card-header py-1 h6 pt-2 pb-2">                
              <a href="#" data-toggle="collapse" data-target="#gdoc" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
                <i class="fas fa-file-invoice"></i> Gestão de Documentos do projeto <i class="icon-action fa fa-chevron-down"></i>
              </a>
            </div>
            <!-- MODAL GED NOVA PASTA-->

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
$show_folder = $pdo->prepare("SELECT ged_folder_mkt.* FROM ged_folder_mkt WHERE ged_folder_mkt.ged_fd_cont = '$projs_mkt' AND ged_folder_mkt.ged_fd_sts = '2' ORDER BY ged_folder_mkt.ged_fd_folder ASC");
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
                                <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
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
                                  Nenhuma pasta criada para este projeto.
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
                                      <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">                                      
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
                                      <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">                                      
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
                        </div>
                        </div>
        </div>
        </div>
        <div class="col-md-3 px-1">
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-list-ol"></i> Histórico do projeto  #<?php echo str_pad($projs_mkt , 5 , '0' , STR_PAD_LEFT); ?>
            </div>
            <div class="card-body">
              
                <div class="timeline">
<?php 
$pdo = ConnectionN3();
$show_inter = $pdo->prepare("SELECT inter_proj_mkt.*, usuarios.user_nome FROM inter_proj_mkt INNER JOIN usuarios ON usuarios.user_id = inter_proj_mkt.inter_user WHERE inter_proj_mkt.inter_projeto = '$projs_mkt' AND inter_proj_mkt.inter_tipo > '0' ORDER BY inter_id DESC");
$show_inter->execute();
while($exibe=$show_inter->fetch(PDO::FETCH_ASSOC)){
$inter_tipo=$exibe["inter_tipo"];
$inter_data=$exibe["inter_data"];
$inter_desc=$exibe["inter_desc"];
$inter_user=$exibe["user_nome"];
  
//define cores de acordo com o tipo da interatividade
if($inter_tipo==1){$tl_dot_color = "b-primary"; $tl_active_color = "active-primary";}//1 = Abertura de Projeto
if($inter_tipo==2){$tl_dot_color = "b-success"; $tl_active_color = "active-success";}//2 = Aceite de Projeto
if($inter_tipo==3){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//3 = Devolução de Projeto
if($inter_tipo==4){$tl_dot_color = "b-warning"; $tl_active_color = "active-warning";}//4 = Transferência de Atendim
if($inter_tipo==5){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//5 = Envio para espera
if($inter_tipo==6){$tl_dot_color = "b-primary"; $tl_active_color = "active-primary";}//6 = Retomada do Projeto
if($inter_tipo==7){$tl_dot_color = "b-primary"; $tl_active_color = "active-primary";}//7 = Interação com o solicita
if($inter_tipo==8){$tl_dot_color = "b-success"; $tl_active_color = "active-success";}//8 = Conclusão de Projeto
if($inter_tipo==9){$tl_dot_color = "b-danger"; $tl_active_color = "active-danger";}//9 = Edição da classificação do Projeto
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
<div class="modal fade" id="projeto_new_inter" tabindex="-1" role="dialog">
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="projeto_new_inter">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
        </div>
      </form>
    </div>
  </div>
</div>


<!-- MODAL EDIÇÃO DA CLASSIFICAÇÃO DO PROJETO-->
<div class="modal fade" id="projeto_edt" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição da classificação do projeto</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
                <div class="form-row pt-2">
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Tipo de projeto:</label>
                    <select name="tipo" class="form-control form-control-sm" required="required" tabindex="4">
                      <option></option>
                      <option value="1"<?php if($projeto_tipo==1){ echo" selected";}?>>Falha</option>
                      <option value="2"<?php if($projeto_tipo==2){ echo" selected";}?>>Relacionamento</option>
                      <option value="3"<?php if($projeto_tipo==3){ echo" selected";}?>>Requisição de Serviços</option>
                      <option value="4"<?php if($projeto_tipo==4){ echo" selected";}?>>Requisição de informação</option>
                      <option value="5"<?php if($projeto_tipo==5){ echo" selected";}?>>Notificação de monitoramento</option>
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
                      <option value="<?php echo $cat_id; ?>" <?php if($cat_id==$projeto_cat){ echo" selected";}?>><?php echo $cat_nome;?></option>
<?php } ?>
                    </select>
                  </div>

<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Sub Categoria:</label>
                    <span class="carregando3 small">Aguarde, carregando...</span>
                    <select name="subcategoria" id="subcategoria"  class="form-control form-control-sm" required="required" tabindex="6">
                      <option value="<?php echo $projeto_scat; ?>"><?php echo $scat_nome; ?></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Dias:</label>
                      <input type="number" id="dias" name="dias" min="1" max="999" class="form-control form-control-sm" required="required" tabindex="7">
                  </div>
                </div>
        </div>
        <div class="modal-footer">
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="projeto_edt">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Editar</button>
        </div>
      </form>
    </div>
  </div>
</div>
    
<?php if($exibe_bt_projeto_aceitar==true){ ?>
<!-- MODAL ACEITE DO CHAMADO -->
<div class="modal fade" id="projeto_aceitar" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down text-success"></i> Iniciar projeto ou direcionar para outro Técnico</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <label class="small"><strong>Iniciar o projeto:</strong></label>
          <label class="small">Se o técnico informado for o próprio usuário: a) este projeto ficará sob sua responsabilidade; b) o status do projeto será alterado para "Em execução".</label>
          <label class="small pt-1"><strong>Direcionar a outro técnico:</strong></label>
          <label class="small">Se o técnico informado NÃO for o próprio usuário: a) este projeto será redirecionado para a fila de projetos do técnico informado; b) este projeto contuará com o status "Aguardando projeto" até que o técnico responsável confirme o início da execução.</label>
          <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Técnico responsável:</label>
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="projeto_aceitar">        
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_projeto_retomar==true){ ?>
<!-- MODAL RETOMAR PROJETO -->
<div class="modal fade" id="projeto_retomar" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down"></i> Retomar</h6>
        <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <label class="small">Confirmação de retomada do projeto.</label>
        <label class="small">Este projeto estava aguardando o retorno de um terceiro. Ao retomar este projeto ele ficará sob sua responsabilidade. Não esqueça de informar todas as interação com o cliente.</label>
      </div>
      <div class="modal-footer">
        <form action="#" method="POST">
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="projeto_retomar">        
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-success">Retomar o projeto</button>
        </form>
      </div>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_projeto_espera==true){ ?>
<!-- MODAL COLOCAR EM ESPERA -->
<div class="modal fade" id="projeto_espera" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"><i class="far fa-pause-circle text-warning"></i> Colocar projeto em espera</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <label class="small">projetos em Espera são aqueles que não podem ser finalizados pois é preciso aguardar um retorno de alguém <b> externo </b> a Nível 3 TI.</label> 
          <label class="small">Ao colocar em espera: a) este projeto continuará sob a sua responsabilidade; b) o status do projeto será alterado para "Em espera"; c) Após o período de espera, o status do projeto será alterado para "Em Execução".</label>
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="projeto_espera">        
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-success">Colocar em espera</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_projeto_devolver==true){ ?>
<!-- MODAL RECUSAR PROJETO -->
<div class="modal fade" id="projeto_recusar" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"><i class="far fa-arrow-alt-circle-up text-danger"></i> Recusar ou direcionar projeto</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">        
            <label class="small"><strong>Recusar projeto:</strong></label>
            <label class="small">Ao confirmar esta tela SEM informar um técnico: a) o projeto voltará para a fila de projeto sem um responsável; b) este projeto contuará com o status "Aguardando projeto" até que um técnico o aceite.</label>
            <label class="small pt-1"><strong>Direcionar projeto:</strong></label>
            <label class="small">Ao confirmar esta tela informando um técnico responsável: a) este projeto será redirecionado para a fila de projetos do técnico informado; b) este projeto contuará com o status "Aguardando projeto" até que o técnico responsável confirme o início da execução.</label>
            <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
          </div>
          <div class="form-row">        
            <div class="form-group col-sm-12">
              <label class="my-0 small">Técnico responsável:</label>
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="projeto_recusar">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-danger">Recusar projeto</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php } ?>

<?php if($exibe_bt_projeto_finalizar==true){ ?>
<!-- MODAL FINALIZAR PROJETO -->
<div class="modal fade" id="projeto_finalizar" tabindex="-1" role="dialog">
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="projeto_finalizar">
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
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
$show_folder = $pdo->prepare("SELECT ged_folder_mkt.* FROM ged_folder_mkt WHERE ged_folder_mkt.ged_fd_cont = '$projs_mkt' AND ged_folder_mkt.ged_fd_sts = '2' ORDER BY ged_folder_mkt.ged_fd_folder ASC");
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
          <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <input type="hidden" name="action" value="ged_new_file">
          <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
          <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<!-- MODAL NOVA TAREFA -->
<div class="modal fade" id="new_tarefa" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"> <i class="fas fa-plus text-danger"></i> Cadastro de solicitação de tarefa</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body py-1">
          <div class="form-row pt-2">
            <div class="form-group col-sm-6 col-md-6">


              
            </div>
            
            <div class="card-body py-3">
              <form action="#" method="POST">
                <div class="form-row">
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Selecione o Projeto:</label>
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
                      <option value="<?php echo $cliente; ?>"><?php echo $nome_proj;?> </option>
                      
<?php } ?>
                    
                    </select>
                  </div>
                  
        
       <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
       <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Solicitante:</label>
                    <span class="carregando small">Carregando...</span>
                    <select name="solicitante" id="solicitante2"  class="form-control form-control-sm" required="required" tabindex="2">
                    
                    <option></option>
                    </select>
                  </div>

<!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Local:</label>
                    <span class="carregando2 small">Carregando...</span>
                    <select name="local" id="local2" class="form-control form-control-sm" required="required" tabindex="3">
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
                    <select name="categoria" id="categoria2"  class="form-control form-control-sm" required="required" tabindex="5">
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
                    <select name="subcategoria" id="subcategoria2"  class="form-control form-control-sm" required="required" tabindex="6">
                      <option></option>
                    </select>
                  </div>

<!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Item:</label>
                    <span class="carregando4 small">Aguarde, carregando...</span>
                    <select name="item" id="item2"  class="form-control form-control-sm" required="required" tabindex="7">
                      <option></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Tarefa:</label>
                    <select name="dias" class="form-control form-control-sm" required="required" tabindex="8">
                      <option></option>
                      <option value="1">Arte</option>
                      <option value="2">Ajuste Img</option>
                      <option value="3">Ajuste Card</option>
                      <option value="4">Texto</option>
                      <option value="5">Calendario</option>
                      <option value="6">Encarte</option>
                      <option value="7">Projetos N1</option>
                      <option value="8">Projetos N2</option>
                      <option value="9">Projetos N3</option>
                      <option value="10">Sessão de Fotos</option>
                      <option value="11">Edição de Fotos</option>
                      <option value="12">Gravação de Vídeos</option>
                      <option value="13">Edição de Vídeos</option>
                      <option value="14">Reunião</option>
                      <option value="0">NA</option>
                    </select>
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
                    <label class="my-0 small">Técnico:</label>
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
                    </select>
                  </div>
                  
                  <div class="form-group col-sm-12 col-md-6">
                    <label class="my-0 small">Abertura:</label>
                    <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i",strtotime($agora));?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                  </div>
                  </div>
                  <div class="modal-footer">
                  <input type="hidden" name="projeto" value="<?php echo $projs_mkt; ?>">
                    <input type="hidden" name="token" value="<?php echo $token;?>">
                    <input type="hidden" name="action" value="new_tarefa">
                    </div>
                    <button type="submit" class="btn btn-danger btn-sm p-1"><i class="fas fa-plus"></i>Adicionar Tarefa</button>
                    
                    <button type="button" class="btn btn-sm btn-secondary " data-dismiss="modal"  aria-label="Fechar">Fechar</button>
                    
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
    <?php } ?>
</div>
</div>
<!-- MODAL DE AJUDA PARA A GESTÃO DE UM PROJETO -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Gestão do projeto</h6>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>

      <div class="modal-body">
        <p><strong>O projeto deve ser gerido da seguinte forma:</strong></p>
        <ul class="list">
          <li>Registre tudo através de <span class="badge badge-light"><i class="fas fa-headset"></i> Nova Interação </span>
            <ul>
              <li class="small">Comentários do cliente, informações que você observar e o trabalho que você executou devem ser registrados.</li>
              <li class="small">Cada registro que você fizer será exibido no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do projeto</span> com a data/hora e o seu nome.</li>
            </ul>
          </li>
          <li class="pt-1">Iniciei a execução do projeto através do <span class="badge badge-light"><i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar</span>
            <ul>
              <li class="small">Se você for o técnico que executará o projeto, apenas confirme o seu nome como <em>Técnico Resposável</em>.</li>
              <li class="small">Quando você confirmar seu nome como <em>Técnico Resposável</em> pelo projeto outras opções de gestão do projeto aparecerão na sua tela.</li>
              <li class="small">Se não for você quem executará o projeto, você pode também informar quem será o técnico que deverá executar o projeto.</li>
              <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do projeto</span> com a data/hora e o seu nome.</li>
            </ul>
          </li>
          <li class="pt-1">Você pode usar o recurso <span class="badge badge-light"><i class="far fa-pause-circle"></i> Colocar em Espera</span> caso o projeto precise ser <em>pausado</em> enquanto aguarda um retorno externo.
            <ul>
              <li class="small">Mas, este recurso só deve ser utilizado quando estamos aguardando um retorno de alguém externo a Nível 3 TI.</li>
              <li class="small">Você precisará informar uma Data/Hora futura como previsão para encessamento da espera.</li>
              <li class="small">Quando você colocar um projeto em espera o prazo para finalizar será <em>pausado</em>.</li>
              <li class="small">Quando o prazo estabelecido <em>vencer</em> o projeto voltará para o status <span class="badge badge-light"><i class="fas fa-magic"></i> Em Execução</span>.</li>
            </ul>
          </li>
          <li class="pt-1">Você pode usar o recurso <span class="badge badge-light"><i class="far fa-arrow-alt-circle-up"></i> Recusar</span> para <em>devolver</em> o projeto a fila de espera ou tranferí-lo para outro técnico.
            <ul>
              <li class="small">Para fazer isso, você terá que inserir uma justificativa.</li>
              <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do projeto</span> com a data/hora e o seu nome.</li>
            </ul>
          </li>
          <li class="pt-1">Você deve <span class="badge badge-light"><i class="far fa-check-circle"></i> Finalizar</span> o projeto quando o problema do cliente for sanado.
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

<?php if(empty($projs_mkt) || $exibe_bt_projeto_espera==true){ ?>    
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
<?php  if(empty($projs_mkt)){ ?>      
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
            $('#solicitante').html('<option value="">– Escolha o Solicitante –</option>');
            $('#local').html('<option value="">– Escolha o Local –</option>');
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
            $('#subcategoria').html('<option value="">– Escolha a Subcategoria –</option>');
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
            $('#item').html('<option value="">– Escolha o Item –</option>');
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
<!--Emanuel-->
<!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
<script src="../js/loader.js" type="text/javascript"></script>
<?php  if(empty($new_tarefa)){ ?>      
    <script type="text/javascript">
      //pupula os selects solicitante e local de acordo com o cliente escolhido
      $(function(){
        $('#cliente').change(function(){
          if( $(this).val() ) {
            $('#solicitante2').hide();
            $('#local2').hide();
            $('.carregando').show();
            $('.carregando').show();
            $.getJSON('busca_solicitantes.php?search=',{cliente: $(this).val(), ajax: 'true'}, function(j){
              var options = '<option value="">Escolha o solicitante</option>';	
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }	
              $('#solicitante2').html(options).show();
              $('.carregando').hide();
            });
            $.getJSON('busca_locais.php?search=',{cliente: $(this).val(), ajax: 'true'}, function(j){
              var options = '<option value="">Escolha o local</option>';	
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }	
              $('#local2').html(options).show();
              $('.carregando2').hide();
            });
          } else {
            $('#solicitante2').html('<option value="">– Escolha o Solicitante –</option>');
            $('#local2').html('<option value="">– Escolha o Local –</option>');
          }
        });
      });
    </script>
<?php }?>    
    <script type="text/javascript">
      //pupula os selects subcategoria de acordo com a categoria escolhida
      $(function(){
        $('#categoria2').change(function(){
          if( $(this).val() ) {
            $('#subcategoria2').hide();
            $('.carregando3').show();
            $.getJSON('busca_subcategorias.php?search=',{categoria: $(this).val(), ajax: 'true'}, function(j){
              var options = '<option value="">Escolha a Subcategoria</option>';	
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }	
              $('#subcategoria2').html(options).show();
              $('.carregando3').hide();
            });
            
          } else {
            $('#subcategoria2').html('<option value="">– Escolha a Subcategoria –</option>');
          }
        });
      });
</script>
    <script type="text/javascript">
      //pupula os selects ITEM de acordo com a SUBcategoria escolhida
      $(function(){
        $('#subcategoria2').change(function(){
          if( $(this).val() ) {
            $('#item2').hide();
            $('.carregando4').show();
            $.getJSON('busca_itens.php?search=',{subcategoria: $(this).val(), ajax: 'true'}, function(j){
              var options = '<option value="">Escolha o Item</option>';	
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }	
              $('#item2').html(options).show();
              $('.carregando4').hide();
            });
          } else {
            $('#item2').html('<option value="">– Escolha o Item –</option>');
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