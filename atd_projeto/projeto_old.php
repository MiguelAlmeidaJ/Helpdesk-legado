<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");


$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");


//REGRA PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC
$exibe_bt_projeto_interacao = true;
$exibe_bt_projeto_aceitar = false;
$exibe_bt_projeto_devolver = false;
$exibe_bt_projeto_espera = false;
$exibe_bt_projeto_finalizar = false;
$exibe_bt_projeto_retomar = false;

if ($m5_00 == 0) {
  header("Location: ../home.php");
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
  <link rel="stylesheet" href="../css/progress_bar.css">
  <link rel="stylesheet" href="../css/blink.css">
  <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
  <!-- <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script> -->
  <link rel="stylesheet" href="https://unpkg.com/frappe-gantt/dist/frappe-gantt.css">
  <script src="https://unpkg.com/frappe-gantt/dist/frappe-gantt.min.js"></script>


  <title>Allterus</title>
  <style type="text/css">
    body {
      zoom: 0.9;
      width: 100%;
      overflow-x: hidden;
    }

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
  <?php include_once("../all/sidebar.php"); ?>
  <?php
  //verifico se existe alguma requisição POST chamada action
  $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

  //verifico se existe alguma requisição via post cahamda projeto
  // $projeto = filter_input(INPUT_POST, 'projeto', FILTER_SANITIZE_NUMBER_INT);
  $projeto = $_POST['projeto'] ?? $_GET['projeto'] ?? 0;


  if ($action == "alterar_senha") {
    include_once("../all/update_senha.php");
  }

  if ($usar_token == "true") {
    if ($action) {
      if ($action == "projeto_adc") {
        $nome_proj = htmlspecialchars(filter_input(INPUT_POST,  'nome_proj',  FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        $cliente = filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pessoa = filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $local = filter_input(INPUT_POST, 'local', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        /* $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_FULL_SPECIAL_CHARS); */
        // $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        //$abertura = date("Y-m-d H:i:s");
        $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');

        $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        //VERIFICA SE DATA HORA ABERTURA É MAIOR DO QUE DATA HORA ATUAL.
        //SE POSITIVO: UM PROJETO AGENDADO
        //MUDA O STATUS PADRÃO DE ABERTURA PARA 0 (AGENDADO)
        if (strtotime($abertura) > strtotime($agora)) {
          $projeto_sts = 0;
          $agendamento = date("d/m/Y H:i", strtotime($abertura));
          $inter_msg = "Registrou o Agendamento do projeto para $agendamento.";
        } else {
          $projeto_sts = 1;
          $inter_msg = "Registrou solicitação de projeto.";
        }

        //VERIFICA SE EXISTE UM PROJETO ABERTO PARA O MESMO CLIENTE, COM A MESMA CATEGORIA E MESMA SUBCATEGORIA NOS ÚLTIMOS 30 DIAS
        //SE HOUVER, CLASSIFICA O PROJETO COMO REINCIDENTE
        $prazo_reincidente = 30; //PERIODO EM DIAS PARA VERIFICAR REINCIDÊNCIA
        $data_reincidente = date("Y-m-d", strtotime($hoje . " - $prazo_reincidente days"));
        $show = $pdo->prepare("SELECT projetos.id FROM projetos WHERE projetos.abertura > '$data_reincidente' AND projetos.cliente = '$cliente' AND projetos.categoria = '$categoria' AND projetos.subcategoria = '$subcategoria'");
        $show->execute();
        $conta_projeto = $show->rowCount();
        if ($conta_projeto > 0) {
          $reincidente = 1;
        } else {
          $reincidente = 0;
        }

        //INICIA PROCESSO DE GRAVAÇÃO DO PROJETO NA BASE DE DADOS
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `projetos` (`nome_proj`, `cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, /* `dias`, */ `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`) VALUES (:nome_proj, :cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, /* :dias, */ :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$projeto_sts');");
        $adc->bindParam(':nome_proj', $nome_proj);
        $adc->bindParam(':cliente', $cliente);
        $adc->bindParam(':pessoa', $pessoa);
        $adc->bindParam(':local', $local);
        $adc->bindParam(':tipo', $tipo);
        $adc->bindParam(':categoria', $categoria);
        $adc->bindParam(':subcategoria', $subcategoria);
        $adc->bindParam(':item', $item);
        /* $adc->bindParam(':dias', $dias); */
        $adc->bindParam(':forma', $forma);
        $adc->bindParam(':desc_abertura', $desc_abertura);
        $adc->bindParam(':abertura', $abertura);
        $adc->bindParam(':tecnico', $tecnico);

        //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
        //if($tecnico>0 && $tecnico!= $user_id){
        //}

        if ($adc->execute()) {
          $projeto = $pdo->lastInsertId();
          $mensagem = "<i class=\"fas fa-check\"></i> projeto cadastrado!";
          $mensagem_cor = "alert-success";
          $log = "true";

          //cadastra abertura do projeto na tabela de interatividade
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$projeto', '$user_id', '$agora', '$inter_msg');");
          $adc->execute();

          //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
          //registra interação de direcionamento de projeto
          if ($tecnico > 0 && $tecnico != $user_id) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projeto', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome.')");
            $adc->execute();
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar projeto!";
          $mensagem_cor = "alert-danger";
          $log = "false";
        }
      }

      //EDITA A CATEGORIZAÇÃO DO PROJETO
      if ($action == "projeto_edt") {
        $tipo = filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($tipo == 1) {
          $projeto_tipo_nome = "Falha";
        }
        if ($tipo == 2) {
          $projeto_tipo_nome = "Relacionamento";
        }
        if ($tipo == 3) {
          $projeto_tipo_nome = "Requisição de Serviços";
        }
        if ($tipo == 4) {
          $projeto_tipo_nome = "Requisição de informação";
        }
        if ($tipo == 5) {
          $projeto_tipo_nome = "Notificação de monitoramento";
        }
        if ($tipo == 0) {
          $projeto_tipo_nome = "Não informado";
        }
        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        $show_cat->execute();
        $row = $show_cat->fetch(PDO::FETCH_ASSOC);
        $projeto_cat_nome = $row["cat_nome"];

        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        $show_scat->execute();
        $row = $show_scat->fetch(PDO::FETCH_ASSOC);
        $projeto_scat_nome = $row["scat_nome"];

        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_itens = $pdo->prepare("SELECT itens.itens_nome FROM itens WHERE itens.itens_id = :item"); // Usando bind para evitar SQL Injection
        $show_itens->bindParam(':item', $item, PDO::PARAM_INT); // Bind do parâmetro para maior segurança
        $show_itens->execute();

        $row = $show_itens->fetch(PDO::FETCH_ASSOC);

        if ($row) { // Verificando se a consulta retornou resultados
          $projeto_itens_nome = isset($row["itens_nome"]) ? $row["itens_nome"] : ''; // Acesso seguro é chave
        } else {
          $projeto_itens_nome = ''; // Valor padrão se não houver resultados
        }




        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($nivel == 0) {
          $projeto_nivel_nome = "Não informado";
        }
        if ($nivel == 1) {
          $projeto_nivel_nome = "Nível 1";
        }
        if ($nivel == 2) {
          $projeto_nivel_nome = "Nível 2";
        }
        if ($nivel == 3) {
          $projeto_nivel_nome = "Nível 3";
        }
        if ($nivel == 4) {
          $projeto_nivel_nome = "Rotina";
        }
        if ($nivel == 5) {
          $projeto_nivel_nome = "Administrativo";
        }

        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_SPECIAL_CHARS);
        if ($forma == 1) {
          $projeto_forma_nome = "Remoto";
        }
        if ($forma == 2) {
          $projeto_forma_nome = "Presencial";
        }
        if ($forma == 3) {
          $projeto_forma_nome = "Remoto - Plantão";
        }
        if ($forma == 4) {
          $projeto_forma_nome = "Presencial - Plantão";
        }

        $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura'), ENT_QUOTES, 'UTF-8');


        $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_dias = $pdo->prepare("SELECT projetos.dias FROM projetos WHERE projetos.id = '$projeto'");
        $show_dias->execute();
        $row = $show_dias->fetch(PDO::FETCH_ASSOC);
        $dias_nome = $row["dias"];


        //BUSCA A CLASSIFICAÇÃO ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICAÇÃO
        $pdo = ConnectionN3();
        $show_projeto = $pdo->prepare("SELECT projetos.`tipo`, projetos.`categoria`, projetos.`subcategoria`, projetos.`item`, projetos.`nivel`,/* projetos.`dias`, */
        categorias.cat_nome, projetos.desc_abertura,
        subcategorias.scat_nome
        FROM projetos 
        LEFT JOIN categorias ON categorias.cat_id = projetos.categoria
        LEFT JOIN subcategorias ON subcategorias.scat_id = projetos.subcategoria
        WHERE projetos.id = '$projeto'");
        $show_projeto->execute();
        $row = $show_projeto->fetch(PDO::FETCH_ASSOC);

        $projeto_tipo_original = $row["tipo"];
        if ($projeto_tipo_original == 1) {
          $projeto_tipo_original_nome = "Falha";
        }
        if ($projeto_tipo_original == 2) {
          $projeto_tipo_original_nome = "Relacionamento";
        }
        if ($projeto_tipo_original == 3) {
          $projeto_tipo_original_nome = "Requisição de Serviços";
        }
        if ($projeto_tipo_original == 4) {
          $projeto_tipo_original_nome = "Requisição de informação";
        }
        if ($projeto_tipo_original == 5) {
          $projeto_tipo_original_nome = "Notificação de monitoramento";
        }
        if ($projeto_tipo_original == 0) {
          $projeto_tipo_original_nome = "Não informado";
        }
        $projeto_cat_original = $row["categoria"];
        $projeto_cat_original_nome = $row["cat_nome"];
        $projeto_scat_original = $row["subcategoria"];
        $projeto_scat_original_nome = $row["scat_nome"];
        $projeto_desc_abertura_original = $row["desc_abertura"];

        $projeto_nivel_original = $row["nivel"];
        if ($projeto_nivel_original == 0) {
          $projeto_nivel_original_nome = "Não informado";
        }
        if ($projeto_nivel_original == 1) {
          $projeto_nivel_original_nome = "Nível 1";
        }
        if ($projeto_nivel_original == 2) {
          $projeto_nivel_original_nome = "Nível 2";
        }
        if ($projeto_nivel_original == 3) {
          $projeto_nivel_original_nome = "Nível 3";
        }
        if ($projeto_nivel_original == 4) {
          $projeto_nivel_original_nome = "Rotina";
        }
        if ($projeto_nivel_original == 5) {
          $projeto_nivel_original_nome = "Administrativo";
        }



        /* $projeto_dias_original = $row["dias"];
        $projeto_dias = $row["dias"]; */
        //        if($projeto_nivel_original==0){$projeto_nivel_original_nome="Não informado";}
        //        if($projeto_nivel_original==1){$projeto_nivel_original_nome="Nível 1";}
        //        if($projeto_nivel_original==2){$projeto_nivel_original_nome="Nível 2";}
        //        if($projeto_nivel_original==3){$projeto_nivel_original_nome="Nível 3";}
        //        if($projeto_nivel_original==4){$projeto_nivel_original_nome="Rotina";} 

        //COMPARA O TIPO DO PROJETO:
        //SE DIFERENTE:
        if ($tipo != $projeto_tipo_original) {
          //ALTERA O CÓDIGO DO TIPO NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tipo`='$tipo' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou o Tipo: <s>De: $projeto_tipo_original_nome</s> para $projeto_tipo_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }

        //COMPARA O(S) DIAS DO PROJETO:
        /*  //SE DIFERENTE:
        if ($dias != $projeto_dias_original) {
          //ALTERA O CÓDIGO DO NºVEL NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `dias`='$dias' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou o(s) dia(s): <s>De: $projeto_dias_original</s> para $dias.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Dia(s) do projeto alterado!";
              $mensagem_cor = "alert-success";
            }
          }
        } */

        //COMPARA A CATEGORIA :
        //SE DIFERENTE:
        if ($categoria != $projeto_cat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `categoria`='$categoria' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou a Categoria: <s>De: $projeto_cat_original_nome</s> para $projeto_cat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA A SUBCATEGORIA :
        //SE DIFERENTE:
        if ($subcategoria != $projeto_scat_original) {
          //ALTERA O CÓDIGO DA CATEGORIA NA TABELA DE PROJETOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `subcategoria`='$subcategoria' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou a Sub Categoria: <s>De: $projeto_scat_original_nome</s> para $projeto_scat_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA A Descrição de Abertura :
        //SE DIFERENTE:
        if ($desc_abertura != $projeto_desc_abertura_original) {
          //ALTERA O CÓDIGO DA desc_abertura DE ATENDIMENTO NA TABELA DE TAREFAS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `desc_abertura`='$desc_abertura' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou a Descrição de Abertura: <s>De: $projeto_desc_abertura_original</s> para: $desc_abertura.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Descrição de abertura alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }


        //COMPARA O NºVEL DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($nivel != $projeto_nivel_original) {
          //ALTERA O CÓDIGO DO NºVEL NA TABELA DE projetos
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `nivel`='$nivel' WHERE `id`='$projeto';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$projeto', '$user_id', '$agora', 'Editou o Nível: <s>De: $projeto_nivel_original_nome</s> para $projeto_nivel_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Classificação do projeto alterada!";
              $mensagem_cor = "alert-success";
            }
          }
        }
      }


      ///////////////////////////////////////////////////////////////////

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
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('7', :projeto, '$user_id', '$agora', :inter_desc);");
        $adc->bindParam(':inter_desc', $inter_desc);
        $adc->bindParam(':projeto', $projeto);
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> Interação cadastrada!";
          $mensagem_cor = "alert-success";
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar interação!";
          $mensagem_cor = "alert-danger";
        }
      }

      //USUÁRIO ACEITA INICIAR UM PROJETO
      if ($action == "projeto_aceitar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        //VERIFICA SE TECNICO ATRIBUÍDO é O PRÓPRIO USUÁRIO
        //SE VERDADEIRO:
        //1 - muda o status do projeto para 2 (projeto EM EXECUÇÃO)
        //2 - registra na tabela de interatividade que o usuário iniciou o projeto.
        if ($tecnico == $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$projeto';");
          if ($adc->execute()) {
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$projeto', '$user_id', '$agora', 'Iniciou o projeto.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O status do projeto foi alterado para 'Em Execução'!";
              $mensagem_cor = "alert-success";
            }
          }
        }
        //SE FALSO:
        //1 - mantem status do projeto como 1 (projeto AGUARDANDO EXECUÇÃO)
        //1 - registra na tabela de projeto o novo técnico responsóvel 
        //2 - busca o NOME do técnico responsóvel
        //3 - registra na tabela de interatividade a atribuição do chamando
        if ($tecnico != $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='$tecnico', `status`='1' WHERE  `id`='$projeto';");
          if ($adc->execute()) {
            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projeto', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O projeto foi direcionado para $tecnico_nome.";
              $mensagem_cor = "alert-success";
            } else {
              $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto a outro técnico!";
              $mensagem_cor = "alert-danger";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto a outro técnico!";
            $mensagem_cor = "alert-danger";
          }
        }
      }

      //USUÁRIO RETOMA UM PROJETO
      if ($action == "projeto_retomar") {
        $pdo = ConnectionN3();

        //altera o status do projeto para 2 (Em execução)
        $edt = $pdo->prepare("UPDATE `projetos` SET `status`='2' WHERE  `id`='$projeto';");
        if ($edt->execute()) {
          //busca o ID do registro de espera, na tabela espera
          $show_espera = $pdo->prepare("SELECT espera_projeto.espera_id FROM espera WHERE espera_projeto.espera_projeto = '$projeto' ORDER BY espera_projeto.espera_id DESC LIMIT 0,1");
          $show_espera->execute();
          $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
          $espera_id = $exibe["espera_id"];

          //registra A data hora final de espera, na tabela espera
          $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$agora' WHERE `espera_id`='$espera_id';");
          if ($edt_espera->execute()) {

            //insere o registro de uma nova interação 
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$projeto', '$user_id', '$agora', 'Retomou o projeto.');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interaçães com o cliente!";
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

      //USUÁRIO RECUSA UM PROJETO
      if ($action == "projeto_recusar") {
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
        $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        //VERIFICA SE O PROJETO FOI DIRECIONADO PARA OUTRO TÉCNICO
        //SE VERDADEIRO:
        //1 - muda o status do projeto para 1 (aguardando projeto)
        //1 - registra na tabela de projeto o novo técnico responsóvel 
        //2 - busca o NOME do técnico responsóvel
        //2 - registra na tabela de interatividade que o usuário direcionou o projeto.      
        if ($tecnico != 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='$tecnico', `status`='1' WHERE `id`='$projeto';");
          if ($adc->execute()) {

            $show_tec = $pdo->prepare("SELECT usuarios.user_nome FROM usuarios WHERE usuarios.user_id = '$tecnico'");
            $show_tec->execute();
            $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
            $tecnico_nome = $exibe["user_nome"];

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('4', '$projeto', '$user_id', '$agora', 'Direcionou o projeto para $tecnico_nome: <br> $inter_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> projeto direcionado para $tecnico_nome. <br> O que vamos fazer agora?";
              $mensagem_cor = "alert-warning";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto!";
            $mensagem_cor = "alert-danger";
          }
        }
        //SE FALSO:
        //1 - muda o status do projeto para 1 (aguardando projeto)
        //1 - remove o técnico como responsóvel pelo projeto
        //2 - registra na tabela de interatividade que o usuário recusou o projeto.     
        if ($tecnico == 0) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `projetos` SET `tecnico`='0', `status`='1' WHERE `id`='$projeto';");
          if ($adc->execute()) {

            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('3', '$projeto', '$user_id', '$agora', 'Recusou o projeto: <br> $inter_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> projeto recusado. <br> O que vamos fazer agora?";
              $mensagem_cor = "alert-warning";
            }
          } else {
            $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao direcionar o projeto!";
            $mensagem_cor = "alert-danger";
          }
        }
      }

      //COLOCAR PROJETO EM ESPERA
      if ($action == "projeto_espera") {
        $espera_desc = filter_input(INPUT_POST, 'espera_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $espera_prev = filter_input(INPUT_POST, 'espera_prev', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
        $pdo = ConnectionN3();
        //altera status do projeto para 3 (Em espera)
        $edt = $pdo->prepare("UPDATE `projetos` SET `status`='3' WHERE  `id`='$projeto';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `espera_projeto` (`espera_projeto`, `espera_start`, `espera_prev`, `espera_desc`, `espera_user`) VALUES ('$projeto', '$agora', '$espera_prev', '$espera_desc', '$user_id');");
          if ($adc->execute()) {
            //insere registro da ação na tabela de interatividade
            $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$projeto', '$user_id', '$agora', 'Colocou o projeto Em Espera. <br> Previsão de retorno: $espera_prev_br <br> Descrição: $espera_desc');");
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
      }

      //USUÁRIO FINALIZA UM PROJETO
      if ($action == "projeto_finalizar") {
        $desc_fechamento = htmlspecialchars(filter_input(INPUT_POST, 'desc_fechamento', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
        // $desc_fechamento = filter_input(INPUT_POST, 'desc_fechamento', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $adc = $pdo->prepare("UPDATE `projetos` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$projeto';");
        $adc->bindParam(':desc_fechamento', $desc_fechamento);
        $adc->bindParam(':fechamento', $agora);
        if ($adc->execute()) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `inter_projeto` (`inter_tipo`, `inter_projeto`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$projeto', '$user_id', '$agora', 'Finalizou o projeto. <br> Descrição: $desc_fechamento');");
          if ($adc->execute()) {
            $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O que mais temos para hoje?!";
            $mensagem_cor = "alert-success";
          }
        } else {
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o projeto!";
          $mensagem_cor = "alert-danger";
        }
      }
    }
  }
  ?>
  <?php
  // Verifica de existe o ID de um projeto setado.
  // Se não houver, exibe a parte de CADASTRO projetos
  if (empty($projeto)) {
    if ($m5_01 == 0) {
      header("Location: ../home.php");
    }
  ?>
    <div class="container-fluid">
      <div class="row  justify-content-md-center">
        <div class="col-12 col-sm-12 col-md-11 col-lg-10">
          <div class="card">
            <div class="h6 card-header">
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitação projetos
            </div>
            <div class="card-body py-3">
              <form action="#" method="POST">
                <div class="form-row">
                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Cliente:</label>
                    <select name="cliente" id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="1">
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
                    <label class="my-0 small">Tipo de projeto:</label>
                    <select name="tipo" class="form-control form-control-sm" tabindex="4">
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
                    <select name="categoria" id="categoria" class="form-control form-control-sm" tabindex="5">
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
                    <select name="subcategoria" id="subcategoria" class="form-control form-control-sm" tabindex="6">
                      <option></option>
                    </select>
                  </div>

                  <!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Item:</label>
                    <span class="carregando4 small">Aguarde, carregando...</span>
                    <select name="item" id="item" class="form-control form-control-sm" tabindex="7">
                      <option></option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Nível:</label>
                    <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
                      <option></option>
                      <option value="1">Nível 1</option>
                      <option value="2">Nível 2</option>
                      <option value="3">Nível 3</option>
                      <option value="4">Rotina</option>
                      <option value="5">Administrativo</option>
                      <option value="0">NA</option>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-2">
                    <!-- <label class="my-0 small">Dias:</label>
                    <input type="number" id="dias2" name="dias" min="1" max="999" class="form-control form-control-sm"  tabindex="8">
                     --><!--                    <select name="dias" class="form-control form-control-sm"  tabindex="8">
                      <option></option>
                      <option value="5">1 dia</option>
                      <option value="6">2 dias</option>
                      <option value="7">5 dias</option>
                      <option value="8">15 dias</option>
                      <option value="9">30 dias</option>
                      <option value="10">60 dias</option>
                      <option value="11">90 dias</option>
                      <option value="0">NA</option>
                    </select> -->
                  </div>
                </div>

                <div class="form-row pt-2">

                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Nome do Projeto:</label>
                    <textarea name="nome_proj" class="form-control form-control-sm" rows="1" tabindex="9"></textarea>
                  </div>
                  <div class="form-group col-sm-6 col-md-6">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea name="desc_abertura" class="form-control form-control-sm" rows="1" tabindex="9"></textarea>
                  </div>

                  <div class="form-group col-sm-6 col-md-6">
                    <div class="form-row">

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Tecnico:</label>
                        <select name="tecnico" id="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" tabindex="10">
                          <option></option>
                          <option value="0">Não determinado</option>
                          <?php
                          $pdo = ConnectionN3();
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
                        <label class="my-0 small">Forma de projeto:</label>
                        <select name="forma" class="form-control form-control-sm" tabindex="11">
                          <option value="1">Remoto</option>
                          <option value="2">Presencial</option>
                          <option value="1">Remoto - Plantão</option>
                          <option value="2">Presencial - Plantão</option>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Abertura:</label>
                        <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                      </div>

                      <div class="form-group col-sm-12 col-md-6 pt-3 text-center">
                        <input type="hidden" name="token" value="<?php echo $token; ?>">
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

    <!-- MODAL DE AJUDA PARA CADASTRO projetos -->
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
  // Verifica de existe o ID de um projeto setado.
  // Se não houver, exibe a parte de CADASTRO DE projetos
  if (isset($projeto) && $projeto != 0) { ?>


    <?php
    //  var_dump($projeto);
    //  exit;
    //Busca informações do projeto

    $pdo = ConnectionN3();
    $show_projeto = $pdo->prepare("SELECT projetos.`area`, projetos.`tipo`, projetos.`categoria`, projetos.`subcategoria`, projetos.`item`, projetos.`nivel`, projetos.`local`, projetos.`dias`, projetos.forma, projetos.desc_abertura, projetos.desc_fechamento, projetos.abertura, projetos.fechamento, projetos.reincidente, projetos.`status`, projetos.`tecnico`,
    clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
    pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
    locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
    categorias.cat_nome,
    subcategorias.scat_nome,
    itens.itens_nome,
    usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
    FROM projetos 
    INNER JOIN clientes ON clientes.clt_id = projetos.cliente
    LEFT JOIN pessoas ON pessoas.pessoa_id = projetos.pessoa
    LEFT JOIN locais ON locais.local_id = projetos.`local`
    LEFT JOIN categorias ON categorias.cat_id = projetos.categoria
    LEFT JOIN subcategorias ON subcategorias.scat_id = projetos.subcategoria
    LEFT JOIN itens ON itens.itens_id = projetos.item
    LEFT JOIN usuarios ON usuarios.user_id = projetos.tecnico
    WHERE projetos.id = '$projeto'");
    $show_projeto->execute();
    $row = $show_projeto->fetch(PDO::FETCH_ASSOC);
    // $projeto_desc_abertura = $row["desc_abertura"];
    // $projeto_desc_fechamento = $row["desc_fechamento"];
    // $projeto_hora_abertura = $row["abertura"];
    // $projeto_hora_fechamento = $row["fechamento"];
    // $projeto_reincidente = $row["reincidente"];
    // $projeto_status = $row["status"];
    // $projeto_tipo = $row["tipo"];

    $projeto_desc_abertura   = $row['desc_abertura']   ?? null;
    $projeto_desc_fechamento = $row['desc_fechamento'] ?? null;
    $projeto_hora_abertura   = $row['abertura']        ?? null;
    $projeto_hora_fechamento = $row['fechamento']     ?? null;
    $projeto_reincidente     = $row['reincidente']    ?? 0;
    $projeto_status          = $row['status']         ?? 0;
    $projeto_tipo            = $row['tipo']           ?? null;
    if ($projeto_tipo == 1) {
      $projeto_tipo_nome = "Falha";
    }
    if ($projeto_tipo == 2) {
      $projeto_tipo_nome = "Relacionamento";
    }
    if ($projeto_tipo == 3) {
      $projeto_tipo_nome = "Requisição de Serviços";
    }
    if ($projeto_tipo == 4) {
      $projeto_tipo_nome = "Requisição de informação";
    }
    if ($projeto_tipo == 5) {
      $projeto_tipo_nome = "Notificação de monitoramento";
    }
    if ($projeto_tipo == 0) {
      $projeto_tipo_nome = "Não informado";
    }
    $projeto_dias = $row["dias"] ?? '';
    //    if($projeto_nivel==5){$projeto_nivel_nome="1 dia";}
    //    if($projeto_nivel==6){$projeto_nivel_nome="2 dias";}
    //    if($projeto_nivel==7){$projeto_nivel_nome="5 dias";}
    //    if($projeto_nivel==8){$projeto_nivel_nome="15 dias";}
    //    if($projeto_nivel==9){$projeto_nivel_nome="30 dias";}
    //    if($projeto_nivel==10){$projeto_nivel_nome="60 dias";}
    //    if($projeto_nivel==11){$projeto_nivel_nome="90 dias";}


    $projeto_nivel = $row["nivel"] ?? '';
    if ($projeto_nivel == 0) {
      $projeto_nivel_nome = "Não informado";
    }
    if ($projeto_nivel == 1) {
      $projeto_nivel_nome = "Nível 1";
    }
    if ($projeto_nivel == 2) {
      $projeto_nivel_nome = "Nível 2";
    }
    if ($projeto_nivel == 3) {
      $projeto_nivel_nome = "Nível 3";
    }
    if ($projeto_nivel == 4) {
      $projeto_nivel_nome = "Rotina";
    }
    if ($projeto_nivel == 5) {
      $projeto_nivel_nome = "Administrativo";
    }


    // $projeto_forma = $row["forma"] ?? '';

    // $clt_id = $row["clt_id"];
    // $clt_nomer = $row["clt_nomer"];
    // $clt_nomef = $row["clt_nomef"];
    // $clt_cnpj = $row["clt_cnpj"];

    // $pessoa_nom = $row["pessoa_nom"];
    // $pessoa_cargo = $row["pessoa_cargo"];
    // $pessoa_tel = $row["pessoa_tel"];
    // $pessoa_mail = $row["pessoa_mail"];

    // $local = $row["local"];
    // $local_nom = $row["local_nom"];
    // if ($local == 0) {
    //   $local_nom = "Não informado";
    // }
    // $local_end = $row["local_end"];
    // $local_city = $row["local_city"];
    // $local_uf = $row["local_uf"];
    // $projeto_cat = $row["categoria"];
    // $projeto_item = $row["item"];
    // $cat_nome = $row["cat_nome"];
    // $projeto_scat = $row["subcategoria"];
    // $scat_nome = $row["scat_nome"];
    // $projeto_itens_nome = $row["itens_nome"];

    // $tecnico_nome = $row["tecnico_nome"];
    // $tecnico_id = $row["tecnico"];
    // if ($tecnico_id == 0) {
    //   $tecnico_nome = "Não Atribuído";
    // }

    $projeto_forma = $row["forma"] ?? '';

    $clt_id    = $row["clt_id"]    ?? 0;
    $clt_nomer = $row["clt_nomer"] ?? '';
    $clt_nomef = $row["clt_nomef"] ?? '';
    $clt_cnpj  = $row["clt_cnpj"]  ?? '';

    $pessoa_nom   = $row["pessoa_nom"]   ?? '';
    $pessoa_cargo = $row["pessoa_cargo"] ?? '';
    $pessoa_tel   = $row["pessoa_tel"]   ?? '';
    $pessoa_mail  = $row["pessoa_mail"]  ?? '';

    $local       = $row["local"]       ?? 0;
    $local_nom   = $row["local_nom"]   ?? 'Não informado';
    $local_end   = $row["local_end"]   ?? '';
    $local_city  = $row["local_city"]  ?? '';
    $local_uf    = $row["local_uf"]    ?? '';

    $projeto_cat      = $row["categoria"]   ?? 0;
    $projeto_item     = $row["item"]        ?? 0;
    $cat_nome         = $row["cat_nome"]    ?? '';
    $projeto_scat     = $row["subcategoria"] ?? 0;
    $scat_nome        = $row["scat_nome"]   ?? '';
    $projeto_itens_nome = $row["itens_nome"] ?? '';

    $tecnico_nome = $row["tecnico_nome"] ?? 'Não Atribuído';
    $tecnico_id   = $row["tecnico"]      ?? 0;
    if ($tecnico_id == 0) {
      $tecnico_nome = "Não Atribuído";
    }




    //verifico se existe alguma requisição POST chamada action
    $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

    //verifico se existe alguma requisição via post cahamda tarefa
    $tarefa = filter_input(INPUT_POST, 'tarefa', FILTER_SANITIZE_NUMBER_INT);

    if ($action == "alterar_senha") {
      include_once("../all/update_senha.php");
    }

    if ($usar_token == "true") {
      if ($action) {
        if ($action == "new_tarefa") {
          $nome_tarefa = htmlspecialchars(filter_input(INPUT_POST, 'nome_tarefa', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
          // $nome_tarefa = filter_input(INPUT_POST, 'nome_tarefa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
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
          $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
          $dias = filter_input(INPUT_POST, 'dias', FILTER_SANITIZE_NUMBER_INT);
          $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
          $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
          $dependencia = filter_input(INPUT_POST, 'dependencia', FILTER_SANITIZE_FULL_SPECIAL_CHARS);


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


          //SELECIONAR TABELA PROJETO PARA `PEGAR` O ID DO PROJETO




          //INICIA PROCESSO DE GRAVAÇÃO DO TAREFA NA BASE DE DADOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("INSERT INTO `tarefas` (`id_projeto`,`nome_tarefa`, `cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `dias`,`tarefas_relacionadas`) VALUES (:id_projeto,:nome_tarefa, :cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$tarefa_sts', :dias , :dependencia);");
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
          $adc->bindParam(':dias', $dias);
          $adc->bindParam(':id_projeto', $projeto);
          $adc->bindParam(':dependencia', $dependencia);



          //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
          //if($tecnico>0 && $tecnico!= $user_id){
          //}

          if ($adc->execute()) {
            $tarefa = $pdo->lastInsertId();
            $mensagem = "<i class=\"fas fa-check\"></i> Tarefa cadastrada!";
            $mensagem_cor = "alert-success";
            $log = "true";

            //cadastra abertura do tarefa na tabela de interatividade
            $pdo = ConnectionN3();
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
      }
    }
    ?>
    <div class="container-fluid">
      <div class="row mt-2">
        <div class="col-md-3 px-1">

          <div class="card">
            <div class="card-header py-1 h6 pt-2 pb-2">
              <i class="fas fa-headset text-danger"></i> projeto #<?php echo str_pad($projeto, 5, '0', STR_PAD_LEFT); ?>
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
                      <strong>Classificação do projeto:</strong>
                    </div>
                    <?php if ($m3_01 == 3) { ?>
                      <div class="col-2 text-right">
                        <button type="button" class="btn btn-outline-secondary btn-sm small" data-toggle="modal" data-target="#projeto_edt"> <i class="far fa-edit"></i></button>
                      </div>
                    <?php } ?>
                  </div>
                </li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center">
                  <?php if ($projeto_forma == 1) { ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> projeto Remoto <?php } ?>
                  <?php if ($projeto_forma == 2) { ?> <i class="fas fa-briefcase mr-2 text-danger"></i> projeto Presencial <?php } ?>
                  <span class="badge badge-warning ml-3"><?php echo $projeto_dias; ?> Dias<span>
                      <?php if ($projeto_reincidente == 1) { ?>
                        <i class=" ml-3 fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
                      <?php } ?>
                </li>
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-archive mr-2"></i><?php echo $projeto_tipo_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-folder-open ml-3 mr-2"></i><?php echo $cat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-file-alt ml-5 mr-2 text-primary"></i><?php echo $scat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-list-ol ml-5 pl-4 mr-2"></i><?php echo $projeto_itens_nome; ?></li>
              </ul>


              <?php if ($projeto_status == 0) { ?>
                <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Projeto Agendado </button>
              <?php } ?>
              <?php if ($projeto_status == 1) { ?>
                <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="fas fa-hourglass-half"></i> Aguardando Execução </button>
              <?php } ?>
              <?php if ($projeto_status == 2) { ?>
                <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Projeto em Execução </button>
              <?php } ?>
              <?php if ($projeto_status == 3) { ?>
                <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Projeto em Espera </button>
              <?php } ?>
              <?php if ($projeto_status == 4) { ?>
                <button type="button" class="btn btn-success btn-sm btn-block text-center text-dark"> <i class="fas fa-check"></i> Projeto Finalizado </button>
              <?php } ?>


              <?php
              if ($projeto_status == 2) {
                $exibe_bt_cont_new_tarefa = true;
              } else {
                $exibe_bt_cont_new_tarefa = false;
              }
              ?>
              <?php
              //ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

              //SE NºO HOUVER TÉCNICO ATRIBUÍDO PARA O PROJETO
              if ($tecnico_id == 0) {
                $exibe_bt_projeto_aceitar = true;
              }

              //SE O PROJETO ESTIVER AGUARDANDO E O USUÁRIO FOR O TÉCNICO
              if ($projeto_status == 1 && $tecnico_id == $user_id) {
                $exibe_bt_projeto_aceitar = true;
              }

              //SE O PROJETO ESTIVER EM ESPERA E O USUÁRIO FOR O TÉCNICO
              if ($projeto_status == 3 && $tecnico_id == $user_id) {
                $exibe_bt_projeto_retomar = true;
              }

              //SE O PROJETO ESTIVER EM EXECUÇÃO E O USUÁRIO FOR O TÉCNICO
              if ($projeto_status == 2 && $tecnico_id == $user_id) {
                $exibe_bt_projeto_devolver = true;
                /* $exibe_bt_projeto_espera = true; */
                /* $exibe_bt_projeto_finalizar = true; */
              }

              //ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM A PERMISSÃO DO USUÁRIO
              if ($m3_02 == 0) {
                $exibe_bt_projeto_aceitar = false;
                /* $exibe_bt_projeto_finalizar = false; */
              }
              if ($m3_03 == 0) {
                  /* $exibe_bt_projeto_espera = false */;
              }
              if ($m3_04 == 0) {
                $exibe_bt_projeto_devolver = false;
              }


              if ($m3_05 == 2) { //se usuário com permissão para editar projetos de terceiros
                if ($projeto_status == 3) {
                  $exibe_bt_projeto_retomar = true;
                }
                $exibe_bt_projeto_devolver = true;
                if ($projeto_status == 2) {
                  /* $exibe_bt_projeto_espera = true; */
                }
                if ($projeto_status > 1 && $projeto_status < 4) {
                  /* $exibe_bt_projeto_finalizar = true; */
                }
              }

              ?>
              <?php if ($exibe_bt_projeto_interacao == true) { ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_new_inter"> <i class="fas fa-headset"></i> Nova Interação </button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_aceitar == true) { ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_aceitar"> <i class="far fa-arrow-alt-circle-down"></i> Iniciar ou Direcionar </button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_retomar == true) { ?>
                <!-- <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_retomar"> <i class="far fa-arrow-alt-circle-down"></i> Retomar </button>
                </div> -->
              <?php } ?>
              <?php if ($exibe_bt_projeto_espera == true) { ?>
                <!-- <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-warning btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_espera"> <i class="far fa-pause-circle"></i> Colocar em Espera </button>
                </div> -->
              <?php } ?>
              <?php if ($exibe_bt_projeto_devolver == true) { ?>
                <div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-danger btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_recusar"> <i class="far fa-arrow-alt-circle-up"></i> Recusar </button>
                </div>
              <?php } ?>
              <?php if ($exibe_bt_projeto_finalizar == true) { ?>
                <<!-- div class="col-12 px-1">
                  <button type="button" class="btn btn-outline-primary btn-sm btn-block text-center text-dark" data-toggle="modal" data-target="#projeto_finalizar"> <i class="far fa-check-circle"></i> Finalizar </button>
            </div> -->
          <?php } ?>
          <?php if ($exibe_bt_cont_new_tarefa == true) { ?>
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
                <i class="fas fa-check"></i> Açães
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
                <input class="form-control form-control-sm" value="<?php echo $time_limit_to_close = date("d/m/y H:i", strtotime($projeto_hora_abertura . " +20 hours")); ?>" disabled="">
              </div>

              <div class="form-group col-sm-4 col-md-4">
                <label class="my-0 small">Tecnico:</label>
                <input class="form-control form-control-sm" value="<?php echo $tecnico_nome; ?>" disabled="">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-sm-12">
                <label class="my-0 small">Descrição de abertura:</label>
                <textarea class="form-control form-control-sm" rows="4" disabled=""><?php echo $projeto_desc_abertura; ?></textarea>
              </div>
            </div>
            <?php if ($projeto_status == 4) { ?>
              <div class="form-row">
                <div class="form-group col-sm-12">
                  <label class="my-0 small">Descrição de fechamento:</label>
                  <textarea class="form-control form-control-sm" rows="3" disabled=""><?php echo $projeto_desc_fechamento; ?></textarea>
                </div>
              </div>
            <?php } ?>
            <div class="row">
            </div>
          </div>


          <?php
          //ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM O STATUS DO CHAMADO

          //SE NºO HOUVER TÉCNICO ATRIBUÍDO PARA O PROJETO
          if ($tecnico_id == 0) {
            $exibe_bt_projeto_aceitar = true;
          }

          //SE O PROJETO ESTIVER AGUARDANDO E O USUÁRIO FOR O TÉCNICO
          if ($projeto_status == 1 && $tecnico_id == $user_id) {
            $exibe_bt_projeto_aceitar = true;
          }

          //SE O PROJETO ESTIVER EM ESPERA E O USUÁRIO FOR O TÉCNICO
          if ($projeto_status == 3 && $tecnico_id == $user_id) {
            $exibe_bt_projeto_retomar = true;
          }

          //SE O PROJETO ESTIVER EM EXECUÇÃO E O USUÁRIO FOR O TÉCNICO
          if ($projeto_status == 2 && $tecnico_id == $user_id) {
            $exibe_bt_projeto_devolver = true;
            /* $exibe_bt_projeto_espera = true; */
            /* $exibe_bt_projeto_finalizar = true; */
          }

          //ANALISA E ALTERA REGRAS PARA EXIBIÇÃO DE BOTÕES, MODAIS, ETC DE ACORDO COM A PERMISSÃO DO USUÁRIO
          if ($m3_02 == 0) {
            $exibe_bt_projeto_aceitar = false;
            /* $exibe_bt_projeto_finalizar = false; */
          }
          if ($m3_03 == 0) {
            /* $exibe_bt_projeto_espera = false; */
          }
          if ($m3_04 == 0) {
            $exibe_bt_projeto_devolver = false;
          }


          if ($m3_05 == 2) { //se usuário com permissão para editar projetos de terceiros
            if ($projeto_status == 3) {
              $exibe_bt_projeto_retomar = true;
            }
            $exibe_bt_projeto_devolver = true;
            if ($projeto_status == 2) {
              $exibe_bt_projeto_espera = true;
            }
            if ($projeto_status > 1 && $projeto_status < 4) {
              /* $exibe_bt_projeto_finalizar = true; */
            }
          }

          ?>
          <!-- Será add nova sequência de tarefas -->
          <?php


          $projeto = $_POST['projeto'] ?? $_GET['projeto'] ?? 0;


          $f_sts = $_POST['f_sts'] ?? 11;
          if ($f_sts == 10) {
            $p_sts = "0,1,2,3,4";
          } elseif ($f_sts == 11) {
            $p_sts = "1,2,3";
          } else {
            $p_sts = (string)$f_sts;
          }

          $f_clt = $_POST['f_clt'] ?? 0;
          $p_clt = ($f_clt == 0) ? "%" : $f_clt;

          $f_sol = $_POST['f_sol'] ?? 0;
          $p_sol = ($f_clt == 0 || $f_sol == 0) ? "%" : $f_sol;

          $f_tec = $_POST['f_tec'] ?? 'all';
          $p_tec = ($f_tec === 'all') ? "%" : $f_tec;


          // --- NOVA LÓGICA DE ORDENAÇÃO ---

          $ord = $_POST['ord'] ?? 'cliente';
          $dir = $_POST['dir'] ?? 'ASC'; // Padrão inicial é ASC

          $proxima_dir = ($dir === 'ASC') ? 'DESC' : 'ASC';

          $direcao = ($dir === 'DESC') ? 'DESC' : 'ASC'; // Garante que só pode ser ASC ou DESC

          switch ($ord) {
            case 'abertura':
              $order_by = "tarefas.abertura $direcao";
              break;
            case 'tecnico':
              $order_by = "tecnico_nome $direcao";
              break;
            case 'status':
              $order_by = "tarefas.status $direcao";
              break;
            case 'forma':
              $order_by = "tarefas.forma $direcao";
              break; // Adicionado DESC como padrão
            case 'cliente':
            default:
              $order_by = "tarefas.abertura $direcao";
              break;
          }

          ?>



          <?php
          //BUSCA TODOS AS TAREFAS QUE ESTÃO AGENDADOS (STATUS = 0)
          //COMPARA DATA HORA DO AGENDAMENTO COM DATA HORA ATUAL
          //SE DATA HORA ATUAL MAIOR QUE DATA HORA DE AGENDAMENTO
          //ALTERA O STATUS DO ATENDIMENTO PARA 1 (AGUARDANDO EXECUÇÃO)
          //REGISTRA ALTERAÇÃO NA TABELA DE INTERATIVIDADE
          $time_now = date("Y-m-d H:i:s");
          $pdo = ConnectionN3();
          $show_tarefas = $pdo->prepare("SELECT tarefas.id, tarefas.abertura, tarefas.id_projeto FROM tarefas WHERE tarefas.`status` = '0'");
          $show_tarefas->execute();
          while ($exibe = $show_tarefas->fetch(PDO::FETCH_ASSOC)) {
            $tarefas = $exibe["id"];
            $tarefas_agendamento = $exibe["abertura"];
            if (strtotime($time_now) > strtotime($tarefas_agendamento)) {
              //altera o status do atendimento para 1 (Aguardando execução)
              $edt = $pdo->prepare("UPDATE `tarefas` SET `status`='1' WHERE  `id`='$tarefas';");
              if ($edt->execute()) {
                //insere o registro de uma nova interação 
                $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('1', '$tarefas', '1', '$time_now', 'Status do atendimento alterado automaticamente para Aguardando Execução.');");
                if ($adc->execute()) {
                } else {
                  $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao adicionar registro na tabela de interação!";
                  $mensagem_cor = "alert-danger";
                }
              }
            }
          }


          ?>


        </div>
        <div class="card">
          <div class="card-header py-1 h6 pt-2 pb-2">
            <a href="#" data-toggle="collapse" data-target="#gcst" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
              <i class="fas fa-file-invoice-dollar"></i> Tarefas do Projeto <i class="icon-action fa fa-chevron-down"></i>
            </a>
          </div>
          <div id="gcst">
            <div class="card-body p-0">

              <div class="card-body p-0" style="overflow-x: auto;">
                <table class="table table-hover small">
                  <thead>
                    <tr>

                      <th class="p-1">
                        <form action="projeto.php" method="POST"> <input type="hidden" name="projeto" value="<?= htmlspecialchars($projeto) ?>">

                          <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                          <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                          <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                          <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                          <input type="hidden" name="ord" value="cliente">
                          <input type="hidden" name="dir" value="<?= ($ord === 'cliente') ? $proxima_dir : 'ASC' ?>">
                          <button type="submit" onclick="event.stopPropagation();" class="btn btn-light btn-sm btn-block text-left <?= ($ord === 'cliente') ? 'coluna-ativa' : '' ?>">
                            <i class="fas fa-sort-amount-down-alt"></i> Cliente
                          </button>
                        </form>
                      </th>
                      <th class="p-1">
                        <form action="projeto.php" method="POST"> <input type="hidden" name="projeto" value="<?= htmlspecialchars($projeto) ?>">

                          <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                          <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                          <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                          <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                          <input type="hidden" name="ord" value="abertura">
                          <input type="hidden" name="dir" value="<?= ($ord === 'abertura') ? $proxima_dir : 'ASC' ?>">
                          <button type="submit" onclick="event.stopPropagation();" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Abertura</button>
                        </form>
                      </th>
                      <th class="p-1">
                        <button type="submit" class="btn btn-light btn-sm btn-block">Categoria</button>
                      </th>

                      <th class="p-1">
                        <form action="projeto.php" method="POST"> <input type="hidden" name="projeto" value="<?= htmlspecialchars($projeto) ?>">

                          <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                          <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                          <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                          <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                          <input type="hidden" name="ord" value="forma">
                          <input type="hidden" name="dir" value="<?= ($ord === 'forma') ? $proxima_dir : 'ASC' ?>">
                          <button type="submit" onclick="event.stopPropagation();" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i></button>
                        </form>
                      </th>
                      <th class="p-1">

                        <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                        <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                        <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                        <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">

                      </th>
                      <th class="p-1">
                        <form action="projeto.php" method="POST"> <input type="hidden" name="projeto" value="<?= htmlspecialchars($projeto) ?>">

                          <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                          <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                          <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                          <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                          <input type="hidden" name="ord" value="tecnico">
                          <input type="hidden" name="dir" value="<?= ($ord === 'tecnico') ? $proxima_dir : 'ASC' ?>">

                          <button type="submit" onclick="event.stopPropagation();" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Tecnico</button>
                        </form>
                      </th>
                      <th class="p-1">
                        <form action="projeto.php" method="POST"> <input type="hidden" name="projeto" value="<?= htmlspecialchars($projeto) ?>">

                          <input type="hidden" name="f_clt" value="<?php echo $f_clt; ?>">
                          <input type="hidden" name="f_sts" value="<?php echo $f_sts; ?>">
                          <input type="hidden" name="f_tec" value="<?php echo $f_tec; ?>">
                          <input type="hidden" name="f_sol" value="<?php echo $f_sol; ?>">
                          <input type="hidden" name="ord" value="status">
                          <input type="hidden" name="dir" value="<?= ($ord === 'status') ? $proxima_dir : 'ASC' ?>">
                          <button type="submit" onclick="event.stopPropagation();" class="btn btn-light btn-sm btn-block"><i class="fas fa-sort-amount-down-alt"></i> Status</button>
                        </form>
                      </th>
                      <th class="p-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php
                    $pdo = ConnectionN3();
                    $show_tarefas = $pdo->prepare("SELECT tarefas.id as id_tarefa,tarefas.`id_projeto`, tarefas.`nome_tarefa`, tarefas.`tipo`, tarefas.`local`, tarefas.dias, tarefas.forma, tarefas.desc_abertura, tarefas.desc_fechamento, tarefas.abertura, tarefas.fechamento, tarefas.tecnico, tarefas.reincidente, tarefas.`status`,
                          clientes.clt_id, clientes.clt_nomer, clientes.clt_nomef, clientes.clt_cnpj,
                          pessoas.pessoa_nom, pessoas.pessoa_cargo, pessoas.pessoa_tel, pessoas.pessoa_mail,
                          locais.local_nom, locais.local_end, locais.local_city, locais.local_uf,
                          projetos.id,
                          categorias.cat_nome,
                          subcategorias.scat_nome,
                          itens.itens_nome,
                          usuarios.user_nome AS tecnico_nome, usuarios.user_cel AS tecnico_tel, usuarios.user_mail AS tecnico_mail
                          FROM tarefas
                          LEFT JOIN pessoas ON pessoas.pessoa_id = tarefas.pessoa
                          LEFT JOIN projetos ON projetos.id = id_projeto
                          INNER JOIN clientes ON clientes.clt_id = projetos.cliente
                          LEFT JOIN locais ON locais.local_id = tarefas.`local`
                          LEFT JOIN categorias ON categorias.cat_id = tarefas.categoria
                          LEFT JOIN subcategorias ON subcategorias.scat_id = tarefas.subcategoria
                          LEFT JOIN itens ON itens.itens_id = tarefas.item
                          LEFT JOIN usuarios ON usuarios.user_id = tarefas.tecnico
                          WHERE tarefas.id_projeto = $projeto
                          AND clientes.clt_id LIKE '$p_clt'
                          AND tarefas.tecnico LIKE '$p_tec'  
                          AND tarefas.pessoa LIKE '$p_sol'  
                          ORDER BY $order_by
                          ");
                    $show_tarefas->execute();
                    while ($row = $show_tarefas->fetch(PDO::FETCH_ASSOC)) {
                      $tarefa = $row["id_tarefa"];
                      $id_projeto = $row["id_projeto"];
                      $nome_tarefa = $row["nome_tarefa"];
                      $tarefas_desc_abertura = $row["desc_abertura"];
                      $tarefas_desc_fechamento = $row["desc_fechamento"];
                      $tarefas_hora_abertura = $row["abertura"];
                      $tarefas_hora_fechamento = $row["fechamento"];
                      $tarefas_reincidente = $row["reincidente"];
                      $tarefas_status = $row["status"];
                      $tarefas_tipo = $row["tipo"];
                      if ($tarefas_tipo == 1) {
                        $tarefas_tipo = "Falha";
                      }
                      if ($tarefas_tipo == 2) {
                        $tarefas_tipo = "Requisição de Serviços";
                      }
                      if ($tarefas_tipo == 3) {
                        $tarefas_tipo = "Requisição de informação";
                      }
                      if ($tarefas_tipo == 4) {
                        $tarefas_tipo = "Notificação de monitoramento";
                      }
                      if ($tarefas_tipo == 0) {
                        $tarefas_tipo = "Não informado";
                      }
                      $tarefas_dias = $row["dias"];
                      //if($tarefas_nivel==0){$tarefas_niveln="Não informado"; $sla = $sla_n1;}
                      //if($tarefas_nivel==5){$tarefas_niveln="1 dia"; $sla = $sla_n5;}
                      //if($tarefas_nivel==6){$tarefas_niveln="2 dias"; $sla = $sla_n6;}
                      //if($tarefas_nivel==7){$tarefas_niveln="5 dias"; $sla = $sla_n7;}
                      //if($tarefas_nivel==8){$tarefas_niveln="15 dias"; $sla = $sla_n8;}
                      //if($tarefas_nivel==9){$tarefas_niveln="30 dias"; $sla = $sla_n9;}
                      //if($tarefas_nivel==10){$tarefas_niveln="60 dias"; $sla = $sla_n10;}
                      //if($tarefas_nivel==11){$tarefas_niveln="90 dias"; $sla = $sla_n11;}


                      $tarefas_forma = $row["forma"];

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
                      $time_limit_to_close = date("Y-m-d H:i:s", strtotime($tarefas_hora_abertura . " + minutes"));
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

                      /* if ($tarefas_status == 3) {
                                $pdo = ConnectionN3();
                                $show_espera = $pdo->prepare("SELECT espera.espera_start, espera.espera_prev FROM espera_tarefas WHERE espera.espera_tarefas = '$tarefa' ORDER BY espera_id DESC LIMIT 0,1");
                                $show_espera->execute();
                                $exibe_espera = $show_espera->fetch(PDO::FETCH_ASSOC);
                                $espera_start = $exibe_espera["espera_start"] ?? '';
                                $espera_prev = $exibe_espera["espera_prev"] ?? '';

                                //VERIFICA DE DATA HORA ATUAL FOR MAIOR DO QUE DATA HORA PREVISTA PARA RETOMADA
                                //SE POSITIVO:
                                if (strtotime($time_now) > strtotime($espera_prev)) {
                                  //MUDA STATUS DO PEDIDO PARA 2 (EM EXECUÇÃO)
                                  //ALTERA A INFORMAÇÃO DE ESPERA NA TABELA DE ESPERAS
                                  //INSERE REGISTRO DE INTERAÇÃO NA TABELA DE INTERAÇÃO
                                  $pdo = ConnectionN3();

                                  //altera o status do atendimento para 2 (Em execução)
                                  $edt = $pdo->prepare("UPDATE `tarefas` SET `status`='2' WHERE  `id`='$tarefa';");
                                  if ($edt->execute()) {
                                    //busca o ID do registro de espera, na tabela espera
                                    $show_espera = $pdo->prepare("SELECT espera.espera_id FROM espera_tarefas WHERE espera.espera_tarefas = '$tarefa' ORDER BY espera.espera_id DESC LIMIT 0,1");
                                    $show_espera->execute();
                                    $exibe = $show_espera->fetch(PDO::FETCH_ASSOC);
                                    $espera_id = $exibe["espera_id"];

                                    //registra A data hora final de espera, na tabela espera
                                    $edt_espera = $pdo->prepare("UPDATE `espera` SET `espera_end`='$time_now' WHERE `espera_id`='$espera_id';");
                                    if ($edt_espera->execute()) {

                                      //insere o registro de uma nova interação 
                                      $adc = $pdo->prepare("INSERT INTO `inter_tarefa` (`inter_tipo`, `inter_tarefa`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('6', '$tarefa', '1', '$time_now', 'Status do atendimento alterado automaticamente para Em Execução.');");
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
                                  //DEFINE A DATA HORA DO INÍCIO DA ESPERA COMO A DATA HORA ATUAL PARA CALCULAR QUANTO TEMPO FALTA PARA ENCERRAR O PRAZO DE PROJETO
                                  $time_now = $espera_start;
                                  $start_date = new DateTime($espera_start);
                                }
                              } */


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
                      if ($tarefas_status == 4) {
                        $progress_color = "green";
                        $progress_width = "100";
                        $tag = "ok";
                      }

                      //BUSCA A ÚLTIMA INTERAÇÃO QUE HOUVE NO CHAMADO
                      $pdo = ConnectionN3();
                      $show_inter = $pdo->prepare("SELECT inter_tarefa.inter_data FROM inter_tarefa WHERE inter_tarefa.inter_tarefa = '$tarefa' AND inter_tarefa.inter_tipo > '0' ORDER BY inter_id DESC LIMIT 0,1");
                      $show_inter->execute();
                      $exibe_inter = $show_inter->fetch(PDO::FETCH_ASSOC);

                      $last_inter_data = $exibe_inter["inter_data"];
                      $end_date = new DateTime($time_now);
                      $start_date = new DateTime("$last_inter_data");
                      $interval = $start_date->diff($end_date);
                      $hours   = $interval->format('%h');
                      $minutes = $interval->format('%i');
                      $time_last_inter = $hours * 60 + $minutes;
                    ?>
                      <tr>

                        <td class="align-middle">
                          <!-- <strong><?php echo substr($nome_tarefa, 0, 35); ?></strong><br> -->
                          <?php echo substr($clt_nomer, 0, 35); ?>
                          <?php if ($pessoa_nom != "") { ?> <br> <i class="far fa-user mr-1"></i> <?php echo $pessoa_nom;
                                                                                                } ?>
                        </td>
                        <td class="align-middle text-start">
                          <?php echo $dt1 = date('d/m/y', strtotime($tarefas_hora_abertura)); ?>
                          às
                          <?php echo $dt1 = date('H:i', strtotime($tarefas_hora_abertura)); ?> h
                          <br>
                          <?php echo $tarefas_desc_abertura; ?><br>

                        </td>
                        <td>
                          <?php echo $cat_nome; ?> <br /> <?php echo $scat_nome; ?> <br /> <?php echo $itens_nome; ?>

                        <th class="align-middle">
                          <?php if ($tarefas_forma == 1) { ?> <i class="fas fa-laptop-house text-primary" title="Remoto"></i> <?php } ?>
                          <?php if ($tarefas_forma == 2) { ?> <i class="fas fa-briefcase text-danger" title="Presencial"></i> <?php } ?>
                        </th>
                        <td class="align-middle">
                        </td>
                        <td class="align-middle">
                          <?php //se atendimento aberto e com mais de 20 minutos sem interação, mostra sino piscando
                          if ($tarefas_status > 0 && $tarefas_status < 3) { ?>

                          <?php } ?>
                          <?php echo $tecnico_nome; ?>
                        </td>
                        <td class="align-middle">
                          <?php if ($tarefas_status == 0) { ?>
                            <i class="far fa-clock"></i> Agendado
                          <?php } ?>
                          <?php if ($tarefas_status == 1) { ?>
                            <i class="fas fa-hourglass-half"></i> Aguardando
                          <?php } ?>
                          <?php if ($tarefas_status == 2) { ?>
                            <i class="fas fa-magic"></i> Em Execução
                          <?php } ?>
                          <?php if ($tarefas_status == 3) { ?>
                            <i class="far fa-pause-circle"></i> Em Espera
                          <?php } ?>
                          <?php if ($tarefas_status == 4) { ?>
                            <i class="fas fa-check"></i> Finalizada
                          <?php } ?>
                        </td>

                        <td class="align-middle p-1">
                          <form action="tarefa.php" method="POST">
                            <input type="hidden" name="tarefa" value="<?php echo $tarefa; ?>">
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

        <div class="card">
          <div class="card-header py-1 h6 pt-2 pb-2">
            <button type="button" class="btn btn-dark btn-sm p-1 col-12" data-toggle="modal" data-target="#relacionar">Relacionar Tarefas</button>
            <!-- <button type="submit" class="btn btn-dark btn-sm p-1 col-12">Relacionar Tarefas</button> -->
          </div>
        </div>

        <div class="card">
          <?php
          $pdo = ConnectionN3();

          // Verifica total de dias das tarefas do projeto
          $stmt = $pdo->prepare("SELECT SUM(dias) as total_dias FROM tarefas WHERE id_projeto = :projeto");
          $stmt->bindParam(':projeto', $projeto, PDO::PARAM_INT);
          $stmt->execute();
          $resultado = $stmt->fetch(PDO::FETCH_ASSOC);
          $total_dias = $resultado['total_dias'] ?? 0;

          // Atualiza o total de dias no projeto
          $update = $pdo->prepare("UPDATE projetos SET dias = :dias WHERE id = :projeto");
          $update->bindParam(':dias', $total_dias, PDO::PARAM_INT);
          $update->bindParam(':projeto', $projeto, PDO::PARAM_INT);
          $update->execute();

          // Verifica se existem tarefas com dias > 0
          $stmt = $pdo->prepare("SELECT COUNT(*) FROM tarefas WHERE id_projeto = :projeto AND dias > 0");
          $stmt->bindParam(':projeto', $projeto, PDO::PARAM_INT);
          $stmt->execute();
          $tem_tarefas = $stmt->fetchColumn() > 0;

          // Verifica se existem interaçães válidas
          $stmt = $pdo->prepare("SELECT COUNT(*) FROM inter_tarefa WHERE inter_tipo > 0");
          $stmt->execute();
          $tem_interacoes = $stmt->fetchColumn() > 0;
          ?>



          <div class="card-header py-1 h6 pt-2 pb-2">
            <a href="#" data-toggle="collapse" data-target="#gcst2" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
              <i class="fas fa-file-invoice-dollar"></i> Gantt <i class="icon-action fa fa-chevron-down"></i>
              <?= $total_dias ?> Dias
            </a>
          </div>

          <div id="gcst2">
            <div class="card-body p-0">
              <!-- <div class="col-12 border-bottom"> -->
              <!-- <div class="row py-2"> -->
              <!-- <div class="card-body p-0" style="overflow: scroll"> -->
              <?php if ($tem_tarefas && $tem_interacoes) : ?>
                <div id="chartContainer" style="width: 100%; height: 300px;">
                  <div class="p-2 pr-4" id="chart_div" style="width: 100%; height: 100%;overflow: scroll"></div>
                </div>
              <?php else : ?>
                <div class="alert alert-warning m-3">
                  Nenhuma tarefa adicionada ao projeto.
                </div>
              <?php endif; ?>
              <!-- </div> -->
              <!-- </div> -->
              <!-- </div> -->
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header py-1 h6 pt-2 pb-2">
            <a href="#" data-toggle="collapse" data-target="#relat" aria-expanded="true" style="color:#000000 !important; text-decoration:none;">
              <i class="fas fa-file-invoice-dollar"></i> Relatério do Projeto - Tarefas Finalizadas: <i class="icon-action fa fa-chevron-down"></i>
            </a>
          </div>

          <div id="relat" class="collapse show">
            <div class="card-body p-0">
              <div class="col-12 border-bottom">
                <div class="row py-2">
                  <div class="card-body p-0" style="overflow: scroll">
                    <?php
                    $stmt = $pdo->prepare("SELECT status FROM projetos WHERE id = :id_projeto");
                    $stmt->bindParam(':id_projeto', $projeto, PDO::PARAM_INT);
                    $stmt->execute();
                    $status = (int)$stmt->fetchColumn();

                    if ($status >= 2) :
                    ?>
                      <table border="1" bgcolor="lightblue" width="99%">
                        <tr align="center">
                          <td>Tarefa:</td>
                          <td>Data de Início:</td>
                          <td>Data de Fim:</td>
                          <td>Tempo de Espera:</td>
                          <td>Tempo de Execução:</td>
                        </tr>

                        <?php
                        $stmt = $pdo->prepare("SELECT * FROM gantt WHERE id_projeto = :id_projeto and status_tarefa = 4 ORDER BY inicio_tarefa ASC");
                        $stmt->bindParam(':id_projeto', $projeto, PDO::PARAM_INT);
                        $stmt->execute();

                        $tempo_total = $tempo_espera = ['H' => 0, 'M' => 0, 'S' => 0];

                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) :
                          $inicio = new DateTimeImmutable($row['inicio_tarefa']);
                          $fim = $row['finalizou_tarefa'] ? new DateTimeImmutable($row['finalizou_tarefa']) : new DateTimeImmutable();

                          $id_tarefa = $row['id_tarefa'];

                          $nome = $row['nome_tarefa'];
                          $exec = [
                            'H' => abs((int)$row['horas_total']),
                            'M' => abs((int)$row['minutos_total']),
                            'S' => abs((int)$row['segundos_total'])
                          ];
                          $espera = [
                            'H' => abs((int)$row['hora_espera']),
                            'M' => abs((int)$row['minutos_espera']),
                            'S' => abs((int)$row['segundos_espera'])
                          ];

                          foreach (['H', 'M', 'S'] as $unit) {
                            $tempo_total[$unit] += $exec[$unit];
                            $tempo_espera[$unit] += $espera[$unit];
                          }

                          $tempo_inicio_tarefa = $inicio->format('d/m/Y');
                          $tempo_final_tarefa = $fim->format('d/m/Y');

                          $tempo_exec_str = sprintf('%02d:%02d:%02d', $exec['H'], $exec['M'], $exec['S']);
                          $tempo_espera_str = sprintf('%02d:%02d:%02d', $espera['H'], $espera['M'], $espera['S']);
                        ?>
                          <tr>

                            <td><?= htmlspecialchars('#' . $id_tarefa . ' - ' . $nome) ?></td>
                            <td align="center">
                              <h6><?= $tempo_inicio_tarefa ?></h6>
                            </td>
                            <td align="center">
                              <h6><?= $tempo_final_tarefa ?></h6>
                            </td>
                            <td align="center">
                              <h6><?= $tempo_espera_str ?></h6>
                            </td>
                            <td align="center">
                              <h6><?= $tempo_exec_str ?></65>
                            </td>
                          </tr>
                        <?php endwhile;

                        // Ajuste de minutos e segundos
                        foreach (['total' => $tempo_total, 'espera' => $tempo_espera] as $label => &$tempo) {
                          if ($tempo['S'] >= 60) {
                            $tempo['M'] += floor($tempo['S'] / 60);
                            $tempo['S'] %= 60;
                          }
                          if ($tempo['M'] >= 60) {
                            $tempo['H'] += floor($tempo['M'] / 60);
                            $tempo['M'] %= 60;
                          }
                        }

                        $tempo_real = [
                          'H' => $tempo_total['H'] - $tempo_espera['H'],
                          'M' => $tempo_total['M'] - $tempo_espera['M'],
                          'S' => $tempo_total['S'] - $tempo_espera['S']
                        ];
                        ?>
                      </table>

                      <table border="1" width="99%" bgcolor="#FFEFD5">
                        <tr align="center">
                          <td>Tempo Total do Projeto:</td>
                          <td>Tempo Total da Espera:</td>
                          <td>Tempo Real de Execução:</td>
                        </tr>
                        <tr align="center">
                          <td>
                            <?= $tempo_total['H'] >= 24 ? round($tempo_total['H'] / 24) . ' Dia(s)' : sprintf('%02d:%02d:%02d', ...array_values($tempo_total)) ?>
                          </td>
                          <td>
                            <?= $tempo_espera['H'] >= 24 ? round($tempo_espera['H'] / 24) . ' Dia(s)' : sprintf('%02d:%02d:%02d', ...array_values($tempo_espera)) ?>
                          </td>
                          <td>
                            <?= $tempo_real['H'] >= 24 ? round($tempo_real['H'] / 24) . ' Dia(s)' : sprintf('%02d:%02d:%02d', ...array_values($tempo_real)) ?>
                          </td>
                        </tr>
                      </table>
                    <?php else : ?>
                      <div class="alert alert-warning m-3">
                        Projeto ainda não foi iniciado.
                      </div>
                    <?php endif; ?>
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
            <i class="fas fa-list-ol"></i> Histórico do projeto #<?php echo str_pad($projeto, 5, '0', STR_PAD_LEFT); ?>
          </div>
          <div class="card-body">

            <div class="timeline">
              <?php
              $pdo = ConnectionN3();
              $show_inter = $pdo->prepare("SELECT inter_projeto.*, usuarios.user_nome FROM inter_projeto INNER JOIN usuarios ON usuarios.user_id = inter_projeto.inter_user WHERE inter_projeto.inter_projeto = '$projeto' AND inter_projeto.inter_tipo > '0' ORDER BY inter_id DESC");
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
                } //1 = Abertura de Projeto
                if ($inter_tipo == 2) {
                  $tl_dot_color = "b-success";
                  $tl_active_color = "active-success";
                } //2 = Aceite de Projeto
                if ($inter_tipo == 3) {
                  $tl_dot_color = "b-danger";
                  $tl_active_color = "active-danger";
                } //3 = Devolução de Projeto
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
                } //6 = Retomada do Projeto
                if ($inter_tipo == 7) {
                  $tl_dot_color = "b-primary";
                  $tl_active_color = "active-primary";
                } //7 = Interação com o solicita
                if ($inter_tipo == 8) {
                  $tl_dot_color = "b-success";
                  $tl_active_color = "active-success";
                } //8 = Conclusão de Projeto
                if ($inter_tipo == 9) {
                  $tl_dot_color = "b-danger";
                  $tl_active_color = "active-danger";
                } //9 = Edição da classificação do Projeto
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
                  <textarea name="inter_desc" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="projeto_new_inter">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal fade" id="relacionar" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"> <i class="fas fa-edit text-primary"></i> Edição de relação de tarefas</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row pt-2">

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Tarefas :</label>
                  <select name="tarefa" id="tarefa" class="form-control form-control-sm" required="required" tabindex="5">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $tarefas_rel = $pdo->prepare("SELECT tarefas.id, tarefas.nome_tarefa FROM tarefas WHERE tarefas.id_projeto = '$projeto'");
                    $tarefas_rel->execute();
                    while ($exibe = $tarefas_rel->fetch(PDO::FETCH_ASSOC)) {
                      $tarefa_id = $exibe["id"];
                      $tarefa_nom = $exibe["nome_tarefa"];
                    ?>
                      <option value="<?php echo $tarefa_id; ?>" <?php if ($tarefa_id == $projeto_cat) {
                                                                  echo " selected";
                                                                } ?>><?php echo $tarefa_nom; ?></option>
                    <?php } ?>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Dependecia :</label>
                  <select name="dependencia" id="dependencia_rel" class="form-control form-control-sm" required="required" tabindex="5">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $tarefas_rel = $pdo->prepare("SELECT tarefas.id, tarefas.nome_tarefa FROM tarefas WHERE tarefas.id_projeto = '$projeto'");
                    $tarefas_rel->execute();
                    while ($exibe = $tarefas_rel->fetch(PDO::FETCH_ASSOC)) {
                      $tarefa_id = $exibe["id"];
                      $tarefa_nom = $exibe["nome_tarefa"];
                    ?>
                      <option value="<?php echo $tarefa_id; ?>" <?php if ($tarefa_id == $projeto_cat) {
                                                                  echo " selected";
                                                                } ?>><?php echo $tarefa_nom; ?></option>
                    <?php } ?>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="relacionar_tar">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-danger">Editar</button>
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
            <div class="modal-body py-1 d-flex flex-column">
              <div class="form-row pt-2">
                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Tipo de projeto:</label>
                  <select name="tipo" class="form-control form-control-sm" required="required" tabindex="4">
                    <option></option>
                    <option value="1" <?php if ($projeto_tipo == 1) {
                                        echo " selected";
                                      } ?>>Falha</option>
                    <option value="2" <?php if ($projeto_tipo == 2) {
                                        echo " selected";
                                      } ?>>Relacionamento</option>
                    <option value="3" <?php if ($projeto_tipo == 3) {
                                        echo " selected";
                                      } ?>>Requisição de Serviços</option>
                    <option value="4" <?php if ($projeto_tipo == 4) {
                                        echo " selected";
                                      } ?>>Requisição de informação</option>
                    <option value="5" <?php if ($projeto_tipo == 5) {
                                        echo " selected";
                                      } ?>>Notificação de monitoramento</option>
                    <option value="6" <?php if ($projeto_tipo == 6) {
                                        echo " selected";
                                      } ?>>Melhorias</option>
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
                      <option value="<?php echo $cat_id; ?>" <?php if ($cat_id == $projeto_cat) {
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
                    <option value="<?php echo $projeto_scat; ?>"><?php echo $scat_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-4">
                  <label class="my-0 small">Item:</label>
                  <span class="carregando4 small">Aguarde, carregando...</span>
                  <select name="item" id="item" class="form-control form-control-sm" required="required" tabindex="7">
                    <option value="<?php echo $projeto_item; ?>"><?php echo $projeto_itens_nome; ?></option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Nível:</label>
                  <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
                    <option></option>
                    <option value="1" <?php if ($projeto_nivel == 1) {
                                        echo " selected";
                                      } ?>>Nível 1</option>
                    <option value="2" <?php if ($projeto_nivel == 2) {
                                        echo " selected";
                                      } ?>>Nível 2</option>
                    <option value="3" <?php if ($projeto_nivel == 3) {
                                        echo " selected";
                                      } ?>>Nível 3</option>
                    <option value="4" <?php if ($projeto_nivel == 4) {
                                        echo " selected";
                                      } ?>>Rotina</option>
                    <option value="5" <?php if ($projeto_nivel == 5) {
                                        echo " selected";
                                      } ?>>Administrativo</option>
                    <option value="0" <?php if ($projeto_nivel == 0) {
                                        echo " selected";
                                      } ?>>NA</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <label class="my-0 small">Forma de atendimento:</label>
                  <select name="forma" class="form-control form-control-sm" required="required" tabindex="9">
                    <option></option>
                    <option value="1" <?php if ($projeto_forma == 1) {
                                        echo " selected";
                                      } ?>>Remoto</option>
                    <option value="2" <?php if ($projeto_forma == 2) {
                                        echo " selected";
                                      } ?>>Presencial</option>
                    <option value="3" <?php if ($projeto_forma == 3) {
                                        echo " selected";
                                      } ?>>Remoto - Plantão</option>
                    <option value="4" <?php if ($projeto_forma == 4) {
                                        echo " selected";
                                      } ?>>Presencial - Plantão</option>
                  </select>
                </div>

                <div class="form-group col-sm-6 col-md-10">
                  <label class="my-0 small">Descrição de abertura:</label>
                  <textarea name="desc_abertura" class="form-control form-control-sm" rows="5" required="required" tabindex="9"><?php echo htmlspecialchars($projeto_desc_abertura); ?></textarea>
                </div>

                <div class="form-group col-sm-6 col-md-3">
                  <!-- <label class="my-0 small">Dias:</label>
                  <input type="number" id="dias" name="dias" min="1" max="999" value="<?php echo $projeto_dias; ?>" class="form-control form-control-sm" required="required" tabindex="7">
                   --><!--                    <select name="dias" class="form-control form-control-sm" required="required" tabindex="7">
                      <option></option>
                      <option value="5"</?php if($projeto_nivel==1){ echo" selected";}?>>1</option>
                      <option value="6"</?php if($projeto_nivel==2){ echo" selected";}?>>2</option>
                      <option value="7"</?php if($projeto_nivel==3){ echo" selected";}?>>3</option>
                      <option value="8"</?php if($projeto_nivel==4){ echo" selected";}?>>Rotina</option>
                      <option value="9"</?php if($projeto_nivel==0){ echo" selected";}?>>NA</option>
                      <option value="10"</?php if($projeto_nivel==0){ echo" selected";}?>>NA</option>
                      <option value="11"</?php if($projeto_nivel==0){ echo" selected";}?>>NA</option>
                    </select> -->
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
              <input type="hidden" name="token" value="<?php echo $token; ?>">
              <input type="hidden" name="action" value="projeto_edt">
              <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
              <button type="submit" class="btn btn-sm btn-danger">Editar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <?php
    if ($action == "relacionar_tar") {
      $tarefa = filter_input(INPUT_POST, 'tarefa', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      $dependencia = filter_input(INPUT_POST, 'dependencia', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

      $pdo = ConnectionN3();
      $adc = $pdo->prepare("UPDATE `tarefas` SET `tarefas_relacionadas`='$dependencia' WHERE `id`='$tarefa';");
      if ($adc->execute()) {
        if ($adc->execute()) {
          $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Tarefas relacionadas com sucesso";
          $mensagem_cor = "alert-success";
        }
      }
    }
    ?>
    <?php if ($exibe_bt_projeto_aceitar == true) { ?>
      <!-- MODAL ACEITE DO CHAMADO -->
      <div class="modal fade" id="projeto_aceitar" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <form action="#" method="POST">
              <div class="modal-header">
                <h6 class="modal-title"><i class="far fa-arrow-alt-circle-down text-success"></i> Iniciar projeto ou direcionar para outro Tecnico</h6>
                <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <label class="small"><strong>Iniciar o projeto:</strong></label>
                <label class="small">Se o técnico informado for o próprio usuário: a) este projeto ficará sob sua responsabilidade; b) o status do projeto será alterado para "Em execução".</label>
                <label class="small pt-1"><strong>Direcionar a outro técnico:</strong></label>
                <label class="small">Se o técnico informado NºO for o próprio usuário: a) este projeto será redirecionado para a fila de projetos do técnico informado; b) este projeto contuará com o status "Aguardando projeto" até que o técnico responsóvel confirme o início da execução.</label>
                <label class="small pt-1">Não esqueça de informar todas as interação com o cliente.</label>
                <div class="form-row">
                  <div class="form-group col-sm-12">
                    <label class="my-0 small">Tecnico responsóvel:</label>
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
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_aceitar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_retomar == true) { ?>
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
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_retomar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Retomar o projeto</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_espera == true) { ?>
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
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_espera">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-success">Colocar em espera</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_devolver == true) { ?>
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
                  <label class="small">Ao confirmar esta tela SEM informar um técnico: a) o projeto voltará para a fila de projeto sem um responsóvel; b) este projeto contuará com o status "Aguardando projeto" até que um técnico o aceite.</label>
                  <label class="small pt-1"><strong>Direcionar projeto:</strong></label>
                  <label class="small">Ao confirmar esta tela informando um técnico responsóvel: a) este projeto será redirecionado para a fila de projetos do técnico informado; b) este projeto contuará com o status "Aguardando projeto" até que o técnico responsóvel confirme o início da execução.</label>
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
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_recusar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-danger">Recusar projeto</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>

    <?php if ($exibe_bt_projeto_finalizar == true) { ?>
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
                    <textarea name="desc_fechamento" class="form-control form-control-sm" rows="4" required="required" tabindex="1"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                <input type="hidden" name="token" value="<?php echo $token; ?>">
                <input type="hidden" name="action" value="projeto_finalizar">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">Fechar</button>
                <button type="submit" class="btn btn-sm btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    <?php } ?>


    <!-- MODAL NOVA TAREFA -->
    <div class="modal fade" id="new_tarefa" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-xl" role="document">
        <div class="modal-content">
          <form action="#" method="POST">
            <div class="modal-header">
              <h6 class="modal-title"><i class="fas fa-plus text-danger"></i> Cadastro de solicitação de tarefa</h6>
              <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body py-1">
              <div class="form-row pt-2">
                <div class="form-group col-sm-6 col-md-6">
                  <!-- você pode colocar campos adicionais aqui se necessário -->
                </div>

                <div class="card-body py-3">
                  <div class="form-row">
                    <div class="form-group col-sm-6 col-md-4">
                      <label class="my-0 small">Selecione o Projeto:</label>
                      <!-- <select id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required disabled>
                        <option></option>
                        <?php
                        $pdo = ConnectionN3();
                        $show_clt = $pdo->prepare("SELECT projetos.id, projetos.nome_proj, projetos.cliente FROM projetos INNER JOIN CLIENTES ON PROJETOS.CLIENTE = CLIENTEs.clt_ID ORDER BY projetos.nome_proj ASC");
                        $show_clt->execute();

                        $cliente_do_projeto_selecionado = '';

                        while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                          $id = $exibe["id"];
                          $nome_proj = $exibe["nome_proj"];
                          $cliente_id_atual  = $exibe["cliente"];

                          $selecionado = '';
                          if ($id == $projeto) {
                            $selecionado = ' selected';
                            // Se for, guarde o ID do cliente
                            $cliente_do_projeto_selecionado = $cliente_id_atual;
                          }
                        ?>
                          <option value="<?php echo $id; ?>" <?php echo $selecionado; ?>>
                            #<?php echo $id ?>: <?php echo $nome_proj; ?>
                          </option> <?php } ?>
                      </select> -->
                      <select id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" required disabled>
                        <option></option>
                        <?php
                        $pdo = ConnectionN3();
                        $show_clt = $pdo->prepare("SELECT projetos.id, projetos.nome_proj, projetos.cliente FROM projetos INNER JOIN CLIENTES ON PROJETOS.CLIENTE = CLIENTEs.clt_ID ORDER BY projetos.nome_proj ASC");
                        $show_clt->execute();

                        // Esta variável guardará o cliente do projeto pré-selecionado para envio no formulário. SUA LÓGICA AQUI ESTÁ CORRETA.
                        $cliente_do_projeto_selecionado = '';

                        while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                          $id_projeto_atual = $exibe["id"];
                          $nome_proj = $exibe["nome_proj"];
                          $id_cliente_atual = $exibe["cliente"]; // ID do cliente associado ao projeto

                          $selecionado = '';
                          if ($id_projeto_atual == $projeto) {
                            $selecionado = ' selected';
                            // Guarda o cliente correto para o input hidden. SUA LÓGICA AQUI ESTÁ CORRETA.
                            $cliente_do_projeto_selecionado = $id_cliente_atual;
                          }
                        ?>
                          <option value="<?php echo $id_cliente_atual; ?>" <?php echo $selecionado; ?>>
                            #<?php echo $id_projeto_atual ?>: <?php echo $nome_proj; ?>
                          </option>
                        <?php } ?>
                      </select>
                    </div>

                    <!-- Campo hidden para envio do cliente_id -->
                    <input type="hidden" name="cliente" value="<?php echo $cliente_do_projeto_selecionado; ?>">

                    <div class="form-group col-sm-6 col-md-4">
                      <label class="my-0 small">Solicitante:</label>
                      <span class="carregando small">Carregando...</span>
                      <select name="solicitante" id="solicitante2" class="form-control form-control-sm" required tabindex="2">
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
                      <select name="categoria" id="categoria2" class="form-control form-control-sm" required="required" tabindex="5">
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
                      <select name="subcategoria" id="subcategoria2" class="form-control form-control-sm" required="required" tabindex="6">
                        <option></option>
                      </select>
                    </div>

                    <!-- Este select será populado por um Java Script, de acordo com o valor escolhido no select 'subcategoria'-->
                    <div class="form-group col-sm-6 col-md-2">
                      <label class="my-0 small">Item:</label>
                      <span class="carregando4 small">Aguarde, carregando...</span>
                      <select name="item" id="item2" class="form-control form-control-sm" required="required" tabindex="7">
                        <option></option>
                      </select>
                    </div>

                    <div class="form-group col-sm-6 col-md-2">
                      <label class="my-0 small">Nível:</label>
                      <select name="nivel" class="form-control form-control-sm" required="required" tabindex="8">
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






                  <div class="form-row pt-2">

                    <div class="form-group col-sm-6 col-md-6">
                      <label class="my-0 small">Nome da Tarefa:</label>
                      <textarea name="nome_tarefa" class="form-control form-control-sm" rows="1" required="required" tabindex="9"></textarea>
                    </div>
                    <div class="form-group col-sm-6 col-md-6">
                      <label class="my-0 small">Descrição de abertura:</label>
                      <textarea name="desc_abertura" class="form-control form-control-sm" rows="1" required="required" tabindex="9"></textarea>
                    </div>

                    <div class="form-group col-sm-12 col-md-12">
                      <div class="form-row">

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Tecnico:</label>
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

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Forma de atendimento:</label>
                          <select name="forma" class="form-control form-control-sm" required="required" tabindex="12">
                            <option value="1">Remoto</option>
                            <option value="2">Presencial</option>
                            <option value="3">Remoto - Plantão</option>
                            <option value="4">Presencial - Plantão</option>
                          </select>
                        </div>

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Dependecia :</label>
                          <select name="dependencia" id="dependencia" class="form-control form-control-sm" tabindex="11">
                            <option></option>
                            <?php
                            $pdo = ConnectionN3();
                            $tarefas_rel = $pdo->prepare("SELECT tarefas.id, tarefas.nome_tarefa FROM tarefas WHERE tarefas.id_projeto = '$projeto'");
                            $tarefas_rel->execute();
                            while ($exibe = $tarefas_rel->fetch(PDO::FETCH_ASSOC)) {
                              $tarefa_id = $exibe["id"];
                              $tarefa_nom = $exibe["nome_tarefa"];
                            ?>
                              <option value="<?php echo $tarefa_id; ?>" <?php if ($tarefa_id == $projeto_cat) {
                                                                          echo " selected";
                                                                        } ?>><?php echo $tarefa_nom; ?></option>
                            <?php } ?>
                          </select>
                        </div>

                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Dias:</label>
                          <input type="number" id="dias" name="dias" min="1" max="999" class="form-control form-control-sm" required="required" tabindex="8">
                        </div>
                      </div>


                      <div class="form-row">
                        <div class="form-group col-sm-3 col-md-3">
                          <label class="my-0 small">Abertura:</label>
                          <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="12">
                        </div>


                        <div class="form-group col-sm-12 col-md-6 pt-3 text-center mt-2">
                          <input type="hidden" name="projeto" value="<?php echo $projeto; ?>">
                          <input type="hidden" name="token" value="<?php echo $token; ?>">
                          <input type="hidden" name="action" value="new_tarefa">


                          <button type="submit" class="btn btn-danger btn-sm p-1"><i class="fas fa-plus"></i> Adicionar Tarefa</button>
                        </div>

                      </div>
                      <!-- <button type="button" class="btn btn-sm btn-secondary " data-dismiss="modal" aria-label="Fechar">Fechar</button> -->



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
                <li class="small">Se você for o técnico que executará o projeto, apenas confirme o seu nome como <em>Tecnico Resposável</em>.</li>
                <li class="small">Quando você confirmar seu nome como <em>Tecnico Resposável</em> pelo projeto outras opçães de gestão do projeto aparecerão na sua tela.</li>
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
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>
  <script src="../js/bootstrap-datetimepicker.js"></script>


  <script>
    $('.selectpicker').selectpicker();
  </script>

  <?php if (empty($projeto) || $exibe_bt_projeto_espera == true) { ?>
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


  <!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
  <!-- <script src="../js/loader.js" type="text/javascript"></script> -->

  <script type="text/javascript">
    //pupula os selects solicitante e local de acordo com o cliente escolhido
    $(document).ready(function() {
      $('#cliente').change(function() {
        // console.log('entrou no change', $(this).val())
        if ($(this).val()) {
          // console.log('tem?');
          $('#solicitante').hide();
          $('#solicitante2').hide();
          $('#local').hide();
          $('#local2').hide();
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
            // console.log(options)
            $('#solicitante2').html(options).show();
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
            $('#local2').html(options).show();
            $('#local').html(options).show();
            $('.carregando2').hide();
          });
        } else {
          $('#solicitante').html('<option value="">Escolha o Solicitante</option>');
          $('#local').html('<option value="">Escolha o Local</option>');
        }
      });

    });

    $(document).ready(function() {
      $('#cliente').trigger("change")
    });
  </script>

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


  <?php if (isset($mensagem)) { ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000);
    </script>
  <?php } ?>

  <!-- loader e os js abaixo são necessários para popular os selects dependentes (solicitante, local e subcategoria) -->
  <!-- <script src="../js/loader.js" type="text/javascript">
  </script> -->

  <?php if (empty($new_tarefa)) { ?>
    <script type="text/javascript">
      //pupula os selects solicitante 2 e local 2 de acordo com o cliente escolhido
      $(function() {
        $('#cliente').change(function() {
          if ($(this).val()) {
            $('#solicitante2').hide();
            $('#local2').hide();
            $('.carregando').show();
            $('.carregando').show();
            $.getJSON('busca_solicitantes.php?search=', {
              cliente: $(this).val(),
              ajax: 'true'
            }, function(j) {
              var options = '<option value="">Escolha o solicitante</option>';
              for (var i = 0; i < j.length; i++) {
                options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
              }
              $('#solicitante2').html(options).show();
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
              $('#local2').html(options).show();
              $('.carregando2').hide();
            });
          } else {
            $('#solicitante2').html('<option value="">Escolha o Solicitante</option>');
            $('#local2').html('<option value="">Escolha o Local</option>');
          }
        });
      });
    </script>

  <?php } ?>
  <script type="text/javascript">
    //pupula os selects subcategoria 2 de acordo com a categoria escolhida
    $(function() {
      $('#categoria2').change(function() {
        if ($(this).val()) {
          $('#subcategoria2').hide();
          $('.carregando3').show();
          $.getJSON('busca_subcategorias.php?search=', {
            categoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha a Subcategoria</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#subcategoria2').html(options).show();
            $('.carregando3').hide();
          });

        } else {
          $('#subcategoria2').html('<option value="">Escolha a Subcategoria</option>');
        }
      });
    });
  </script>

  <script type="text/javascript">
    //pupula os selects ITEM 2 de acordo com a SUBcategoria escolhida
    $(function() {
      $('#subcategoria2').change(function() {
        if ($(this).val()) {
          $('#item2').hide();
          $('.carregando4').show();
          $.getJSON('busca_itens.php?search=', {
            subcategoria: $(this).val(),
            ajax: 'true'
          }, function(j) {
            var options = '<option value="">Escolha o Item</option>';
            for (var i = 0; i < j.length; i++) {
              options += '<option value="' + j[i].id + '">' + j[i].nome + '</option>';
            }
            $('#item2').html(options).show();
            $('.carregando4').hide();
          });
        } else {
          $('#item2').html('<option value="">Escolha o Item</option>');
        }
      });
    });
  </script>


  <!-- <?php if (isset($mensagem)) { ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000);
    </script>

  <?php } ?> -->

  <?php
  $show = $pdo->prepare("SELECT * FROM tarefas WHERE id_projeto = :id_projeto");
  $id_projeto = $projeto;
  $show->bindParam(':id_projeto', $id_projeto);
  $show->execute();
  $conta_tarefas = $show->rowCount();

  $dataRows = array();
  $startDates = array();
  $dataRows4 = array();

  if ($conta_tarefas > 0) {
    while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
      $nometar = $row["nome_tarefa"];
      $dias = $row["dias"];
      $dependencia = $row["tarefas_relacionadas"];
      $porcentagem = $row["porcentagem"];
      $status = $row['status'];
      $id = $row["id"];

      $comeco = new DateTime($row['abertura']);
      $cccd = $comeco->format('Y/m/d H:i:s');

      if (!empty($dependencia)) {
        $dependenciaIds = explode(',', $dependencia);

        $maxEndDate = null;
        foreach ($dependenciaIds as $depId) {
          if (isset($startDates[$depId]) && $startDates[$depId] > $maxEndDate) {
            $maxEndDate = $startDates[$depId];
          }
        }

        if ($maxEndDate !== null) {
          $cccd = $maxEndDate;
          $comeco = new DateTime($cccd);
        }
      }

      $datafim = clone $comeco;
      $datafim->modify("+$dias days");
      $fffd = $datafim->format('Y/m/d H:i:s');

      $dependencies = array();
      if (!empty($dependencia)) {
        $dependenciaIds = explode(',', $dependencia);

        foreach ($dependenciaIds as $depId) {
          $showDepen = $pdo->prepare("SELECT * FROM tarefas WHERE id = :depId");
          $showDepen->bindParam(':depId', $depId);
          $showDepen->execute();

          if ($showDepen->rowCount() > 0) {
            $depRow = $showDepen->fetch(PDO::FETCH_ASSOC);
            $dependencies[] = $depRow["nome_tarefa"];
          } else {
            echo "Erro: Não foi possível encontrar a tarefa com o ID $depId";
          }
        }
      }

      if ($status == 4) {
        $showDepen4 = $pdo->prepare("SELECT * FROM gantt WHERE id_projeto = :id_projeto");
        $id_projeto = $projeto;
        $showDepen4->bindParam(':id_projeto', $id_projeto);
        $showDepen4->execute();
        $conta_tarefas4 = $showDepen4->rowCount();

        if ($conta_tarefas4 > 0) {
          while ($row4 = $showDepen4->fetch(PDO::FETCH_ASSOC)) {
            $comeco_real = new DateTime($row4['inicio_tarefa']);
            $fim_real = new DateTime($row4['finalizou_tarefa']);
            $tempo_espera_real = new DateTime(($row4['espera_tarefa']));
            $dependencia = $row4["dependencia_tarefa"];

            if ($comeco_real != NULL && $fim_real != NULL) {
              // LINHAS CORRIGIDAS
              $cccd = $comeco_real->format('Y/m/d H:i:s');
              $fffd = $fim_real->format('Y/m/d H:i:s');
              $intervalo = $comeco_real->diff($fim_real);
              $md = 0;
              if ($intervalo->m > 0) {
                $md = $intervalo->m * 30.437;
              }
              $diaas = $md + $intervalo->d;
              $diash = $intervalo->h + ($diaas * 24);
              $diasm = $intervalo->i;
              $diass = $intervalo->s;
              $nometar = $row4['nome_tarefa'];

              $dependencies = array();
              if (!empty($dependencia)) {
                $dependenciaIds = explode(',', $dependencia);

                foreach ($dependenciaIds as $depId) {
                  $showDepen = $pdo->prepare("SELECT * FROM gantt WHERE id_tarefa = :depId");
                  $showDepen->bindParam(':depId', $depId);
                  $showDepen->execute();

                  if ($showDepen->rowCount() > 0) {
                    $depRow = $showDepen->fetch(PDO::FETCH_ASSOC);
                    $dependencies[] = $depRow["nome_tarefa"];
                  } else {
                    echo "Erro: Não foi possível encontrar a tarefa com o ID $depId";
                  }
                }
              }

              $dependenciesStr = implode(',', $dependencies);
              $dataRows4[] = "['$nometar', '$nometar', new Date('$cccd'), new Date('$fffd'), " . ($diash !== null ? $diash : 'null') . ", $porcentagem, '$dependenciesStr']";
              $startDates[$row4['id']] = $fffd;
            }
          }
        }
      } else {
        $dependenciesStr = implode(',', $dependencies);
        $dataRows[] = "['$nometar', '$nometar', new Date('$cccd'), new Date('$fffd'), " . ($dias !== null ? $dias : 'null') . ", $porcentagem, '$dependenciesStr']";
        $startDates[$row['id']] = $fffd;
      }
    }
  }

  $dataRows = array_merge($dataRows, $dataRows4);
  $dataRowsStr = implode(",", $dataRows);

  ?>


  <script type="text/javascript">
    // Carrega a biblioteca Google Charts
    function loadGoogleCharts(callback) {
      if (!window.google || !window.google.charts) {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/charts/loader.js';
        script.onload = callback;
        document.head.appendChild(script);
      } else {
        callback();
      }
    }

    // Inicia o carregamento do gráfico
    loadGoogleCharts(function() {
      google.charts.load('current', {
        'packages': ['gantt'],
        'language': 'pt-br'
      });
      google.charts.setOnLoadCallback(drawChart);
    });

    // Função principal para desenhar o gráfico
    function drawChart() {
      const data = new google.visualization.DataTable();
      data.addColumn('string', 'Task ID');
      data.addColumn('string', 'Task Name');
      data.addColumn('date', 'Start Date');
      data.addColumn('date', 'End Date');
      data.addColumn('number', 'Duracion');
      data.addColumn('number', 'Percent Complete');
      data.addColumn('string', 'Dependencies');

      // Preenche as linhas com os dados do PHP
      data.addRows([
        <?php echo !empty($dataRowsStr) ? $dataRowsStr : "[]"; ?>
      ]);

      const options = {
        height: 500,
        width: '100%',
        gantt: {
          trackHeight: 40,
          criticalPathVisible: true,
          criticalPathEnabled: true,
          innerGridHorizLine: {
            stroke: '#e0e0e0',
            strokeWidth: 1
          },
          labelStyle: {
            fontName: 'Arial',
            fontSize: 11,
            color: '#333'
          },
          percentEnabled: true, // Mostra porcentagem dentro da barra
          labelMaxWidth: 300
        }
      };

      const chartDiv = document.getElementById('chart_div');
      const chart = new google.visualization.Gantt(chartDiv);

      // Após o gráfico estar pronto, traduz os dias da semana
      google.visualization.events.addListener(chart, 'ready', function() {
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const labels = chartDiv.querySelectorAll('.google-visualization-dayofweeklabel');
        labels.forEach((label, index) => {
          if (diasSemana[index]) label.textContent = diasSemana[index];
        });
      });

      try {
        chart.draw(data, options);
      } catch (e) {
        chartDiv.innerHTML = '<p style="color: red;">Erro ao carregar gráfico. Verifique os dados fornecidos.</p>';
        console.error('Erro ao desenhar gráfico Gantt:', e);
      }
    }
  </script>

</body>

</html>