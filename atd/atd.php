<?php

session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_atd_interacao = true;
$exibe_bt_atd_aceitar = false;
$exibe_bt_atd_devolver = false;
$exibe_bt_atd_espera = false;
$exibe_bt_atd_concluido = false;
$exibe_bt_atd_finalizar = false;
$exibe_bt_atd_retomar = false;

if ($m3_00 == 0) {
  header("Location: ../index.php");
}
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
    /* usado apenas para formatar a mensagem de espera para os selectbox dependentes - Comentário*/
    .carregando {
      color: #ff0000;
      display: none;
    }

    .carregando2 {
      color: #ff0000;
      display: none;
    }

    .carregando3 {
      color: #ff0000;
      display: none;
    }

    .carregando4 {
      color: #ff0000;
      display: none;
    }
  </style>
</head>

<body>
  </ /?php include_once("../all/loading.php"); ?>
  <?php include_once("../all/header.php"); ?>
  <?php
  //verifico se existe alguma requisição POST chamada action
  $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);

  //verifico se existe alguma requisição via post cahamda atd
  $atd = filter_input(INPUT_POST, 'atd', FILTER_SANITIZE_NUMBER_INT);

  if ($action == "alterar_senha") {
    include_once("../all/update_senha.php");
  }

  if ($usar_token == "true") {
    if ($action) {
      if ($action == "atd_adc") {
        $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_STRING);
        $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_STRING);
        $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_STRING);
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_STRING);
        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_STRING);
        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_STRING);
        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_STRING);
        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_STRING);
        $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_STRING);
        //$abertura = date("Y-m-d H:i:s");
        $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_STRING);
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_STRING);

        //VERIFICA SE DATA HORA ABERTURA É MAIOR DO QUE DATA HORA ATUAL.
        //SE POSITIVO: UM ATENDIMENTO AGENDADO
        //MUDA O STATUS PADRÃO DE ABERTURA PARA 0 (AGENDADO)
        if (strtotime($abertura) > strtotime($agora)) {
          $atd_sts = 0;
          $agendamento = date("d/m/Y H:i", strtotime($abertura));
          $inter_msg = "Registrou o Agendamento do Atendimento para $agendamento.";
        } else {
          $atd_sts = 1;
          $inter_msg = "Registrou solicitação de Atendimento.";
        }

        //VERIFICA SE EXISTE UM ATENDIMENTO ABERTO PARA O MESMO CLIENTE, COM A MESMA CATEGORIA E MESMA SUBCATEGORIA NOS ÚLTIMOS 30 DIAS
        //SE HOUVER, CLASSIFICA O ATENDIMENTO COMO REINCIDENTE
        $prazo_reincidente = 30; //PERIODO EM DIAS PARA VERIFICAR REINCIDÊNCIA
        $data_reincidente = date("Y-m-d", strtotime($hoje . " - $prazo_reincidente days"));
        $show = $pdo->prepare("SELECT atendimentos.id FROM atendimentos WHERE atendimentos.abertura > '$data_reincidente' AND atendimentos.cliente = '$cliente' AND atendimentos.categoria = '$categoria' AND atendimentos.subcategoria = '$subcategoria'");
        $show->execute();
        $conta_atd = $show->rowCount();
        if ($conta_atd > 0) {
          $reincidente = 1;
        } else {
          $reincidente = 0;
        }

        //INICIA PROCESSO DE GRAVAÇÃO DO ATENDIMENTO NA BASE DE DADOS
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$atd_sts');");
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





        if ($adc->execute()) {
          $atd = $pdo->lastInsertId();
          $mensagem = "<i class=\"fas fa-check\"></i> Atendimento cadastrado!";
          $mensagem_cor = "alert-success";
          $log = "true";

//=====================================================================email=============================================================================================================================================================


          /*$pdo = ConnectionN3();
          $show_clt = $pdo->prepare("SELECT clientes.clt_mail, clientes.clt_nomef FROM clientes WHERE clientes.clt_id = $cliente limit 1");
          $show_clt->execute();
          $cliente = $show_clt->fetch(PDO::FETCH_ASSOC);

          $show_tecnico = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = $tecnico limit 1");
          $show_tecnico->execute();
          $showTecnico = $show_tecnico->fetch(PDO::FETCH_ASSOC);

          $show_pessoa = $pdo->prepare("SELECT pessoas.pessoa_nom FROM pessoas WHERE pessoas.pessoa_id = $pessoa limit 1");
          $show_pessoa->execute();
          $pessoa = $show_pessoa->fetch(PDO::FETCH_ASSOC); */

          $show_atendimento = $pdo->prepare("SELECT c.clt_nomef, p.pessoa_nom, u.user_nome, a.id
          FROM atendimentos a 
          INNER JOIN clientes c ON c.clt_id = a.cliente
          INNER JOIN pessoas p ON p.pessoa_id = a.pessoa
          INNER JOIN usuarios u ON u.user_id = a.tecnico
          WHERE a.id = '$atd' LIMIT 0,1");

          $show_atendimento->execute();
          $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

          $clienteid = isset($infos['id']) ? $infos['id'] : '';

          $to_email = "dhiogoamz@gmail.com,clerio.junior@gmail.com";
          $subject = "Nivel 3 TI Atendimento: #".$atd. " ";

          /*$clienteNome = $cliente['clt_nomef'];
          $pessoaNome = $pessoa['pessoa_nom'];
          $tecnicoNome = $showTecnico['user_nome'];*/

          $clienteNome = isset($infos['clt_nomef']) ? $infos['clt_nomef'] : '';
          $tecnicoNome = isset($infos['user_nome']) ? $infos['user_nome'] : '';
          $pessoaNome = isset($infos['pessoa_nom']) ? $infos['pessoa_nom'] : '';

          $body = "<strong>CHAMADO ABERTO</strong><br>Empresa: <strong>" . $clienteNome . "</strong> <strong>//</strong> solicitado por: <strong>" . $pessoaNome . "</strong><br>Conteúdo do chamado: <strong>" . $desc_abertura . "</strong><br>Sendo executado pelo técnico: <strong>" . $tecnicoNome. "</strong>";
          $headers = 'From: allterus@nivel3ti.com.br' . "\r\n";
          $headers .= "MIME-Version: 1.0\r\n";
          $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
          
          $isMailSent = mail($to_email, $subject, $body, $headers);

//===========================================================================email=======================================================================================================================================================


          //cadastra abertura do atendimento na tabela de interatividade
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$atd', '$user_id', '$agora', '$inter_msg');");
          $adc->execute();

          //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
          //registra interação de direcionamento de atendimento
          if ($tecnico > 0 && $tecnico != $user_id) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$atd', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome.')");
            $adc->execute();
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar atendimento!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }

      //EDITA A CATEGORIZAÇÃO DO ATENDIMENTO
      if ($action == "atd_edt") {
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_STRING);
        if ($tipo == 1) {
          $atd_tipo_nome = "Falha";
        }
        if ($tipo == 2) {
          $atd_tipo_nome = "Relacionamento";
        }
        if ($tipo == 3) {
          $atd_tipo_nome = "Requisição de Serviços";
        }
        if ($tipo == 4) {
          $atd_tipo_nome = "Requisição de informação";
        }
        if ($tipo == 5) {
          $atd_tipo_nome = "Notificação de monitoramento";
        }
        if ($tipo == 0) {
          $atd_tipo_nome = "Não informado";
        }
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        $show_cat->execute();
        $row = $show_cat->fetch(PDO::FETCH_ASSOC);
        $atd_cat_nome = $row["cat_nome"];

        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        $show_scat->execute();
        $row = $show_scat->fetch(PDO::FETCH_ASSOC);
        $atd_scat_nome = $row["scat_nome"];

        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $show_itens = $pdo->prepare("SELECT itens.itens_nome FROM itens WHERE itens.itens_id = '$item'");
        $show_itens->execute();
        $row = $show_itens->fetch(PDO::FETCH_ASSOC);
        $atd_itens_nome = $row["itens_nome"];

        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_STRING);
        if ($nivel == 0) {
          $atd_nivel_nome = "Não informado";
        }
        if ($nivel == 1) {
          $atd_nivel_nome = "Nível 1";
        }
        if ($nivel == 2) {
          $atd_nivel_nome = "Nível 2";
        }
        if ($nivel == 3) {
          $atd_nivel_nome = "Nível 3";
        }
        if ($nivel == 4) {
          $atd_nivel_nome = "Rotina";
        }
        if ($nivel == 5) {
          $atd_nivel_nome = "Administrativo";
        }

        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_STRING);
        if ($forma == 1) {
          $atd_forma_nome = "Remoto";
        }
        if ($forma == 2) {
          $atd_forma_nome = "Presencial";
        }

        //BUSCA A CLASSIFICAÇÃO ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICAÇÃO
        $pdo = ConnectionN3();
        $show_atd = $pdo->prepare("SELECT atendimentos.`tipo`, atendimentos.`categoria`, atendimentos.`subcategoria`, atendimentos.`item`, atendimentos.`nivel`, atendimentos.`forma`,
      categorias.cat_nome,
      subcategorias.scat_nome,
      itens.itens_nome
      FROM atendimentos 
      LEFT JOIN categorias ON categorias.cat_id = atendimentos.categoria
      LEFT JOIN subcategorias ON subcategorias.scat_id = atendimentos.subcategoria
      LEFT JOIN itens ON itens.itens_id = atendimentos.item
      WHERE atendimentos.id = '$atd'");
        $show_atd->execute();
        $row = $show_atd->fetch(PDO::FETCH_ASSOC);
        $atd_tipo_original = $row["tipo"];
        if ($atd_tipo_original == 1) {
          $atd_tipo_original_nome = "Falha";
        }
        if ($atd_tipo_original == 2) {
          $atd_tipo_original_nome = "Relacionamento";
        }
        if ($atd_tipo_original == 3) {
          $atd_tipo_original_nome = "Requisição de Serviços";
        }
        if ($atd_tipo_original == 4) {
          $atd_tipo_original_nome = "Requisição de informação";
        }
        if ($atd_tipo_original == 5) {
          $atd_tipo_original_nome = "Notificação de monitoramento";
        }
        if ($atd_tipo_original == 0) {
          $atd_tipo_original_nome = "Não informado";
        }
        $atd_cat_original = $row["categoria"];
        $atd_cat_original_nome = $row["cat_nome"];
        $atd_scat_original = $row["subcategoria"];
        $atd_scat_original_nome = $row["scat_nome"];
        $atd_item_original = $row["item"];
        $atd_item_original_nome = $row["itens_nome"];
        $atd_nivel_original = $row["nivel"];
        if ($atd_nivel_original == 0) {
          $atd_nivel_original_nome = "Não informado";
        }
        if ($atd_nivel_original == 1) {
          $atd_nivel_original_nome = "Nível 1";
        }
        if ($atd_nivel_original == 2) {
          $atd_nivel_original_nome = "Nível 2";
        }
        if ($atd_nivel_original == 3) {
          $atd_nivel_original_nome = "Nível 3";
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

        //COMPARA O TIPO DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($tipo != $atd_tipo_original) {
          //ALTERA O CÓDIGO DO TIPO NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `tipo`='$tipo' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou o Tipo: <s>De: $atd_tipo_original_nome</s> para $atd_tipo_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA O NÍVEL DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($nivel != $atd_nivel_original) {
          //ALTERA O CÓDIGO DO NÍVEL NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `nivel`='$nivel' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou o Nível: <s>De: $atd_nivel_original_nome</s> para $atd_nivel_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A CATEGORIA :
        //SE DIFERENTE:
        if ($categoria != $atd_cat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `categoria`='$categoria' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a Categoria: <s>De: $atd_cat_original_nome</s> para $atd_cat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA A SUBCATEGORIA :
        //SE DIFERENTE:
        if ($subcategoria != $atd_scat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `subcategoria`='$subcategoria' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a Sub Categoria: <s>De: $atd_scat_original_nome</s> para $atd_scat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA O ITEM :
        //SE DIFERENTE:
        if ($item != $atd_item_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `item`='$item' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou o Item: <s>De: $atd_item_original_nome</s> para $atd_itens_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA A FORMA DE ATENDIMENTO :
        //SE DIFERENTE:
        if ($forma != $atd_forma_original) {
          //ALTERA O CÓDIGO DA FORMA DE ATENDIMENTO NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `forma`='$forma' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a forma de atendimento: <s>De: $atd_forma_original_nome</s> para $atd_forma_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do Atendimento alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }
      }


      //ACÕES DE GERENCIAMENTO DO ATENDIMENTO    
      //TIPOS DE INTERATIVIDADE
      //0 = Agendamento;
      //1 = Abertura de Atendimento
      //2 = Aceite de Atendimento
      //3 = Devolução de Atendimento para fila
      //4 = Transferência de Atendimento
      //5 = Envio para espera
      //6 = Retomada do atendimento
      //7 = Interação com o solicitante
      //8 = Conclusão de Atendimento
      //9 = Edição de classificação
      //10 = Concluído
      //REGISTRAR NOVA INTERAÇÃO
      if ($action == "atd_new_inter") {
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :atd, '$user_id', '$agora', :inter_desc);");
        $adc->bindParam(':inter_desc', $inter_desc);
        $adc->bindParam(':atd', $atd);
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> Interação cadastrada!";
          $mensagem_cor = "alert-success";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO ACEITA INICIAR UM ATENDIMENTO
      if ($action == "atd_aceitar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        //VERIFICA SE TECNICO ATRIBUÍDO É O PRÓPRIO USUÁRIO
        //SE VERDADEIRO:
        //1 - muda o status do atendimento para 2 (ATENDIMENTO EM EXECUÇÃO)
        //2 - registra na tabela de interatividade que o usuário iniciou o atendimento.
        if ($tecnico == $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$atd';");
          if ($adc->execute()) {
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$atd', '$user_id', '$agora', 'Iniciou o atendimento.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> Ótimo! <br> O status do atendimento foi alterado para 'Em Execução'!";
              $mensagem_cor = "alert-success";
            }
          }
        }
        //SE FALSO:
        //1 - mantem status do atendimento como 1 (ATENDIMENTO AGUARDANDO EXECUÇÃO)
        //1 - registra na tabela de atendimento o novo técnico responsável 
        //2 - busca o NOME do técnico responsável
        //3 - registra na tabela de interatividade a atribuição do chamando
        if ($tecnico != $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `tecnico`='$tecnico', `status`='1' WHERE  `id`='$atd';");
          if ($adc->execute()) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$atd', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome.')");
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
      if ($action == "atd_retomar") {
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
          $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
          if ($edt_espera->execute()) {

            //insere o registro de uma nova interação 
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$atd', '$user_id', '$agora', 'Retomou o atendimento.');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interações com o cliente!";
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
      if ($action == "atd_recusar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_STRING);
        //VERIFICA SE O ATENDIMENTO FOI DIRECIONADO PARA OUTRO TÉCNICO
        //SE VERDADEIRO:
        //1 - muda o status do atendimento para 1 (aguardando atendimento)
        //1 - registra na tabela de atendimento o novo técnico responsável 
        //2 - busca o NOME do técnico responsável
        //2 - registra na tabela de interatividade que o usuário direcionou o atendimento.      
        if ($tecnico != 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `tecnico`='$tecnico', `status`='1' WHERE `id`='$atd';");
          if ($adc->execute()) {

            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$atd', '$user_id', '$agora', 'Direcionou o atendimento para $tecnico_nome: <br> $inter_desc');");
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
        //1 - remove o técnico como responsável pelo atendimento
        //2 - registra na tabela de interatividade que o usuário recusou o atendimento.     
        if ($tecnico == 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `tecnico`='0', `status`='1' WHERE `id`='$atd';");
          if ($adc->execute()) {

            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', '$atd', '$user_id', '$agora', 'Recusou o atendimento: <br> $inter_desc');");
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
        $espera_desc = filter_input(INPUT_POST, 'espera_desc', FILTER_SANITIZE_STRING);
        $espera_prev = filter_input(INPUT_POST, 'espera_prev', FILTER_SANITIZE_STRING);
        $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
        $pdo = ConnectionN3();
        //altera status do atendimento para 3 (Em espera)
        $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='3' WHERE  `id`='$atd';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `espera` (`espera_atd`, `espera_start`, `espera_prev`, `espera_desc`, `espera_user`) VALUES ('$atd', '$agora', '$espera_prev', '$espera_desc', '$user_id');");
          if ($adc->execute()) {
            //insere registro da ação na tabela de interatividade
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$atd', '$user_id', '$agora', 'Colocou o atendimento Em Espera. <br> Previsão de retorno: $espera_prev_br <br> Descrição: $espera_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi colocado Em Espera.";
              $mensagem_cor = "alert-warning";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar atendimento em espera!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tebale de espera!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }
      //COLOCAR ATENDIMENTO EM concluido
      if ($action == "atd_concluido") {
        $concluido_desc = filter_input(INPUT_POST, 'concluido_desc', FILTER_SANITIZE_STRING);
        $concluido_prev = filter_input(INPUT_POST, 'concluido_prev', FILTER_SANITIZE_STRING);
        $concluido_prev_br = date('d/m/Y H:i', strtotime($concluido_prev));
        $pdo = ConnectionN3();
        //altera status do atendimento para 3 (Em espera)
        $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='5' WHERE  `id`='$atd';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `concluido` (`concluido_atd`, `concluido_start`, `concluido_prev`, `concluido_desc`, `concluido_user`) VALUES ('$atd', '$agora', '$concluido_prev', '$concluido_desc', '$user_id');");
          if ($adc->execute()) {
            //insere registro da ação na tabela de interatividade
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('10', '$atd', '$user_id', '$agora', 'Colocou o atendimento como concluido. <br> Descrição: $concluido_desc');");
            if ($adc->execute()) {

              //============================================================================================== EMAIL

              //cliente, pessoa, tecnico, desc_fechamento
              $show_atendimento = $pdo->prepare("SELECT c.clt_nomef, p.pessoa_nom, u.user_nome, a.id
              FROM atendimentos a 
              INNER JOIN clientes c ON c.clt_id = a.cliente
              INNER JOIN pessoas p ON p.pessoa_id = a.pessoa
              INNER JOIN usuarios u ON u.user_id = a.tecnico
              WHERE a.id = '$atd' LIMIT 0,1");

              $show_atendimento->execute();
              $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

              $clienteid = isset($infos['id']) ? $infos['id'] : '';

              $to_email = "dhiogoamz@gmail.com,clerio.junior@gmail.com";
              $subject = "Nivel 3 TI Atendimento: #".$atd. " ";


              $clienteNome = isset($infos['clt_nomef']) ? $infos['clt_nomef'] : '';
              $tecnicoNome = isset($infos['user_nome']) ? $infos['user_nome'] : '';
              $pessoaNome = isset($infos['pessoa_nom']) ? $infos['pessoa_nom'] : '';

              $body = "<strong>CHAMADO CONCLUIDO!</strong> <br>Empresa: <strong>". $clienteNome ." </strong><strong>//</strong> Solicitado por: <strong>". $pessoaNome ."</strong><br>Descrição da conclusão do chamado: <strong>" . $concluido_desc . "</strong><br>Foi executado pelo técnico: <strong>" . $tecnicoNome."</strong>";

              $headers = 'From: allterus@nivel3ti.com.br' . "\r\n";
              $headers .= "MIME-Version: 1.0\r\n";
              $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

              $isMailSent = mail($to_email, $subject, $body, $headers);

              //============================================================================================================= EMAIL   


              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi colocado como concluído.";
              $mensagem_cor = "alert-warning";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar atendimento como concluído!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de concluído!";
            $mensagem_cor = "alert-danger";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO FINALIZA UM ATENDIMENTO
      if ($action == "atd_finalizar") {
        $desc_fechamento = filter_input(INPUT_POST, 'desc_fechamento', FILTER_SANITIZE_STRING);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("UPDATE `atendimentos` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$atd';");
        $adc->bindParam(':desc_fechamento', $desc_fechamento);
        $adc->bindParam(':fechamento', $agora);
        if ($adc->execute()) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$atd', '$user_id', '$agora', 'Finalizou o atendimento. <br> Descrição: $desc_fechamento');");
          if ($adc->execute()) {

            //

            $mensagem = "<i class=\"fas fa-check\"></i> Ótimo! <br> O que mais temos para hoje?!";
            $mensagem_cor = "alert-success";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o atendimento!";
          $mensagem_cor = "alert-danger";
        }
      }
    }
  }
  ?>
  <?php
  // Verifica de existe o ID de um atendimento setado.
  // Se não houver, exibe a parte de CADASTRO DE NOVO ATENDIMENTO
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
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitação de Atendimento
            </div>
            <div class="card-body py-3">
              <form action="#" method="POST">
                <div class="form-row">
                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Cliente:</label>
                    <select name="cliente" id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
                      <option></option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_clt = $pdo->prepare("SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1' ORDER BY clientes.clt_nomef ASC");
                      $show_clt->execute();
                      while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                        $clt_id = $exibe["clt_id"];
                        $clt_nome = $exibe["clt_nomef"];
                      ?>
                        <option value="<?php echo $clt_id; ?>"><?php echo $clt_nome; ?></option>
                      <?php } ?>
                    </select>
                  </div>

                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-4">
                    <label class="my-0 small">Solicitante:</label>
                    <span class="carregando small">Carregando...</span>
                    <select name="solicitante" id="solicitante" class="form-control form-control-sm" required="required" tabindex="2">
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

                  <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Sub Categoria:</label>
                    <span class="carregando3 small">Aguarde, carregando...</span>
                    <select name="subcategoria" id="subcategoria" class="form-control form-control-sm" required="required" tabindex="6">
                      <option></option>
                    </select>
                  </div>

                  <!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
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
                      <option value="5">Administrativo</option>
                      <option value="0">NA</option>
                    </select>
                  </div>
                </div>

                <div class="form-row pt-2">

                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea name="desc_abertura" class="form-control form-control-sm" rows="5" required="required" tabindex="9"></textarea>
                  </div>

                  <div class="form-group col-sm-6 col-md-6">
                    <div class="form-row">

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Técnico:</label>
                        <select name="tecnico" id="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="10">
                          <option></option>
                          <option value="0">Não determinado</option>
                          <?php
                          $pdo = ConnectionN3();
                          $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios WHERE usuarios.user_sts = '1' AND usuarios.user_id > '1' ORDER BY usuarios.user_nome ASC");
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
                        <select name="forma" class="form-control form-control-sm" required="required" tabindex="11">
                          <option value="1">Remoto</option>
                          <option value="2">Presencial</option>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Abertura:</label>
                        <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                      </div>

                      <div class="form-group col-sm-12 col-md-6 pt-3 text-center">
                        <input type="hidden" name="token" value="<?php echo $token; ?>">
                        <input type="hidden" name="action" value="atd_adc">
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
    <!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de novo atendimento</h6>
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
  // Verifica de existe o ID de um atendimento setado.
  // Se não houver, exibe a parte de CADASTRO DE NOVO ATENDIMENTO
  if (isset($atd)) { ?>
    <?php
    //Busca informações do atendimento

    $pdo = ConnectionN3();
    $show_atd = $pdo->prepare("SELECT atendimentos.`area`, atendimentos.`tipo`, atendimentos.`categoria`, atendimentos.`subcategoria`, atendimentos.`item`, atendimentos.`local`, atendimentos.nivel, atendimentos.forma, atendimentos.desc_abertura, atendimentos.desc_fechamento, atendimentos.abertura, atendimentos.fechamento, atendimentos.reincidente, atendimentos.`status`, atendimentos.`tecnico`,
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
WHERE atendimentos.id = '$atd'");
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
    if ($atd_tipo == 2) {
      $atd_tipo_nome = "Relacionamento";
    }
    if ($atd_tipo == 3) {
      $atd_tipo_nome = "Requisição de Serviços";
    }
    if ($atd_tipo == 4) {
      $atd_tipo_nome = "Requisição de informação";
    }
    if ($atd_tipo == 5) {
      $atd_tipo_nome = "Notificação de monitoramento";
    }
    if ($atd_tipo == 0) {
      $atd_tipo_nome = "Não informado";
    }
    $atd_nivel = $row["nivel"];
    if ($atd_nivel == 0) {
      $atd_nivel_nome = "Não informado";
    }
    if ($atd_nivel == 1) {
      $atd_nivel_nome = "Nível 1";
    }
    if ($atd_nivel == 2) {
      $atd_nivel_nome = "Nível 2";
    }
    if ($atd_nivel == 3) {
      $atd_nivel_nome = "Nível 3";
    }
    if ($atd_nivel == 4) {
      $atd_nivel_nome = "Rotina";
    }
    if ($atd_nivel == 5) {
      $atd_nivel_nome = "Administrativo";
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
      $local_nom = "Não informado";
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
      $tecnico_nome = "Não Atribuído";
    }
    ?>
    <div class="container-fluid">
      <div class="row mt-2">
        <div class="col-md-3 px-1">

          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-headset text-danger"></i> ATD #<?php echo str_pad($atd, 5, '0', STR_PAD_LEFT); ?>
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
                      <strong>Classificação do Atendimento:</strong>
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
                  <i class="fas fa-check"></i> Ações
                </div>
                <div class="col-6 text-right px-0">
                  <?php if ($atd_status == 0) { ?>
                    <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Atendimento Agendado </button>
                  <?php } ?>
                  <?php if ($atd_status == 1) { ?>
                    <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="fas fa-hourglass-half"></i> Aguardando Execução </button>
                  <?php } ?>
                  <?php if ($atd_status == 2) { ?>
                    <button type="button" class="btn btn-primary btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Atendimento em Execução </button>
                  <?php } ?>
                  <?php if ($atd_status == 3) { ?>
                    <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Atendimento em Espera </button>
                  <?php } ?>
                  <?php if ($atd_status == 5) { ?>
                    <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Concluído </button>
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
                  <label class="my-0 small">Técnico:</label>
                  <input class="form-control form-control-sm" value="<?php echo $tecnico_nome; ?>" disabled="">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descrição de abertura:</label>
                  <textarea class="form-control form-control-sm" rows="4" disabled=""><?php echo $atd_desc_abertura; ?></textarea>
                </div>
              </div>
              <?php if ($atd_status == 4) { ?>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Descrição de fechamento:</label>
                    <textarea class="form-control form-control-sm" rows="3" disabled=""><?php echo $atd_desc_fechamento; ?></textarea>
                  </div>
                </div>
              <?php } ?>
              <div class="row">
                <?php
                //ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

                //SE NÃO HOUVER TÉCNICO ATRIBUÍDO PARA O ATENDIMENTO
                if ($tecnico_id == 0) {
                  $exibe_bt_atd_aceitar = true;
                }

                //SE O ATENDIMENTO ESTIVER AGUARDANDO E O USUÁRIO FOR O TÉCNICO
                if ($atd_status == 1 && $tecnico_id == $user_id) {
                  $exibe_bt_atd_aceitar = true;
                }

                //SE O ATENDIMENTO ESTIVER EM ESPERA E O USUÁRIO FOR O TÉCNICO
                if ($atd_status == 3 && $tecnico_id == $user_id) {
                  $exibe_bt_atd_retomar = true;
                }
                //if($atd_status==5 && $tecnico_id==$user_id){ $exibe_bt_atd_retomar=true; }
                //SE O ATENDIMENTO ESTIVER EM EXECUÇÃO E O USUÁRIO FOR O TÉCNICO
                if ($atd_status == 2 && $tecnico_id == $user_id) {
                  $exibe_bt_atd_devolver = true;
                  $exibe_bt_atd_espera = true;
                  $exibe_bt_atd_concluido = true;
                  $exibe_bt_atd_finalizar = true;
                }

                //ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM A PERMISSÃO DO USUÁRIO
                if ($m3_02 == 0) {
                  $exibe_bt_atd_aceitar = false;
                  $exibe_bt_atd_finalizar = false;
                }
                if ($m3_03 == 0) {
                  $exibe_bt_atd_espera = false;
                }
                if ($m3_03 == 0) {
                  $exibe_bt_atd_concluido = false;
                }
                if ($m3_04 == 0) {
                  $exibe_bt_atd_devolver = false;
                }
                if ($m3_05 == 0) {
                  $exibe_bt_atd_finalizar = false;
                }


                if ($m3_05 == 2) { //se usuário com permissão para editar atendimentos de terceiros
                  if ($atd_status == 3) {
                    $exibe_bt_atd_retomar = true;
                  }
                  $exibe_bt_atd_devolver = true;
                  if ($atd_status == 2) {
                    $exibe_bt_atd_espera = true;
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
                    <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_new_inter"> <i class="fas fa-headset"></i> Nova Interação </button>
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
                    <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#atd_concluido"> <i class="far fa-pause-circle"></i> Concluído </button>
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
                <?php } ?>
              </div>


            </div>
          </div>
        </div>

        <div class="col-md-3 px-1">
          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-list-ol"></i> Histórico do atendimento #<?php echo str_pad($atd, 5, '0', STR_PAD_LEFT); ?>
            </div>
            <div class="card-body">

              <div class="timeline">
                <?php
                $pdo = ConnectionN3();
                $show_inter = $pdo->prepare("SELECT interatividade.*, usuarios.user_nome FROM interatividade INNER JOIN usuarios ON usuarios.user_id = interatividade.inter_user WHERE interatividade.inter_atd = '$atd' AND interatividade.inter_tipo > '0' ORDER BY inter_id DESC");
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
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
    <!-- MODAL NOVA INTERAÇÃO -->
    <div class="modal fade" id="atd_new_inter" tabindex="-1" role="dialog">
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


    <!-- MODAL EDIÇÃO DA CLASSIFICAÇÃO DO ATENDIMENTO-->
    <div class="modal fade" id="atd_edt" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição da classificação do atendimento</h6>
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
                    <option value="1" <?php if ($atd_tipo == 1) {
                                        echo " selected";
                                      } ?>>Falha</option>
                    <option value="2" <?php if ($atd_tipo == 2) {
                                        echo " selected";
                                      } ?>>Relacionamento</option>
                    <option value="3" <?php if ($atd_tipo == 3) {
                                        echo " selected";
                                      } ?>>Requisição de Serviços</option>
                    <option value="4" <?php if ($atd_tipo == 4) {
                                        echo " selected";
                                      } ?>>Requisição de informação</option>
                    <option value="5" <?php if ($atd_tipo == 5) {
                                        echo " selected";
                                      } ?>>Notificação de monitoramento</option>
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

                <!-- Este select será populado per um Java Script, de acordo com o valor escolhido no select 'cliente'-->
                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Sub Categoria:</label>
                  <span class="carregando3 small">Aguarde, carregando...</span>
                  <select name="subcategoria" id="subcategoria" class="form-control form-control-sm" required="required" tabindex="6">
                    <option value="<?php echo $atd_scat; ?>"><?php echo $scat_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Item:</label>
                  <span class="carregando4 small">Aguarde, carregando...</span>
                  <select name="item" id="item" class="form-control form-control-sm" required="required" tabindex="6">
                    <option value="<?php echo $atd_item; ?>"><?php echo $itens_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Nível:</label>
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
                  </select>
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
                <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down text-success"></i> Iniciar atendimento ou direcionar para outro Técnico</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <label class="small"><strong>Iniciar o atendimento:</strong></label>
                <label class="small">Se o técnico informado for o próprio usuário: a) este atendimento ficará sob sua responsabilidade; b) o status do atendimento será alterado para "Em execução".</label>
                <label class="small pt-1"><strong>Direcionar a outro técnico:</strong></label>
                <label class="small">Se o técnico informado NÃO for o próprio usuário: a) este atendimento será redirecionado para a fila de atendimentos do técnico informado; b) este atendimento contuará com o status "Aguardando atendimento" até que o técnico responsável confirme o início da execução.</label>
                <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Técnico responsável:</label>
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
              <label class="small">Confirmação de retomada do atendimento.</label>
              <label class="small">Este atendimento estava aguardando o retorno de um terceiro. Ao retomar este atendimento ele ficará sob sua responsabilidade. Não esqueça de informar todas as interação com o cliente.</label>
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
                <label class="small">Atendimentos em Espera são aqueles que não podem ser finalizados pois é preciso aguardar um retorno de alguém <b> externo </b> a Nível 3 TI.</label>
                <label class="small">Ao colocar em espera: a) este atendimento continuará sob a sua responsabilidade; b) o status do atendimento será alterado para "Em espera"; c) Após o período de espera, o status do atendimento será alterado para "Em Execução".</label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Motivo da espera:</label>
                    <textarea name="espera_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Data prevista para encerramento da espera:</label>
                    <input type="text" id="datetimepicker" name="espera_prev" value="<?php echo date("Y-m-d H:i", strtotime($agora . " +4 days")); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="2">
                  </div>
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
                    <label class="my-0 small">Motivo da Conclusão:</label>
                    <textarea name="concluido_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <!--<label class="my-0 small">Data prevista para encerramento da Conclusão:</label>-->
                    <input type="hidden" id="datetimepicker2" name="espera_prev" value="<?php echo date("Y-m-d H:i", strtotime($agora . " +4 days")); ?>">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="atd" value="<?php echo $atd; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="atd_concluido">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Colocar em concluído</button>
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
                  <label class="small">Ao confirmar esta tela SEM informar um técnico: a) o atendimento voltará para a fila de atendimento sem um responsável; b) este atendimento contuará com o status "Aguardando atendimento" até que um técnico o aceite.</label>
                  <label class="small pt-1"><strong>Direcionar atendimento:</strong></label>
                  <label class="small">Ao confirmar esta tela informando um técnico responsável: a) este atendimento será redirecionado para a fila de atendimentos do técnico informado; b) este atendimento contuará com o status "Aguardando atendimento" até que o técnico responsável confirme o início da execução.</label>
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
                    <label class="my-0 small">O atendimento será finalizado!</label>
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
    <?php } ?>
    <!-- MODAL DE AJUDA PARA A GESTÃO DE UM ATENDIMENTO -->
    <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
      <div class="modal-dialog" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Gestão do atendimento</h6>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </div>

          <div class="modal-body">
            <p><strong>O atendimento deve ser gerido da seguinte forma:</strong></p>
            <ul class="list">
              <li>Registre tudo através de <span class="badge badge-light"><i class="fas fa-headset"></i> Nova Interação </span>
                <ul>
                  <li class="small">Comentários do cliente, informações que você observar e o trabalho que você executou devem ser registrados.</li>
                  <li class="small">Cada registro que você fizer será exibido no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do atendimento</span> com a data/hora e o seu nome.</li>
                </ul>
              </li>
              <li class="pt-1">Iniciei a execução do atendimento através do <span class="badge badge-light"><i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar</span>
                <ul>
                  <li class="small">Se você for o técnico que executará o atendimento, apenas confirme o seu nome como <em>Técnico Resposável</em>.</li>
                  <li class="small">Quando você confirmar seu nome como <em>Técnico Resposável</em> pelo atendimento outras opções de gestão do atendimento aparecerão na sua tela.</li>
                  <li class="small">Se não for você quem executará o atendimento, você pode também informar quem será o técnico que deverá executar o atendimento.</li>
                  <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do atendimento</span> com a data/hora e o seu nome.</li>
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
                  <li class="small">Cada ação que você fizer será exibida no <span class="badge badge-light"><i class="fas fa-list-ol"></i> Histórico do atendimento</span> com a data/hora e o seu nome.</li>
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
  <script src="../js/bootstrap.min.js"></script>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <!-- bootstrap.bundle e bootstrap-select são necessários para seja possível pesquisar por nome no select cliente-->
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
  <?php if (empty($atd) || $exibe_bt_atd_concluido == true) { ?>
    <!-- CAMPO DE DATA E HORA DA TELA DE concluído -->
    <script type="text/javascript" src="../js/bootstrap-datetimepicker.js" charset="UTF-8"></script>
    <script type="text/javascript">
      $.fn.datetimepicker2.dates['en'] = {
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
      $(".form_datetime2").datetimepicker2({
        format: "yyyy-mm-dd hh:ii"
      });
    </script>
  <?php } ?>


  <!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
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
            $('#solicitante').html('<option value="">– Escolha o Solicitante –</option>');
            $('#local').html('<option value="">– Escolha o Local –</option>');
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
          $('#subcategoria').html('<option value="">– Escolha a Subcategoria –</option>');
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
          $('#item').html('<option value="">– Escolha o Item –</option>');
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