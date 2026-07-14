<?php
/**
 * Este arquivo é incluído por tarefa.php e depende das variáveis já preparadas lá.
 *
 * @var PDO $pdo
 * @var string $token
 * @var string $agora
 * @var int|string $m8_00
 */

$token = $token ?? '';
$agora = $agora ?? date('Y-m-d H:i:s');
$m8_00 = (int)($m8_00 ?? 0);
?>

<div class="container-fluid task-create-page">
      <div class="row justify-content-md-center">
        <div class="col-12">
          <div class="task-create-card">
            <div class="task-create-header">
              <div>
                <h1 class="task-create-title"><i class="fas fa-plus"></i> Cadastro de solicitação de tarefa</h1>
                <p class="task-create-subtitle">Preencha os dados principais para registrar uma nova tarefa.</p>
              </div>
              <i class="fas fa-headset text-danger"></i> Cadastro de solicitação de tarefa
            </div>
            <div class="task-create-body">
              <form action="#" method="POST">
                <div class="task-form-section">
                  <h2 class="task-form-section-title"><i class="fas fa-building"></i> Dados do cliente</h2>
                <div class="form-row">
                  <div class="form-group col-sm-12 col-md-4">
                    <label class="my-0 small">Cliente:</label>
                    <select name="cliente" id="cliente" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" tabindex="1">
                      <option></option>
                      <?php
                      $pdo = ConnectionN3();

                      // Define a consulta SQL base
                      $sql = "SELECT clientes.clt_id, clientes.clt_nomef FROM clientes WHERE clientes.clt_sts = '1' AND clientes.clt_mkt = '1'";

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
                    <label class="my-0 small">Tipo de Atendimento:</label>
                    <select name="tipo" id="tipo" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="5">
                      <option value="">Escolha o tipo</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_cat = $pdo->prepare("
                        SELECT id, nome
                        FROM tipos_terc_andar
                        WHERE ativo = 1
                        ORDER BY ordem ASC, nome ASC
                      ");
                      $show_cat->execute();

                      while ($exibe = $show_cat->fetch(PDO::FETCH_ASSOC)) {
                      ?>
                        <option value="<?php echo (int)$exibe['id']; ?>">
                          <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                      <?php } ?>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Categoria:</label>
                    <select name="categoria" id="categoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="5">
                      <option value="">Escolha a categoria</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_cat = $pdo->prepare("
                        SELECT id, nome
                        FROM categorias_terc_andar
                        WHERE ativo = 1
                        ORDER BY ordem ASC, nome ASC
                      ");
                      $show_cat->execute();

                      while ($exibe = $show_cat->fetch(PDO::FETCH_ASSOC)) {
                      ?>
                        <option value="<?php echo (int)$exibe['id']; ?>">
                          <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                      <?php } ?>
                    </select>
                  </div>

                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Subcategoria:</label>
                    <select name="subcategoria" id="subcategoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="5">
                      <option value="">Escolha a subcategoria</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_cat = $pdo->prepare("
                        SELECT id, nome
                        FROM subcategorias_terc_andar
                        WHERE ativo = 1
                        ORDER BY ordem ASC, nome ASC
                      ");
                      $show_cat->execute();

                      while ($exibe = $show_cat->fetch(PDO::FETCH_ASSOC)) {
                      ?>
                        <option value="<?php echo (int)$exibe['id']; ?>">
                          <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                      <?php } ?>
                    </select>
                  </div>
                  <div class="form-group col-sm-6 col-md-3">
                    <label class="my-0 small">Nivel:</label>
                    <select name="nivel" id="nivel" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required" tabindex="5">
                      <option value="">Escolha o nivel</option>
                      <?php
                      $pdo = ConnectionN3();
                      $show_cat = $pdo->prepare("
                        SELECT id, nome
                        FROM niveis_terc_andar
                        WHERE ativo = 1
                        ORDER BY ordem ASC, nome ASC
                      ");
                      $show_cat->execute();

                      while ($exibe = $show_cat->fetch(PDO::FETCH_ASSOC)) {
                      ?>
                        <option value="<?php echo (int)$exibe['id']; ?>">
                          <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                        </option>
                      <?php } ?>
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
                          $pdo = ConnectionN3();
                          $show_clt = $pdo->prepare("
                            SELECT usuarios.user_id, usuarios.user_nome
                            FROM usuarios
                            WHERE usuarios.user_sts = '1'
                            AND usuarios.user_id > '1'
                            AND CAST(SUBSTRING(COALESCE(usuarios.user_modulo_08, '0000000000'), 1, 1) AS UNSIGNED) >= 1
                            AND CAST(SUBSTRING(COALESCE(usuarios.user_modulo_08, '0000000000'), 3, 1) AS UNSIGNED) >= 2
                            ORDER BY usuarios.user_nome ASC
                          ");
                          $show_clt->execute();
                          while ($exibe = $show_clt->fetch(PDO::FETCH_ASSOC)) {
                            $tecnico_id_option = $exibe["user_id"];
                            $tecnico_nome_option = $exibe["user_nome"];
                          ?>
                            <option value="<?php echo $tecnico_id_option; ?>">
                              <?php echo $tecnico_nome_option; ?>
                            </option>
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