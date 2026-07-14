<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
//include_once("../all/token.php");
$hoje = date("Y-m-d");
$agora = date("Y-m-d H:i:s");

//verifico se existe alguma requisição POST chamada action
$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if ($action == "alterar_senha") {
  include_once("../all/update_senha.php");
}

$ano = date('Y', strtotime('-0 months', strtotime(date('Y-m-d'))));
$mes = date('m', strtotime('-0 months', strtotime(date('Y-m-d'))));
//RECEBE INFORMAÇÕES PARA FILTRO
$f_clt = $_POST['f_clt'] ?? 0;
$f_tec = $_POST['f_tec'] ?? "%";
$data_1 = $_POST['data_1'] ?? "$hoje";
$data_2 = $_POST['data_2'] ?? "$hoje";
//RECEBE INFORMAÇÕES PARA FILTRO local
if (isset($_POST['f_clt'])) {
  $f_clt = $_POST['f_clt'];
} else {
  $f_clt = 0;
}
if (isset($_POST['f_local'])) {
  $f_local = $p_local = $_POST['f_local'];
} else {
  $f_local = 0;
}
if ($f_local == 0) {
  $p_local = "%";
}

// Inicializa as variáveis
$total_tarefas = 0;
$total_sla = 0;

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
  <script type="text/javascript" src="../js/loader.js"></script>
  <title>Allterus</title>
  <style>
    .info-card {
      background-color: #f8f9fa;
      border-radius: 8px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
      padding: 20px;
      margin-top: 10px;
      width: 250px;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .info-card p {
      margin: 0;
      margin-bottom: 10px;
      font-size: 14px;
    }

    .info-card button.close-btn {
      background-color: transparent;
      border: none;
      font-size: 16px;
      position: absolute;
      top: 5px;
      right: 10px;
      cursor: pointer;
    }
  </style>
</head>

<body>
  <?php include_once("../all/sidebar.php"); ?>

  <div class="container-fluid">
    <div class="row">
      <div class="col-md-12 mt-2">
        <div class="card">
          <div id="accordion">
            <div class="card py-0 my-0">
              <div class="card-header my-0 bg-light py-0 h6" id="headingOne">
                <button class="btn" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                  <i class="fas fa-chart-bar"></i> <strong><i>Relatório de Tarefas Por Cliente e Tecnico</i></strong>

                </button>
              </div>
              <div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#accordion">
                <div class="card-body py-0">
                  <div class="row">
                    <div class="col-12">
                      <form action="#" method="POST">
                        <div class="form-row align-items-center">
                          <div class="col-auto col-form-label-sm">
                            <label>Cliente:</label>
                            <select name="f_clt" id="f_clt" class="form-control form-control-sm mb-2 mt-n2 selectpicker" data-live-search="true" required="required" tabindex="1">
                              <option value="0">Todos os Clientes</option>
                              <?php
                              $pdo = ConnectionN3();
                              $show_clt = $pdo->prepare("
                                SELECT clientes.clt_id, clientes.clt_nomef 
                                FROM clientes 
                                WHERE clientes.clt_sts = '1' 
                                AND clientes.clt_mkt = '1'
                                ORDER BY clientes.clt_nomef ASC
                              ");
                              $show_clt->execute();
                              while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                                $clt_id = $exibe["clt_id"];
                                $clt_nome = $exibe["clt_nomef"];
                                echo '<option value="' . $clt_id . '"' . ($f_clt == $clt_id ? ' selected' : '') . '>' . $clt_nome . '</option>';
                              }
                              ?>
                            </select>
                          </div>
                          <div class="col-auto col-form-label-sm">
                            <label>DevOps:</label>
                            <select name="f_tec" class="form-control form-control-sm mb-2 mt-n2 selectpicker" data-live-search="true" required="required" tabindex="1">
                              <option value="%">Todos</option>
                              <?php
                              $sql = "
                                SELECT user_id, user_nome 
                                FROM usuarios 
                                WHERE user_sts = '1'
                                AND user_id > '1'
                                AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 1, 1) AS UNSIGNED) >= 1
                                AND CAST(SUBSTRING(COALESCE(user_modulo_08, '0000000000'), 3, 1) AS UNSIGNED) >= 2
                                ORDER BY user_nome ASC
                              ";
                              $stmt = $pdo->prepare($sql);
                              $stmt->execute();
                              while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                                echo '<option value="' . $row['user_id'] . '"' . ($f_tec == $row['user_id'] ? ' selected' : '') . '>' . $row['user_nome'] . '</option>';
                              }
                              ?>
                            </select>
                          </div>
                          <div class="col-auto col-form-label-sm">
                            <label>De:</label>
                            <input id="dat" name="data_1" type="date" value="<?php echo $data_1; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                          </div>
                          <div class="col-auto col-form-label-sm">
                            <label>a:</label>
                            <input id="dat" name="data_2" type="date" value="<?php echo $data_2; ?>" class="form-control mb-2 mt-n2 form-control-sm">
                          </div>






                          <div class="col-sm-2 col-4">
                            <button type="submit" class="btn btn-info">Filtrar</button>
                            <button type="button" class="btn btn-success ml-2" onclick="showInfoCard()">SLA</button>
                          </div>
                        </div>
                      </form>
                      <div id="card-container"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row mt-2 mb-2">
      <div class="col-md-12">
        <div class="card bg-default">
          <div class="card-header py-2 h6">
            <i class="fas fa-chart-pie"></i>
            <strong><i>Tarefas Por Cliente e Tecnico
                <br>Saiba mais acessando: <i class="far fa-question-circle text-danger">Help</i></strong>
          </div>
          <?php
          $pdo = ConnectionN3();
          $filterEmpresas = "";

          if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
            $filterEmpresas .= " AND tarefas_terc_andar.cliente IN (" . implode(',', $_SESSION['empresas']) . ")";
          }

          $query = "
            SELECT COUNT(tarefas_terc_andar.id) AS n 
            FROM tarefas_terc_andar 
            WHERE tarefas_terc_andar.cliente = IF(:f_clt = 0, tarefas_terc_andar.cliente, :f_clt)
            AND tarefas_terc_andar.tecnico LIKE :f_tec
            AND tarefas_terc_andar.abertura BETWEEN :data_1 AND :data_2
          " . $filterEmpresas;
          $qnt = $pdo->prepare($query);
          $qnt->bindParam(':f_clt', $f_clt, PDO::PARAM_INT);
          $qnt->bindParam(':f_tec', $f_tec, PDO::PARAM_STR);
          $qnt->bindParam(':data_1', $data_1, PDO::PARAM_STR);
          $qnt->bindParam(':data_2', $data_2, PDO::PARAM_STR);
          $qnt->execute();
          $total = $qnt->fetch(PDO::FETCH_ASSOC);

          $show = $pdo->prepare("
            SELECT 
              clientes.clt_nomer,
              locais.local_nom,
              locais.local_end,
              locais.local_city,
              locais.local_uf,
              pessoas.pessoa_nom,

              categorias_terc_andar.nome AS cat_nome,
              subcategorias_terc_andar.nome AS scat_nome,
              tipos_terc_andar.nome AS tipo_nome,
              niveis_terc_andar.nome AS nivel_nome,

              itens.itens_nome,
              usuarios.user_nome,

              tarefas_terc_andar.id,
              tarefas_terc_andar.tipo,
              tarefas_terc_andar.forma,
              tarefas_terc_andar.nivel,
              tarefas_terc_andar.desc_abertura,
              tarefas_terc_andar.desc_fechamento,
              tarefas_terc_andar.abertura,
              tarefas_terc_andar.fechamento,
              tarefas_terc_andar.status,

              TIMESTAMPDIFF(HOUR, tarefas_terc_andar.abertura, tarefas_terc_andar.fechamento) AS sla_horas

            FROM tarefas_terc_andar

            INNER JOIN clientes 
              ON clientes.clt_id = tarefas_terc_andar.cliente

            LEFT JOIN locais 
              ON locais.local_id = tarefas_terc_andar.local

            LEFT JOIN pessoas 
              ON pessoas.pessoa_id = tarefas_terc_andar.pessoa

            LEFT JOIN tipos_terc_andar 
              ON tipos_terc_andar.id = tarefas_terc_andar.tipo

            LEFT JOIN categorias_terc_andar 
              ON categorias_terc_andar.id = tarefas_terc_andar.categoria

            LEFT JOIN subcategorias_terc_andar 
              ON subcategorias_terc_andar.id = tarefas_terc_andar.subcategoria

            LEFT JOIN niveis_terc_andar 
              ON niveis_terc_andar.id = tarefas_terc_andar.nivel

            LEFT JOIN itens 
              ON itens.itens_id = tarefas_terc_andar.item

            LEFT JOIN usuarios 
              ON usuarios.user_id = tarefas_terc_andar.tecnico

            WHERE tarefas_terc_andar.status > '0'
            AND tarefas_terc_andar.cliente = IF(:f_clt = 0, tarefas_terc_andar.cliente, :f_clt)
            AND tarefas_terc_andar.tecnico LIKE :f_tec
            AND tarefas_terc_andar.local LIKE :p_local
            AND tarefas_terc_andar.abertura BETWEEN :data_1 AND :data_2

            ORDER BY tarefas_terc_andar.abertura ASC
          ");

          $show->bindParam(':f_clt', $f_clt, PDO::PARAM_INT);
          $show->bindParam(':f_tec', $f_tec, PDO::PARAM_STR);
          $show->bindParam(':p_local', $p_local, PDO::PARAM_STR);
          $show->bindParam(':data_1', $data_1, PDO::PARAM_STR);
          $show->bindParam(':data_2', $data_2, PDO::PARAM_STR);
          $show->execute();

          $total_tarefas = 0;
          $total_sla = 0;

          while ($row = $show->fetch(PDO::FETCH_ASSOC)) {
            $clt_nomer = $row["clt_nomer"];
            $local_nom = $row["local_nom"];
            $local_end = $row["local_end"];
            $local_city = $row["local_city"];
            $local_uf = $row["local_uf"];
            $pessoa_nom = $row["pessoa_nom"];
            $cat_nome = $row["cat_nome"];
            $scat_nome = $row["scat_nome"];
            $itens_nome = $row["itens_nome"];
            $user_nome = $row["user_nome"];
            $tarefas_id = $row["id"];
            $tarefas_tipo = $row["tipo"];
            $tarefas_forma = $row["forma"];
            $tarefas_nivel = $row["nivel"];
            $tarefas_desc_abertura = $row["desc_abertura"];
            $tarefas_desc_fechamento = $row["desc_fechamento"];
            $tarefas_abertura = $row["abertura"];
            $tarefas_fechamento = $row["fechamento"];
            $tarefas_status = $row["status"];
            $sla_horas = $row["sla_horas"];

            $total_tarefas++;
            $total_sla += $sla_horas;
          ?>

            <section class="py-1">
              <div class="container">
                <div class="row">
                  <div class="col-12 h5 bg-light py-2 border-top">
                    Tarefas #<?php echo str_pad($tarefas_id, 5, '0', STR_PAD_LEFT); ?> |
                    <i class="fas fa-map-marked-alt mr-2"></i><?php echo $local_nom; ?> |
                    <i class="fas fa-user-tag mr-2"></i><?php echo $pessoa_nom; ?>
                  </div>


                </div>
                <div class="row">
                  <div class="col-md-4 mb-3">
                    <div class="row py-1">
                      <span class="badge badge-light mx-1">
                        <i class="far fa-clock text-info mr-1"></i> Abertura: <?php echo date('d/m/Y H:i', strtotime($tarefas_abertura)); ?>
                      </span>
                    </div>
                    <div class="row py-1">
                      <span class="badge badge-secondary mx-1">
                        <?php if ($tarefas_forma == 1) { ?> <i class="fas fa-laptop-house mx-1"></i> Atendimento Remoto <?php } ?>
                        <?php if ($tarefas_forma == 2) { ?> <i class="fas fa-briefcase mx-1"></i> Atendimento Presencial <?php } ?>
                      </span>
                      <span class="badge badge-secondary mx-1"> <i class="fas fa-archive ml-1 mr-1"></i> Nível <?php echo $tarefas_nivel; ?> </span>
                    </div>
                    <div class="row py-1">
                      <span class="badge badge-secondary mx-1">
                        <?php if ($tarefas_tipo == 1) { ?> <i class="fas fa-laptop-house mx-1"></i> Falha <?php } ?>
                        <?php if ($tarefas_tipo == 2) { ?> <i class="fas fa-laptop-house mx-1"></i> Relacionamento <?php } ?>
                        <?php if ($tarefas_tipo == 3) { ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de Serviços <?php } ?>
                        <?php if ($tarefas_tipo == 4) { ?> <i class="fas fa-laptop-house mx-1"></i> Requisição de informação <?php } ?>
                        <?php if ($tarefas_tipo == 5) { ?> <i class="fas fa-laptop-house mx-1"></i> Notificação de monitoramento <?php } ?>
                      </span>
                    </div>
                    <div class="row py-1">
                      <?php if ($cat_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="far fa-folder-open mx-1 text-dark"></i> <?php echo $cat_nome; ?> </span> <?php } ?>
                      <?php if ($scat_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="far fa-file-alt mx-1 text-dark"></i> <?php echo $scat_nome; ?> </span> <?php } ?>
                      <?php if ($itens_nome != "") { ?> <span class="badge badge-light mx-1"> <i class="fas fa-list-ol mx-1 text-dark"></i> <?php echo $itens_nome; ?> </span> <?php } ?>
                    </div>
                  </div>
                  <div class="col-md-4 mb-3 px-4">
                    <div class="row py-1 ">
                      <span class="badge badge-light mx-1"> <i class="fas fa-user-tie mr-1"></i> Tecnico: <?php echo $user_nome; ?> </span>
                    </div>
                    <div class="row py-1">
                      <p>Descrição de abertura: <?php echo $tarefas_desc_abertura; ?></p>
                    </div>
                  </div>
                  <div class="col-md-4 mb-3 px-4">
                    <?php if ($tarefas_status == 4) { ?>
                      <div class="row py-1">
                        <span class="badge badge-light mx-1">
                          <i class="far fa-clock text-info mr-1"></i> Fechamento: <?php echo date('d/m/Y H:i', strtotime($tarefas_fechamento)); ?>
                        </span>
                      </div>
                      <div class="row py-1">
                        <p>Descrição de fechamento: <?php echo $tarefas_desc_fechamento; ?></p>
                      </div>
                    <?php } else { ?>
                      <div class="row py-1">
                        <span class="badge badge-light mx-1">
                          <?php if ($tarefas_status == 1) { ?>
                            <i class="fas fa-hourglass-half"></i> Aguardando Execução
                          <?php } ?>
                          <?php if ($tarefas_status == 2) { ?>
                            <i class="fas fa-magic"></i> Em Execução
                          <?php } ?>
                          <?php if ($tarefas_status == 3) { ?>
                            <i class="far fa-pause-circle"></i> Em Espera
                          <?php } ?>
                        </span>
                      </div>
                    <?php } ?>
                  </div>
                </div>
              </div>
            </section>
          <?php } ?>
        </div>
      </div>
    </div>

  </div>

  <!-- MODAL DE AJUDA PARA A GESTÃO DE UM ATENDIMENTO -->
  <div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
      <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Ajuda com relatórios</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>

        <div class="modal-body">
          <p><strong>Relatório de Tarefas por Cliente e Tecnico:</strong></p>
          <p>Este relatório apresenta uma análise detalhada das tarefas realizadas para um cliente específico em um determinado período. Ele é útil para acompanhar a eficiência das equipes e a satisfação dos clientes.</p>

          <p><strong>Filtros Disponíveis:</strong></p>
          <ul class="list">
            <li><strong>Cliente:</strong> Permite selecionar um cliente específico ou todos os clientes para visualizar as tarefas associadas.</li>
            <li><strong>DevOps:</strong> Permite selecionar um técnico específico ou todos os tecnicos envolvidos nas tarefas.</li>
            <li><strong>Período:</strong> Permite definir um intervalo de datas para a visualização das tarefas, de uma data inicial a uma data final.</li>
          </ul>

          <p><strong>Exemplo de Uso:</strong></p>
          <p>Suponha que você deseja verificar todas as tarefas realizadas pelo técnico João para o cliente ABC Ltda. no mês de julho de 2024. Você pode selecionar "ABC Ltda." no filtro de Cliente, "João" no filtro de DevOps, e definir o período de 01/07/2024 a 31/07/2024 nos campos de data. O relatório mostrará todas as tarefas que atendem a esses critérios.</p>

          <p><strong>Status das Tarefas Consideradas no Relatório:</strong></p>
          <ul class="list">
            <li><i class="fas fa-hourglass-half text-warning"></i> <strong>Aguardando Execução:</strong> Tarefas que foram registradas, mas ainda não foram iniciadas.</li>
            <li><i class="fas fa-magic text-primary"></i> <strong>Em Execução:</strong> Tarefas que estão atualmente em andamento.</li>
            <li class="pt-1"><i class="far fa-pause-circle text-secondary"></i> <strong>Em Espera:</strong> Tarefas que foram iniciadas, mas estão aguardando alguma ação ou recurso.</li>
            <li class="pt-1"><i class="fas fa-check text-success"></i> <strong>Finalizada:</strong> Tarefas que foram concluídas com sucesso.</li>
          </ul>

          <p><strong>Status das Tarefas Não Consideradas no Relatório:</strong></p>
          <ul class="list">
            <li><i class="far fa-clock text-info"></i> <strong>Agendado:</strong> Tarefas que foram programadas para uma data futura, mas ainda não foram iniciadas.</li>
          </ul>

          <p><strong>Informações Adicionais:</strong></p>
          <p>O relatório também permite especificar o local onde o atendimento foi prestado (por exemplo, atendimento remoto ou presencial) e o nível de atendimento (como falha, relacionamento, requisição de serviços, etc.). Essas informações ajudam a entender melhor o contexto e a natureza das tarefas realizadas.</p>

          <p><strong>Exemplo de Relatório:</strong></p>
          <p>Se um técnico realizou várias tarefas para diferentes clientes, o relatório pode mostrar informações detalhadas como:</p>
          <ul class="list">
            <li><strong>Cliente:</strong> ABC Ltda.</li>
            <li><strong>Tecnico:</strong> João</li>
            <li><strong>Tarefa:</strong> #00001</li>
            <li><strong>Abertura:</strong> 01/07/2024 10:00</li>
            <li><strong>Fechamento:</strong> 01/07/2024 14:00</li>
            <li><strong>Status:</strong> Finalizada</li>
            <li><strong>Descrição da Abertura:</strong> Problema no sistema de login.</li>
            <li><strong>Descrição do Fechamento:</strong> Problema resolvido com atualização do sistema.</li>
            <li><strong>Tipo:</strong> Falha</li>
            <li><strong>Nível:</strong> 1</li>
          </ul>
        </div>


      </div>
    </div>
  </div>

  <?php include_once("../all/update_pass.php"); ?>
  <script src="../js/bootstrap.min.js"></script>
  <script src="../js/jquery-3.6.0.min.js"></script>
  <script src="../js/bootstrap.bundle.min.js"></script>

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
  <?php if (isset($mensagem)) { ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 5000);
    </script>
  <?php } ?>

  <script>
    function showInfoCard() {
      var totalTarefas = <?php echo $total_tarefas; ?>;
      var totalSla = <?php echo $total_sla; ?>;

      // Criar o elemento do card
      var cardDiv = document.createElement('div');
      cardDiv.className = 'info-card';

      // Conteúdo do card
      cardDiv.innerHTML = `
          <button class="close-btn" onclick="closeCard()">&times;</button>
          <p><strong>Total de Tarefas:</strong> ${totalTarefas}</p>
          <p><strong>Somatório de SLA:</strong> ${totalSla.toFixed(2)} horas</p>
        `;

      // Adicionar o card no contêiner
      var container = document.getElementById('card-container');
      container.innerHTML = ''; // Limpar cards anteriores
      container.appendChild(cardDiv);
    }

    function closeCard() {
      var container = document.getElementById('card-container');
      container.innerHTML = ''; // Remover o card
    }
  </script>

</body>

</html>