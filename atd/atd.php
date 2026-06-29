<?php

// PAGINA ESTÁ ASSIM ATUALMENTE EM PRODUÇÃO SEM APRESENTAR ERROS 


session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
include_once("../all/email_smtp.php");

$atdDetalheGet = filter_input(INPUT_GET, 'atd', FILTER_SANITIZE_NUMBER_INT);
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $atdDetalheGet) {
  header("Location: atd_detalhe.php?atd=" . urlencode((string)$atdDetalheGet));
  exit;
}
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
$exibe_bt_atd_search = false;
$exibe_bt_atd_search = false;


if ($m3_00 == 0) {
  header("Location: ../index.php");
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


// echo "<pre>";
// print_r($_SESSION['tipo']);
// echo "</pre>";

// echo var_dump($_SESSION['tipo']);
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
    body {
      zoom: 0.9;
      /* Escala o conteúdo sem alterar o contexto de layout */
      width: 100%;
      /* Mantém o layout responsivo */
      overflow-x: hidden;
      /* Garante que não haja rolagem horizontal */
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

    #catalogOptions {
      position: absolute;
      top: 100%;
      /* Posiciona o menu abaixo do botão */
      margin-left: 170px;
      z-index: 1000;
    }

    .catalog-item {
      cursor: pointer;
      /* Define o cursor como uma mão ao passar o mouse */
    }
  </style>


</head>

<body>
  <?php include_once("../all/sidebar.php"); ?>


  <?php
  if (isset($_SESSION['alert_message'])) {
    $alert = $_SESSION['alert_message'];
  ?>
    <div style="position: fixed; top: 65px; right: 50px; z-index: 9999; width: 350px;">

      <div class="alert alert-<?php echo $alert['type']; ?> alert-dismissible fade show auto-fade-alert" role="alert" style="padding: 1rem;">

        <?php echo $alert['text']; ?>

        <button type="button" class="close" data-dismiss="alert" aria-label="Close" style="padding: 1rem;">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

    </div>
  <?php
    unset($_SESSION['alert_message']);
  }
  ?>


  <?php
  //verifico se existe alguma requisição POST chamada action
  $action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

  //verifico se existe alguma requisição via post cahamda atd
  // $atd = filter_input(INPUT_POST, 'atd', FILTER_SANITIZE_NUMBER_INT);
  $atd = filter_input(INPUT_POST, 'atd', FILTER_SANITIZE_NUMBER_INT)
    ?? filter_input(INPUT_GET, 'atd', FILTER_SANITIZE_NUMBER_INT);

  if ($action == "alterar_senha") {
    include_once("../all/update_senha.php");
  }

  if ($action && $action !== "alterar_senha") {
    $actionAtdId = (int)$atd;
    $actionAtdTecnico = null;

    if ($actionAtdId > 0 && $action !== "atd_adc") {
      $pdoPerm = ConnectionN3();
      $stmtPerm = $pdoPerm->prepare("SELECT tecnico FROM atendimentos WHERE id = :id LIMIT 1");
      $stmtPerm->execute([':id' => $actionAtdId]);
      $permRow = $stmtPerm->fetch(PDO::FETCH_ASSOC);
      if (!$permRow) {
        n3_forbidden('Atendimento não encontrado.', 404);
      }
      $actionAtdTecnico = (int)$permRow['tecnico'];
    }

    $allowedAction = true;
    switch ($action) {
      case 'atd_adc':
        $allowedAction = ((int)$m3_01 >= 2);
        break;
      case 'atd_edt':
        $allowedAction = ((int)$m3_01 >= 3 || (int)$m3_05 >= 2);
        break;
      case 'atd_new_inter':
        $allowedAction = ((int)$m3_00 >= 1);
        break;
      case 'atd_aceitar':
      case 'atd_retomar':
      case 'atd_concluido':
      case 'atd_finalizar':
      case 'atd_feedback':
        $allowedAction = n3_can_atd_execute_owner_or_manager($actionAtdTecnico);
        break;
      case 'atd_espera':
        $allowedAction = ((int)$m3_03 >= 2 && n3_can_atd_execute_owner_or_manager($actionAtdTecnico));
        break;
      case 'atd_recusar':
        $allowedAction = ((int)$m3_04 >= 2 || (int)$m3_05 >= 2);
        break;
      default:
        $allowedAction = false;
        break;
    }

    if (!$allowedAction) {
      n3_forbidden('Você não tem permissão para executar esta ação no atendimento.');
    }
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
        $nivel = trim(filter_input(INPUT_POST, 'nivel', FILTER_UNSAFE_RAW)) ?: '1';
        $prioridade = filter_input(INPUT_POST, 'prioridade', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        // $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $desc_abertura = trim(filter_input(INPUT_POST, 'desc_abertura', FILTER_UNSAFE_RAW));
        //$abertura = date("Y-m-d H:i:s");
        $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $abertura_recorrente = filter_input(INPUT_POST, 'abertura_recorrente', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $tecnico = filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

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
        // $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir`, `vezes`, `semana`) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$atd_sts',:recorrente,:data_recorrente,:vezes_reabrir,:vezes,:semana);");
        $adc = $pdo->prepare("INSERT INTO `atendimentos` (`cliente`, `pessoa`, `local`, `tipo`, `categoria`, `subcategoria`, `item`, `nivel`, `forma`, `desc_abertura`, `abertura`, `tecnico`, `reincidente`, `status`, `recorrente`, `data_recorrencia`, `vezes_reabrir`, `vezes`, `semana`, `prioridade` ) VALUES (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item, :nivel, :forma, :desc_abertura, :abertura, :tecnico, '$reincidente', '$atd_sts',:recorrente,:data_recorrente,:vezes_reabrir,:vezes,:semana,:prioridade);");
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
        $adc->bindParam(':prioridade', $prioridade);


        //SE O TÉCNICO ESCOLHIDO FOR DIFERENTE DO USUÁRIO
        //if($tecnico>0 && $tecnico!= $user_id){
        //}

        if ($adc->execute()) {
          $atd = $pdo->lastInsertId();
          $mensagem = "<i class=\"fas fa-check\"></i> Atendimento cadastrado!";
          $mensagem_cor = "alert-success";
          $log = "true";

          //==========================================CHAMADO ABERTO========email=============================================================================================================================================================

          $show_atendimento = $pdo->prepare(
            "SELECT c.clt_nomef, c.clt_mail, p.pessoa_nom, p.pessoa_mail, u.user_nome, a.id, u.user_mail AS tecnico_mail
          FROM atendimentos a
          INNER JOIN clientes c ON c.clt_id = a.cliente
          INNER JOIN pessoas p ON p.pessoa_id = a.pessoa
          INNER JOIN usuarios u ON u.user_id = a.tecnico
          WHERE a.id = '$atd' LIMIT 0,1"
          );

          $show_atendimento->execute();
          // $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

          // $clienteid = isset($infos['id']) ? $infos['id'] : '';
          // $tecnico_mail =  isset($infos['tecnico_mail']) ?  $infos['tecnico_mail'] : '';
          // $clienteMail =  isset($infos['clt_mail']) ?  $infos['clt_mail'] : '';
          // $pessoa_mail =  isset($infos['pessoa_mail']) ?  $infos['pessoa_mail'] : '';

          $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

          if ($infos) {
            $clienteid = isset($infos['id']) ? $infos['id'] : '';
            $tecnico_mail = isset($infos['tecnico_mail']) ? $infos['tecnico_mail'] : '';
            $clienteMail = isset($infos['clt_mail']) ? $infos['clt_mail'] : '';
            $pessoa_mail = isset($infos['pessoa_mail']) ? $infos['pessoa_mail'] : '';
          } else {
            $clienteid = '';
            $tecnico_mail = '';
            $clienteMail = '';
            $pessoa_mail = '';
          }



          //Para adicionar um novo e-mail, deve-se concatenar a string ao invés de sobrescrever
          $to_email = "";
          //$to_email.= "clerio.junior@gmail.com";
          //$to_email.= ",nattan.lima@nivel3ti.com.br";
          $to_email .= "," . $tecnico_mail;
          $to_email .= "," . $pessoa_mail;
          $to_email .= "," . $clienteMail;

          // $to_email = "tecnico_mail";
          $subject = "Nivel 3 TI Atendimento: #" . $atd . " ";

          /* $clienteNome = $cliente['clt_nomef'];
          $pessoaNome = $pessoa['pessoa_nom'];
          $tecnicoNome = $showTecnico['user_nome']; */

          $clienteNome = isset($infos['clt_nomef']) ?  $infos['clt_nomef'] : '';
          $tecnicoNome = isset($infos['user_nome']) ?  $infos['user_nome'] : '';
          $pessoaNome =  isset($infos['pessoa_nom']) ? $infos['pessoa_nom'] : '';

          $body = "<strong>CHAMADO ABERTO - N3TI</strong><br>Empresa: <strong>" . $clienteNome . "</strong> <strong>//</strong> solicitado por: <strong>" . $pessoaNome . "</strong><br>Conteúdo do chamado: <strong>" . $desc_abertura . "</strong><br>Sendo executado pelo técnico: <strong>" . $tecnicoNome . "</strong>";
          $headers = 'From: allterus@nivel3ti.com' . "\r\n";
          $headers .= "MIME-Version: 1.0\r\n";
          $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

          $isMailSent = n3_send_mail($to_email, $subject, $body, $headers);

          //===================================CHAMADO ABERTO==========email=======================================================================================================================================================

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
        // $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        // $pdo = ConnectionN3();
        // $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = '$categoria'");
        // $show_cat->execute();
        // $row = $show_cat->fetch(PDO::FETCH_ASSOC);
        // $atd_cat_nome = $row["cat_nome"];

        $categoria = filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_cat = $pdo->prepare("SELECT categorias.cat_nome FROM categorias WHERE categorias.cat_id = :categoria"); // Usando bind para evitar SQL Injection
        $show_cat->bindParam(':categoria', $categoria, PDO::PARAM_INT); // Bind do parâmetro para maior segurança
        $show_cat->execute();

        $row = $show_cat->fetch(PDO::FETCH_ASSOC);

        if ($row) { // Verificando se a consulta retornou resultados
          $atd_cat_nome = isset($row["cat_nome"]) ? $row["cat_nome"] : ''; // Acesso seguro é chave
        } else {
          $atd_cat_nome = ''; // Valor padrão se não houver resultados
        }


        // $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        // $pdo = ConnectionN3();
        // $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = '$subcategoria'");
        // $show_scat->execute();
        // $row = $show_scat->fetch(PDO::FETCH_ASSOC);
        // $atd_scat_nome = $row["scat_nome"];

        $subcategoria = filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_scat = $pdo->prepare("SELECT subcategorias.scat_nome FROM subcategorias WHERE subcategorias.scat_id = :subcategoria"); // Usando bind para evitar SQL Injection
        $show_scat->bindParam(':subcategoria', $subcategoria, PDO::PARAM_INT); // Bind do parâmetro para maior segurança
        $show_scat->execute();

        $row = $show_scat->fetch(PDO::FETCH_ASSOC);

        if ($row) { // Verificando se a consulta retornou resultados
          $atd_scat_nome = isset($row["scat_nome"]) ? $row["scat_nome"] : ''; // Acesso seguro é chave
        } else {
          $atd_scat_nome = ''; // Valor padrão se não houver resultados
        }


        // $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        // $pdo = ConnectionN3();
        // $show_itens = $pdo->prepare("SELECT itens.itens_nome FROM itens WHERE itens.itens_id = '$item'");
        // $show_itens->execute();
        // $row = $show_itens->fetch(PDO::FETCH_ASSOC);
        // $atd_itens_nome = $row["itens_nome"];

        $item = filter_input(INPUT_POST, 'item', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $pdo = ConnectionN3();
        $show_itens = $pdo->prepare("SELECT itens.itens_nome FROM itens WHERE itens.itens_id = :item"); // Usando bind para evitar SQL Injection
        $show_itens->bindParam(':item', $item, PDO::PARAM_INT); // Bind do parâmetro para maior segurança
        $show_itens->execute();

        $row = $show_itens->fetch(PDO::FETCH_ASSOC);

        if ($row) { // Verificando se a consulta retornou resultados
          $atd_itens_nome = isset($row["itens_nome"]) ? $row["itens_nome"] : ''; // Acesso seguro é chave
        } else {
          $atd_itens_nome = ''; // Valor padrão se não houver resultados
        }


        $nivel = filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
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

        // inicio modificação prioridade //
        $prioridade = filter_input(INPUT_POST, 'prioridade', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($prioridade == 0) {
          $atd_prioridade_nome = "Não informado";
        }
        if ($prioridade == 1) {
          $atd_prioridade_nome = "Baixa";
        }
        if ($prioridade == 2) {
          $atd_prioridade_nome = "Média";
        }
        if ($prioridade == 3) {
          $atd_prioridade_nome = "Alta";
        }
        if ($prioridade == 4) {
          $atd_prioridade_nome = "Urgente";
        }

        // fim modificação prioridade //




        $forma = filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        if ($forma == 1) {
          $atd_forma_nome = "Remoto";
        }
        if ($forma == 2) {
          $atd_forma_nome = "Presencial";
        }
        if ($forma == 3) {
          $atd_forma_nome = "Remoto - Plantão";
        }
        if ($forma == 4) {
          $atd_forma_nome = "Presencial - Plantão";
        }

        $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        //BUSCA A CLASSIFICAÇÃO ORIGINAL PARA COMPARAR COM A NOVA CLASSIFICAÇÃO
        $pdo = ConnectionN3();
        // $show_atd = $pdo->prepare("SELECT atendimentos.`tipo`, atendimentos.`categoria`, atendimentos.`subcategoria`, atendimentos.`item`, atendimentos.`nivel`, atendimentos.`forma`, atendimentos.`desc_abertura`,
        $show_atd = $pdo->prepare("SELECT atendimentos.`tipo`, atendimentos.`categoria`, atendimentos.`subcategoria`, atendimentos.`item`, atendimentos.`nivel`, atendimentos.`prioridade`, atendimentos.`forma`, atendimentos.`desc_abertura`,
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

        // inicio modificação adicicionar prioridade //
        $atd_prioridade_original = $row["prioridade"];
        if ($atd_prioridade_original == 0) {
          $atd_prioridade_original_nome = "Não informado";
        }
        if ($atd_prioridade_original == 1) {
          $atd_prioridade_original_nome = "Baixa";
        }
        if ($atd_prioridade_original == 2) {
          $atd_prioridade_original_nome = "Média";
        }
        if ($atd_prioridade_original == 3) {
          $atd_prioridade_original_nome = "Alta";
        }
        if ($atd_prioridade_original == 4) {
          $atd_prioridade_original_nome = "Urgente";
        }

        // fim modificação adicicionar prioridade //

        $atd_forma_original = $row["forma"];
        if ($atd_forma_original == 1) {
          $atd_forma_original_nome = "Remoto";
        }
        if ($atd_forma_original == 2) {
          $atd_forma_original_nome = "Presencial";
        }
        if ($atd_forma_original == 3) {
          $atd_forma_original_nome = "Remoto - Plantão";
        }
        if ($atd_forma_original == 4) {
          $atd_forma_original_nome = "Presencial - Plantão";
        }

        $atd_desc_abertura_original = $row["desc_abertura"];
        //$atd_desc_abertura_original_nome = $row["desc_abertura_nome"];


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

        //COMPARA O NºVEL DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($nivel != $atd_nivel_original) {
          //ALTERA O CÓDIGO DO NºVEL NA TABELA DE ATENDIMENTOS
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

        //COMPARA A PRIORIDADE DO ATENDIMENTO:
        //SE DIFERENTE:
        if ($prioridade != $atd_prioridade_original) {
          //ALTERA O CÓDIGO DA PRIORIDADE NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `prioridade`='$prioridade' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a Prioridade: <s>De: $atd_prioridade_original_nome</s> para $atd_prioridade_nome.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Prioridade do Atendimento alterada!";
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
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a SubCategoria: <s>De: $atd_scat_original_nome</s> para $atd_scat_nome.')");
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

        //COMPARA A Descrição de Abertura :
        //SE DIFERENTE:
        if ($desc_abertura != $atd_desc_abertura_original) {
          //ALTERA O CÓDIGO DA desc_abertura DE ATENDIMENTO NA TABELA DE ATENDIMENTOS
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `desc_abertura`='$desc_abertura' WHERE `id`='$atd';");
          if ($adc->execute()) {
            //CRIA NOVO REGISTRO NA TABELA DE INTERAÇÃO INFORMANDO A ALTERAÇÃO          
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('9', '$atd', '$user_id', '$agora', 'Editou a Descrição de Abertura: <s>De: $atd_desc_abertura_original</s> para: $desc_abertura.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> Descrição de abertura alterada!";
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
        // $inter_desc = filter_input(INPUT_POST, 'inter_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $inter_desc = filter_input(INPUT_POST, 'inter_desc');
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
        //VERIFICA SE TECNICO ATRIBUÍDO é O PRÓPRIO USUÁRIO
        //SE VERDADEIRO:
        //1 - muda o status do atendimento para 2 (ATENDIMENTO EM EXECUÇÃO)
        //2 - registra na tabela de interatividade que o usuário iniciou o atendimento.
        if ($tecnico == $user_id) {
          $pdo = ConnectionN3();
          $adc = $pdo->prepare("UPDATE `atendimentos` SET `tecnico`='$tecnico', `status`='2' WHERE  `id`='$atd';");
          if ($adc->execute()) {
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('2', '$atd', '$user_id', '$agora', 'Iniciou o atendimento.')");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O status do atendimento foi alterado para 'Em Execução'!";
              $mensagem_cor = "alert-success";
            }
          }
        }
        //SE FALSO:
        //1 - mantem status do atendimento como 1 (ATENDIMENTO AGUARDANDO EXECUÇÃO)
        //1 - registra na tabela de atendimento o novo técnico responsóvel 
        //2 - busca o NOME do técnico responsóvel
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
              $mensagem = "<i class=\"fas fa-check\"></i> Beleza! <br> Agora vamos descrever as interAções com o cliente!";
              $mensagem_cor = "alert-success";

              //=====================Chamado=Saiu de ESPERA===email========================================================================================================================================================

              $show_atendimento = $pdo->prepare(
                "SELECT c.clt_nomef, c.clt_mail, p.pessoa_nom, p.pessoa_mail, u.user_nome, a.id, u.user_mail AS tecnico_mail
                FROM atendimentos a
                INNER JOIN clientes c ON c.clt_id = a.cliente
                INNER JOIN pessoas p ON p.pessoa_id = a.pessoa
                INNER JOIN usuarios u ON u.user_id = a.tecnico

                WHERE a.id = '$atd' LIMIT 0,1"
              );

              $show_atendimento->execute();
              $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

              $clienteid = isset($infos['id']) ? $infos['id'] : '';
              $tecnico_mail =  isset($infos['tecnico_mail']) ?  $infos['tecnico_mail'] : '';
              $clienteMail =  isset($infos['clt_mail']) ?  $infos['clt_mail'] : '';
              $pessoa_mail =  isset($infos['pessoa_mail']) ?  $infos['pessoa_mail'] : '';

              //Para adicionar um novo e-mail, deve-se concatenar a string ao invés de sobrescrever
              $to_email = "";
              //$to_email_3.= "clerio.junior@gmail.com";
              //$to_email_3.= ",nattan.lima@nivel3ti.com.br";
              $to_email .= "," . $tecnico_mail;
              $to_email .= "," . $pessoa_mail;
              $to_email .= "," . $clienteMail;

              // $to_email = "tecnico_mail";
              $subject_4 = "Nivel 3 TI Atendimento: #" . $atd . " ";

              $clienteNome = isset($infos['clt_nomef']) ?  $infos['clt_nomef'] : '';
              $tecnicoNome = isset($infos['user_nome']) ?  $infos['user_nome'] : '';
              $pessoaNome =  isset($infos['pessoa_nom']) ? $infos['pessoa_nom'] : '';

              $body_4 = "<strong>CHAMADO RETOMOU DA ESPERA - N3TI</strong><br>Empresa: <strong>" . $clienteNome . "</strong> <strong>//</strong> Solicitado por: <strong>" . $pessoaNome . "</strong><br>Conteúdo do chamado (Retomou da Espera): <strong>" . "</strong><br>Em Espera, sendo executado pelo técnico: <strong>" . $tecnicoNome . "</strong>";
              $headers_4 = 'From: allterus@nivel3ti.com' . "\r\n";
              $headers_4 .= "MIME-Version: 1.0\r\n";
              $headers_4 .= "Content-Type: text/html; charset=UTF-8\r\n";

              $isMailSent = n3_send_mail($to_email, $subject_4, $body_4, $headers_4);

              //=====================Chamado=SAIU ESPERA===email========================================================================================================================================================

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
        $inter_desc = filter_input(INPUT_POST, 'inter_desc');
        //VERIFICA SE O ATENDIMENTO FOI DIRECIONADO PARA OUTRO TÉCNICO
        //SE VERDADEIRO:
        //1 - muda o status do atendimento para 1 (aguardando atendimento)
        //1 - registra na tabela de atendimento o novo técnico responsóvel 
        //2 - busca o NOME do técnico responsóvel
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
        //1 - remove o técnico como responsóvel pelo atendimento
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
        $espera_desc = filter_input(INPUT_POST, 'espera_desc');
        $espera_prev = filter_input(INPUT_POST, 'espera_prev');
        $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
        $espera_causa = filter_input(INPUT_POST, 'espera_causa');
        $id_melhorias = filter_input(INPUT_POST, 'id_melhorias');



        $pdo = ConnectionN3();
        //altera status do atendimento para 3 (Em espera)
        $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='3' WHERE  `id`='$atd';");
        if ($edt->execute()) {
          //insere registro de espera na tabela de espera
          $adc = $pdo->prepare("INSERT INTO `espera` (`espera_atd`, `id_melhorias`, `espera_start`, `espera_prev`, `espera_desc`,  `espera_causa`, `espera_user`) VALUES ('$atd', '$id_melhorias', '$agora', '$espera_prev', '$espera_desc', '$espera_causa', '$user_id');");
          if ($adc->execute()) {
            // Atualiza a coluna id_melhorias na tabela espera
            $select = $pdo->prepare("SELECT `id` FROM `melhorias`");
            $select->execute();
            $ids_melhorias = $select->fetchAll(PDO::FETCH_COLUMN);
            //insere registro da ação na tabela de interatividade
            $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('5', '$atd', '$user_id', '$agora', 'Colocou o atendimento Em Espera. <br> Previsão de retorno: $espera_prev_br <br>  Causa: $espera_causa <br> Descrição: $espera_desc');");
            if ($adc->execute()) {
              $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi colocado Em Espera.";
              $mensagem_cor = "alert-warning";

              //=====================Chamado=EM ESPERA===email========================================================================================================================================================

              $show_atendimento = $pdo->prepare(
                "SELECT c.clt_nomef, c.clt_mail, p.pessoa_nom, p.pessoa_mail, u.user_nome, a.id, u.user_mail AS tecnico_mail
                                FROM atendimentos a
                                INNER JOIN clientes c ON c.clt_id = a.cliente
                                INNER JOIN pessoas p ON p.pessoa_id = a.pessoa
                                INNER JOIN usuarios u ON u.user_id = a.tecnico

                                WHERE a.id = '$atd' LIMIT 0,1"
              );

              $show_atendimento->execute();
              $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

              $clienteid = isset($infos['id']) ? $infos['id'] : '';
              $tecnico_mail =  isset($infos['tecnico_mail']) ?  $infos['tecnico_mail'] : '';
              $clienteMail =  isset($infos['clt_mail']) ?  $infos['clt_mail'] : '';
              $pessoa_mail =  isset($infos['pessoa_mail']) ?  $infos['pessoa_mail'] : '';

              //Para adicionar um novo e-mail, deve-se concatenar a string ao invés de sobrescrever
              $to_email = "";
              //$to_email_3.= "clerio.junior@gmail.com";
              //$to_email_3.= ",nattan.lima@nivel3ti.com.br";
              $to_email .= "," . $tecnico_mail;
              $to_email .= "," . $pessoa_mail;
              $to_email .= "," . $clienteMail;

              // $to_email = "tecnico_mail";
              $subject_3 = "Nivel 3 TI Atendimento: #" . $atd . " ";

              /* $clienteNome = $cliente['clt_nomef'];
              $pessoaNome = $pessoa['pessoa_nom'];
              $tecnicoNome = $showTecnico['user_nome']; */

              $clienteNome = isset($infos['clt_nomef']) ?  $infos['clt_nomef'] : '';
              $tecnicoNome = isset($infos['user_nome']) ?  $infos['user_nome'] : '';
              $pessoaNome =  isset($infos['pessoa_nom']) ? $infos['pessoa_nom'] : '';

              $body_3 = "<strong>CHAMADO EM ESPERA - N3TI</strong><br>Empresa: <strong>" . $clienteNome . "</strong> <strong>//</strong> Solicitado por: <strong>" . $pessoaNome . "</strong><br>Conteúdo do chamado (Em Espera): <strong>" . $espera_desc . "</strong><br>Em Espera, sendo executado pelo técnico: <strong>" . $tecnicoNome . "</strong>";
              $headers_3 = 'From: allterus@nivel3ti.com' . "\r\n";
              $headers_3 .= "MIME-Version: 1.0\r\n";
              $headers_3 .= "Content-Type: text/html; charset=UTF-8\r\n";

              $isMailSent = n3_send_mail($to_email, $subject_3, $body_3, $headers_3);

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


      // //COLOCAR ATENDIMENTO EM concluido
      // if ($action == "atd_concluido") {
      //     // $concluido_desc = filter_input(INPUT_POST, 'concluido_desc', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      //     $concluido_desc = $_POST['concluido_desc'];
      //     $concluido_prev = filter_input(INPUT_POST, 'concluido_prev', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      //     $concluido_prev_br = date('d/m/Y H:i', strtotime($concluido_prev));
      //     $pdo = ConnectionN3();
      //     //altera status do atendimento para 3 (Em espera)
      //     $edt = $pdo->prepare("UPDATE `atendimentos` SET `status`='5' WHERE  `id`='$atd';");
      //     if ($edt->execute()) {
      //         //insere registro de espera na tabela de espera
      //         $adc = $pdo->prepare("INSERT INTO `concluido` (`concluido_atd`, `concluido_start`, `concluido_prev`, `concluido_desc`, `concluido_user`) VALUES ('$atd', '$agora', '$concluido_prev', '$concluido_desc', '$user_id');");
      //         if ($adc->execute()) {
      //             //insere registro da ação na tabela de interatividade
      //             $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('10', '$atd', '$user_id', '$agora', 'Colocou o atendimento como concluido. <br> Descrição: $concluido_desc');");
      //             if ($adc->execute()) {

      //                 //===========================================FINALIZADO======email============================================= EMAIL

      //                 $show_atendimento = $pdo->prepare(
      //                     "SELECT c.clt_nomef, c.clt_mail, p.pessoa_nom, p.pessoa_mail, u.user_nome, a.id, u.user_mail AS tecnico_mail
      //                     FROM atendimentos a
      //                     INNER JOIN clientes c ON c.clt_id = a.cliente
      //                     INNER JOIN pessoas p ON p.pessoa_id = a.pessoa
      //                     INNER JOIN usuarios u ON u.user_id = a.tecnico
      //                     WHERE a.id = '$atd' LIMIT 0,1"
      //                 );

      //                 $show_atendimento->execute();
      //                 $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

      //                 $clienteid = isset($infos['id']) ? $infos['id'] : '';
      //                 $tecnico_mail =  isset($infos['tecnico_mail']) ?  $infos['tecnico_mail'] : '';
      //                 $clienteMail =  isset($infos['clt_mail']) ?  $infos['clt_mail'] : '';
      //                 $pessoa_mail =  isset($infos['pessoa_mail']) ?  $infos['pessoa_mail'] : '';

      //                 //Para adicionar um novo e-mail, deve-se concatenar a string ao invés de sobrescrever
      //                 $to_email = "";
      //                 //$to_email.= "clerio.junior@gmail.com";
      //                 //$to_email.= ",nattan.lima@nivel3ti.com.br";
      //                 $to_email .= "," . $tecnico_mail;
      //                 $to_email .= "," . $pessoa_mail;
      //                 $to_email .= "," . $clienteMail;

      //                 // $to_email = "tecnico_mail";
      //                 $subject_2 = "Nivel 3 TI Atendimento: #" . $atd . " ";

      //                 $clienteNome = isset($infos['clt_nomef']) ?  $infos['clt_nomef'] : '';
      //                 $tecnicoNome = isset($infos['user_nome']) ?  $infos['user_nome'] : '';
      //                 $pessoaNome =  isset($infos['pessoa_nom']) ? $infos['pessoa_nom'] : '';

      //                 $body_2 = "<strong>CHAMADO FINALIZADO - N3TI</strong><br>Empresa: <strong>" . $clienteNome . "</strong> <strong>//</strong> Solicitado por: <strong>" . $pessoaNome . "</strong><br>Conteúdo do chamado: <strong>" . $concluido_desc . "</strong><br>Finalizado e executado pelo técnico: <strong>" . $tecnicoNome . "</strong>";
      //                 //$desc_fechamento
      //                 $headers_2 = 'From: allterus@nivel3ti.com' . "\r\n";
      //                 $headers_2 .= "MIME-Version: 1.0\r\n";
      //                 $headers_2 .= "Content-Type: text/html; charset=UTF-8\r\n";

      //                 $isMailSent = n3_send_mail($to_email, $subject_2, $body_2, $headers_2);

      //                 //=====================Chamado=FINALIZADO================email============================================================================================================================================================


      //                 $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi colocado como concluído.";
      //                 $mensagem_cor = "alert-warning";
      //             } else {
      //                 $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao colocar atendimento como concluído!";
      //                 $mensagem_cor = "alert-danger";
      //             }
      //         } else {
      //             $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao inserir registro na tabela de concluído!";
      //             $mensagem_cor = "alert-danger";
      //         }
      //     } else {
      //         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar o status do atendimento!";
      //         $mensagem_cor = "alert-danger";
      //     }
      // }

      //COLOCAR ATENDIMENTO EM concluido
      if ($action == "atd_concluido") {

        // 1. Coleta e sanitização de dados
        $concluido_desc = $_POST['concluido_desc'];
        $concluido_prev = filter_input(INPUT_POST, 'concluido_prev', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $concluido_prev_br = date('d/m/Y H:i', strtotime($concluido_prev));

        // Variáveis de mensagens
        $mensagem = "";
        $mensagem_cor = "";

        // Início do Bloco Transacional (DB)
        try {
          $pdo = ConnectionN3();

          // ** INICIA A TRANSAÇÃO: Garante Atomicidade (Tudo ou Nada) **
          $pdo->beginTransaction();

          // 2. [Consulta 1] - ALTERA STATUS do atendimento para '5' (Concluído)
          $sql_update_status = "UPDATE `atendimentos` SET `status`='5' WHERE `id`=:atd";
          $stmt_update_status = $pdo->prepare($sql_update_status);
          $stmt_update_status->bindParam(':atd', $atd, PDO::PARAM_INT);
          $stmt_update_status->execute();

          // 3. [Consulta 2] - INSERE REGISTRO na tabela `concluido`
          $sql_insert_concluido = "INSERT INTO `concluido` (`concluido_atd`, `concluido_start`, `concluido_prev`, `concluido_desc`, `concluido_user`) 
                                 VALUES (:atd, :agora, :concluido_prev, :concluido_desc, :user_id)";
          $stmt_insert_concluido = $pdo->prepare($sql_insert_concluido);
          $stmt_insert_concluido->bindParam(':atd', $atd, PDO::PARAM_INT);
          $stmt_insert_concluido->bindParam(':agora', $agora);
          $stmt_insert_concluido->bindParam(':concluido_prev', $concluido_prev);
          $stmt_insert_concluido->bindParam(':concluido_desc', $concluido_desc);
          $stmt_insert_concluido->bindParam(':user_id', $user_id, PDO::PARAM_INT);
          $stmt_insert_concluido->execute();

          // 4. [Consulta 3] - INSERE REGISTRO da ação na tabela `interatividade`
          $descricao_interatividade = "Colocou o atendimento como concluido. <br> Descrição: " . $concluido_desc;
          $sql_insert_interatividade = "INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) 
                                     VALUES ('10', :atd, :user_id, :agora, :descricao)";
          $stmt_insert_interatividade = $pdo->prepare($sql_insert_interatividade);
          $stmt_insert_interatividade->bindParam(':atd', $atd, PDO::PARAM_INT);
          $stmt_insert_interatividade->bindParam(':user_id', $user_id, PDO::PARAM_INT);
          $stmt_insert_interatividade->bindParam(':agora', $agora);
          $stmt_insert_interatividade->bindParam(':descricao', $descricao_interatividade);
          $stmt_insert_interatividade->execute();

          // 5. Se o DB foi bem-sucedido: Salva as alterações
          $pdo->commit();

          // 6. Mensagem de Sucesso (Inicial - sem considerar o email ainda)
          $mensagem = "<i class=\"fas fa-check\"></i> OK! <br> O atendimento foi colocado como concluído.";
          $mensagem_cor = "alert-warning";

          // =================================== INÍCIO DO BLOCO DE E-MAIL ISOLADO ===================================
          try {

            // 6.1. Busca de dados para o e-mail
            $show_atendimento = $pdo->prepare(
              "SELECT c.clt_nomef, c.clt_mail, p.pessoa_nom, p.pessoa_mail, u.user_nome, a.id, u.user_mail AS tecnico_mail
                  FROM atendimentos a
                  INNER JOIN clientes c ON c.clt_id = a.cliente
                  INNER JOIN pessoas p ON p.pessoa_id = a.pessoa
                  INNER JOIN usuarios u ON u.user_id = a.tecnico
                  WHERE a.id = :atd LIMIT 0,1"
            );
            $show_atendimento->bindParam(':atd', $atd, PDO::PARAM_INT);
            $show_atendimento->execute();
            $infos = $show_atendimento->fetch(PDO::FETCH_ASSOC);

            // 6.2. Montagem dos destinatérios e corpo
            $tecnico_mail = isset($infos['tecnico_mail']) ? $infos['tecnico_mail'] : '';
            $clienteMail = isset($infos['clt_mail']) ? $infos['clt_mail'] : '';
            $pessoa_mail = isset($infos['pessoa_mail']) ? $infos['pessoa_mail'] : '';

            $to_email = "";
            $to_email .= "," . $tecnico_mail;
            $to_email .= "," . $pessoa_mail;
            $to_email .= "," . $clienteMail;

            $subject_2 = "Nivel 3 TI Atendimento: #" . $atd . " ";
            $clienteNome = isset($infos['clt_nomef']) ?  $infos['clt_nomef'] : '';
            $tecnicoNome = isset($infos['user_nome']) ?  $infos['user_nome'] : '';
            $pessoaNome = isset($infos['pessoa_nom']) ? $infos['pessoa_nom'] : '';

            $body_2 = "<strong>CHAMADO FINALIZADO - N3TI</strong><br>Empresa: <strong>" . $clienteNome . "</strong> <strong>//</strong> Solicitado por: <strong>" . $pessoaNome . "</strong><br>Conteúdo do chamado: <strong>" . $concluido_desc . "</strong><br>Finalizado e executado pelo técnico: <strong>" . $tecnicoNome . "</strong>";
            $headers_2 = 'From: allterus@nivel3ti.com' . "\r\n";
            $headers_2 .= "MIME-Version: 1.0\r\n";
            $headers_2 .= "Content-Type: text/html; charset=UTF-8\r\n";

            // 6.3. Envio
            $isMailSent = n3_send_mail($to_email, $subject_2, $body_2, $headers_2);

            if (!$isMailSent) {
              // Se a função n3_send_mail() retornar false (falha no envio), adiciona um aviso é mensagem de sucesso
              $mensagem .= "<br><i class=\"fas fa-exclamation-triangle\"></i> **AVISO:** Falha no envio do e-mail de notificação.";
            }
          } catch (Exception $e) {
            // Se o e-mail falhar por qualquer motivo (ex: erro de sintaxe, falha de conexão SMTP)
            // APENAS adicionamos um aviso, mas o sucesso do DB permanece.
            $mensagem .= "<br><i class=\"fas fa-exclamation-triangle\"></i> **AVISO:** Falha no processamento do e-mail. Contate o suporte técnico.";
            // Para debug, você pode registrar o erro $e->getMessage() em um log.
          }
          // =================================== FIM DO BLOCO DE E-MAIL ISOLADO ===================================


        } catch (Exception $e) {
          // Bloco CATCH PRINCIPAL (Falha Crítica no DB)

          // ** DESFAZ AS ALTERAÇÕES: Garante que o status NºO mudou **
          if ($pdo->inTransaction()) {
            $pdo->rollBack();
          }

          // 8. Mensagem de erro
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha Crítica! O status do atendimento não foi alterado devido a um erro no processamento do banco de dados.";
          $mensagem_cor = "alert-danger";

          error_log("Falha na Transação PDO: " . $e->getMessage()); // Grava no log do servidor

          $mensagem .= "<br>Detalhes do Erro (Debug): " . $e->getMessage();
        }
      }


      // //USUÁRIO FINALIZA UM ATENDIMENTO
      // if ($action == "atd_finalizar") {
      //     // $desc_fechamento = filter_input(INPUT_POST, 'desc_fechamento', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
      //     $desc_fechamento = trim(filter_input(INPUT_POST, 'desc_fechamento', FILTER_UNSAFE_RAW));
      //     $pdo = ConnectionN3();
      //     $adc = $pdo->prepare("UPDATE `atendimentos` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE  `id`='$atd';");
      //     $adc->bindParam(':desc_fechamento', $desc_fechamento);
      //     $adc->bindParam(':fechamento', $agora);
      //     if ($adc->execute()) {
      //         $pdo = ConnectionN3();
      //         $adc = $pdo->prepare("INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) VALUES ('8', '$atd', '$user_id', '$agora', 'Finalizou o atendimento. <br> Descrição: $desc_fechamento');");
      //         if ($adc->execute()) {

      //             $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O que mais temos para hoje?!";
      //             $mensagem_cor = "alert-success";
      //         }
      //     } else {
      //         $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao finalizar o atendimento!";
      //         $mensagem_cor = "alert-danger";
      //     }
      // }

      //USUÁRIO FINALIZA UM ATENDIMENTO
      if ($action == "atd_finalizar") {

        $desc_fechamento = trim(filter_input(INPUT_POST, 'desc_fechamento', FILTER_UNSAFE_RAW));

        $mensagem = "";
        $mensagem_cor = "";

        try {
          $pdo = ConnectionN3();

          $pdo->beginTransaction();

          $sql_update_status = "UPDATE `atendimentos` SET `desc_fechamento`=:desc_fechamento, `fechamento`=:fechamento, `status`='4' WHERE `id`=:atd";
          $stmt_update_status = $pdo->prepare($sql_update_status);

          $stmt_update_status->bindParam(':desc_fechamento', $desc_fechamento);
          $stmt_update_status->bindParam(':fechamento', $agora);
          $stmt_update_status->bindParam(':atd', $atd, PDO::PARAM_INT);
          $stmt_update_status->execute();

          $descricao_interatividade = "Finalizou o atendimento. <br> Descrição: " . $desc_fechamento;
          $sql_insert_interatividade = "INSERT INTO `interatividade` (`inter_tipo`, `inter_atd`, `inter_user`, `inter_data`, `inter_desc`) 
                                     VALUES ('8', :atd, :user_id, :agora, :descricao)";
          $stmt_insert_interatividade = $pdo->prepare($sql_insert_interatividade);

          $stmt_insert_interatividade->bindParam(':atd', $atd, PDO::PARAM_INT);
          $stmt_insert_interatividade->bindParam(':user_id', $user_id, PDO::PARAM_INT);
          $stmt_insert_interatividade->bindParam(':agora', $agora);
          $stmt_insert_interatividade->bindParam(':descricao', $descricao_interatividade);
          $stmt_insert_interatividade->execute();

          // ** FINALIZA A TRANSAÇÃO: Salva ambas as alterações no banco de dados **
          $pdo->commit();

          // 5. Mensagem de sucesso
          $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> O que mais temos para hoje?!";
          $mensagem_cor = "alert-success";
        } catch (Exception $e) {
          if ($pdo->inTransaction()) {
            $pdo->rollBack();
          }

          // Mensagem de erro
          $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha Crítica ao finalizar o atendimento! A operação foi desfeita.";
          $mensagem_cor = "alert-danger";

          // Para debug, você pode adicionar a exibição do erro no console (F12)
          $erro_js = json_encode("ERRO CRÍTICO DB: Falha na finalização do atendimento. Detalhes: " . $e->getMessage());
          echo "<script>console.error($erro_js);</script>";
        }
      }
    }
  }

  if ($action == "atd_feedback") {
    $pdo = ConnectionN3();
    $query = $pdo->prepare("SELECT atendimentos.tecnico, atendimentos.pessoa FROM atendimentos WHERE id = '$atd'");
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
    $texto = "Olá poderia avaliar meu atendimento através do link:";
    $link = $tecnico_link;   //

    $mensagem = "<i class=\"fas fa-check\"></i> ótimo! <br> Feedback Solicitado.";
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
                      <!-- <option value="1">Falha</option> -->
                      <option value="2">Relacionamento</option>
                      <option value="3">Requisição de Serviços</option>
                      <option value="4">Requisição de informações</option>
                      <!-- <option value="5">Notificação de monitoramento</option> -->
                      <option value="6">Melhorias</option>
                      <!--  <option value="7">Tarefa</option> -->

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
                    <label class="my-0 small">SubCategoria:</label>
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
                    <select name="nivel" class="form-control form-control-sm" tabindex="8">
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


                <!-- INICIO modificação acrescenta prioridade do chamado -->

                <div class="form-row">
                  <div class="form-group col-sm-6 col-md-2">
                    <label class="my-0 small">Prioridade:</label>
                    <select name="prioridade" class="form-control form-control-sm" tabindex="9">
                      <option></option>
                      <option value="1" selected>Baixa</option>
                      <option value="2">Média</option>
                      <option value="3">Alta</option>
                      <option value="4">Urgente</option>
                    </select>
                  </div>

                  <!-- FIM modificação acrescenta prioridade do chamado -->

                  <div class="form-group col-sm-2 col-md-1">
                    <label class="my-0 small">Recorrente:</label>
                    <select name="recorrente" id="recorrente" class="form-control form-control-sm" required="required" tabindex="9">
                      <option value="1">Não</option>
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

                      <option value="0" selected>Nenhuma</option>
                      <option value="1">Diario</option>
                      <option value="6">Semanal</option>
                      <option value="7" id="semana_mes_output"></option>
                      <option value="2">Todo mês</option>
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
                        <label class="my-0 small">Tecnico:</label>
                        <select name="tecnico" id="tecnico" class="form-control form-control-sm selectpicker" data-live-search="true" required="required" tabindex="14">
                          <option></option>
                          <option value="0">Não determinado</option>
                          <?php
                          if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 1) {
                            $pdo = ConnectionN3();
                            $show_clt = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome FROM usuarios  where usuarios.user_sts = '1' AND usuarios.user_funcao IN (1,2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14) ORDER BY usuarios.user_nome ASC");
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
                          <option value="3">Remoto - Plantão</option>
                          <option value="4">Presencial - Plantão</option>
                        </select>
                      </div>

                      <div class="form-group col-sm-12 col-md-6">
                        <label class="my-0 small">Abertura:</label>
                        <input type="text" name="abertura" value="<?php echo date("Y-m-d H:i", strtotime($agora)); ?>" required="required" readonly class="form-control form-control-sm form_datetime" tabindex="16">
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
  // Detalhe de atendimento fica em atd_detalhe.php.
  // Mantém atd.php focado no cadastro/lista para reduzir manutenção.
  if (!empty($atd)) {
    header("Location: atd_detalhe.php?atd=" . urlencode((string)$atd));
    exit;
  }
  ?>

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


  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
  <script src="../js/bootstrap-select.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.47/js/bootstrap-datetimepicker.min.js"></script>



  <script>
    // Faz a mensagem desaparecer após 4 segundos
    window.setTimeout(function() {
      $(".alert").fadeOut(500, function() {
        $(this).remove();
      });
    }, 3000);
  </script>

</body>

</html>
