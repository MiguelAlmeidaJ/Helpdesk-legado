<?php

/**
 * Este arquivo é incluído por tarefa.php e depende das variáveis já preparadas lá.
 *
 * @var PDO $pdo
 * @var int|string $tarefa
 * @var string $token
 * @var int|string $user_id
 * @var string $agora
 * @var int|string $tarefa_tipo
 * @var int|string $tarefa_cat
 * @var int|string $tarefa_scat
 * @var int|string $tarefa_nivel
 * @var int|string $tarefa_item
 * @var int|string $tarefa_forma
 * @var string $tarefa_desc_abertura
 * @var bool $exibe_bt_tarefa_aceitar
 * @var bool $exibe_bt_tarefa_retomar
 * @var bool $exibe_bt_tarefa_espera
 * @var bool $exibe_bt_tarefa_devolver
 * @var bool $exibe_bt_tarefa_finalizar
 */

$tarefa = (int)($tarefa ?? 0);
$token = $token ?? '';
$user_id = (int)($user_id ?? ($_SESSION['allterusN3Id'] ?? 0));
$agora = $agora ?? date('Y-m-d H:i:s');

$tarefa_tipo = (int)($tarefa_tipo ?? 0);
$tarefa_cat = (int)($tarefa_cat ?? 0);
$tarefa_scat = (int)($tarefa_scat ?? 0);
$tarefa_nivel = (int)($tarefa_nivel ?? 0);
$tarefa_item = (int)($tarefa_item ?? 0);
$tarefa_forma = (int)($tarefa_forma ?? 0);
$tarefa_desc_abertura = $tarefa_desc_abertura ?? '';

$exibe_bt_tarefa_aceitar = $exibe_bt_tarefa_aceitar ?? false;
$exibe_bt_tarefa_retomar = $exibe_bt_tarefa_retomar ?? false;
$exibe_bt_tarefa_espera = $exibe_bt_tarefa_espera ?? false;
$exibe_bt_tarefa_devolver = $exibe_bt_tarefa_devolver ?? false;
$exibe_bt_tarefa_finalizar = $exibe_bt_tarefa_finalizar ?? false;
?>

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
                <?php
                $pdo = ConnectionN3();
                $show_tipo = $pdo->prepare("
                      SELECT id, nome
                      FROM tipos_terc_andar
                      WHERE ativo = 1
                      ORDER BY ordem ASC, nome ASC
                    ");
                $show_tipo->execute();

                while ($exibe = $show_tipo->fetch(PDO::FETCH_ASSOC)) {
                ?>
                  <option value="<?php echo (int)$exibe['id']; ?>">
                    <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                  </option>
                <?php } ?>
              </select>
            </div>

            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Categoria:</label>
              <select name="categoria" id="categoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required">
                <option></option>
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
                  <option value="<?php echo (int)$exibe['id']; ?>" <?php echo ((int)$exibe['id'] === (int)$tarefa_cat) ? 'selected' : ''; ?>>
                    <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                  </option>
                <?php } ?>
              </select>
            </div>

            <div class="form-group col-sm-6 col-md-4">
              <label class="my-0 small">Subcategoria:</label>
              <select name="subcategoria" id="subcategoria" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required">
                <option></option>
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
                  <option value="<?php echo (int)$exibe['id']; ?>" <?php echo ((int)$exibe['id'] === (int)$tarefa_scat) ? 'selected' : ''; ?>>
                    <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                  </option>
                <?php } ?>
              </select>
            </div>

            <div class="form-group col-sm-6 col-md-5">
              <label class="my-0 small">Nivel:</label>
              <select name="nivel" id="nivel" class="form-control form-control-sm selectpicker" data-live-search="true" data-container="body" data-width="100%" required="required">
                <option></option>
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
                  <option value="<?php echo (int)$exibe['id']; ?>" <?php echo ((int)$exibe['id'] === (int)$tarefa_nivel) ? 'selected' : ''; ?>>
                    <?php echo htmlspecialchars($exibe['nome'], ENT_QUOTES, 'UTF-8'); ?>
                  </option>
                <?php } ?>
              </select>
            </div>

            <div class="form-group col-sm-6 col-md-7">
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

            <div class="form-group col-sm-6 col-md-12">
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
              <div class="form-group col-sm-12 col-md-12">
                <label class="my-0 small">Técnico Responsável:</label>
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