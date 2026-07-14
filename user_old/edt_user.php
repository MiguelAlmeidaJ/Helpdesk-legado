<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/permissoes.php");
if (isset($_POST["user_id"])) {
  include_once("../all/conect.php");
  $id = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);
  if (!$id) {
    exit;
  }

  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT usuarios.* FROM usuarios WHERE usuarios.user_id = :id");
  $show->bindParam(':id', $id, PDO::PARAM_INT);
  $show->execute();
  $row = $show->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    exit;
  }
  $user_nom = $row["user_nome"];
  $user_sts = $row["user_sts"];
  $user_funcao = $row["user_funcao"];
  $user_login = $row["user_login"];
  $user_cel = $row["user_cel"];
  $user_mail = $row["user_mail"];
  $tipo = $row["tipo_usuario"];
  $link = $row["link"];
  $pix_type = $row["pix_type"];
  $chavepix = $row["chavepix"];
  $user_mod_01 = $row["user_modulo_01"];
  $user_mod_02 = $row["user_modulo_02"];
  $user_mod_03 = $row["user_modulo_03"];
  $user_mod_04 = $row["user_modulo_04"];
  $user_mod_05 = $row["user_modulo_05"];
  $user_mod_06 = $row["user_modulo_06"];
  $user_mod_07 = $row["user_modulo_07"];
  $user_mod_08 = $row["user_modulo_08"];
  $user_mod_09 = $row["user_modulo_09"];

  $modulos = [
    'user_mod_01' => $row["user_modulo_01"],
    'user_mod_02' => $row["user_modulo_02"],
    'user_mod_03' => $row["user_modulo_03"],
    'user_mod_04' => $row["user_modulo_04"],
    'user_mod_05' => $row["user_modulo_05"],
    'user_mod_06' => $row["user_modulo_06"],
    'user_mod_07' => $row["user_modulo_07"],
    'user_mod_08' => $row["user_modulo_08"],
    'user_mod_09' => $row["user_modulo_09"],
  ];

  foreach ($modulos as $key => $value) {
    echo "<input type='hidden' name='{$key}' value='{$value}'>";
  }

  //GESTÃO DE USUÁRIO
  $user_m1_00 = $user_mod_01[0]; //ACESSAR MÓDULO USUÁRIOS (0: Desabilitado; 1:Habilitado)
  $user_m1_01 = $user_mod_01[1]; //VISUALIZAR USUÁRIOS (0: Desabilitado; 1:Habilitado)
  $user_m1_02 = $user_mod_01[2]; //CADASTRRA NOVO USUÁRIO (0: Desabilitado; 1:Habilitado)
  $user_m1_03 = $user_mod_01[3]; //EDITAR INFORMAÇÕES CADASTRAIS (0: Desabilitado; 1:Habilitado)
  $user_m1_04 = $user_mod_01[4]; //EDITAR NIVEL DE ACESSO (0: Desabilitado; 1:Habilitado)

  //CADASTROS
  $user_m2_00 = $user_mod_02[0]; //ACESSAR MÓDULO CADASTROS (0: Desabilitado; 1:Habilitado)
  $user_m2_01 = $user_mod_02[1]; //CADASTRO DE CLIENTES (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
  $user_m2_02 = $user_mod_02[2]; //CADASTRO DE PESSOAS DE CONTATOS DO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
  $user_m2_03 = $user_mod_02[3]; //CADASTRO DE LOCAIS DE ATENDIMENTO AO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
  $user_m2_04 = $user_mod_02[4]; //CADASTRO DE CATEGORIA (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
  $user_m2_05 = $user_mod_02[5]; //CADASTRO DE SUBCATEGORIA (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
  $user_m2_06 = $user_mod_02[6]; //CADASTRO DE ITEM (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)

  //ATENDIMENTOS  
  $user_m3_00 = $user_mod_03[0]; //Ver atendimentos
  $user_m3_01 = $user_mod_03[1]; //Cadastrar atendimento
  $user_m3_02 = $user_mod_03[2]; //Executar atendimento
  $user_m3_03 = $user_mod_03[3]; //Colocar atendimento em espera
  $user_m3_04 = $user_mod_03[4]; //Recusar atendimento
  $user_m3_05 = $user_mod_03[5]; //Gerir atendimento de terceiro
  $user_m3_06 = $user_mod_03[6]; //Acesso a Radio

  //CONFIGURAÇÕES 
  $user_m4_00 = $user_mod_04[0]; //Ver configurações
  $user_m4_01 = $user_mod_04[1]; //Tempo para exibição de alerta no chamado
  $user_m4_02 = $user_mod_04[2]; //SLA de atendimento

  $user_m5_00 = $user_mod_05[0]; //
  $user_m5_01 = $user_mod_05[1]; //
  $user_m5_02 = $user_mod_05[2]; //

  $user_m6_00 = $user_mod_06[0]; //
  $user_m6_01 = $user_mod_06[1]; //
  $user_m6_02 = $user_mod_06[2]; //

  $user_m7_00 = $user_mod_07[0]; //
  $user_m7_01 = $user_mod_07[1]; //
  $user_m7_02 = $user_mod_07[2]; //

  //DISPONIBILIDADE TECNICA
  $user_m8_00 = $user_mod_08[0]; //Ver disponibilidade tecnica (0: Desabilitado; 1:Habilitado)
  $user_m8_01 = $user_mod_08[1]; //Relatório de disponibilidade tecnica (0: Desabilitado; 1:Habilitado relatorio para clientes, 2:Habilitado todos os relatorios da nivel3)
  $user_m8_02 = $user_mod_08[2]; //Relatório de indisponibilidade tecnica (0: Desabilitado; 1:Habilitado relatorio para clientes, 2:Habilitado todos os relatorios da nivel3)
  $user_m8_03 = $user_mod_08[3]; //Relatório de indisponibilidade tecnica (0: Desabilitado; 1:Habilitado relatorio para clientes, 2:Habilitado todos os relatorios da nivel3)
  $user_m8_04 = $user_mod_08[4]; //Ver Catálogos de clientes (0: Desabilitado; 1:Habilitado visualizar catálogos, 2:Habilitado visualizar e editar catálogos)

  //VEICULOS
  $user_m9_00 = $user_mod_09[0]; //VEICULOS - ACESSAR PAINEL DE RDS
  $user_m9_01 = $user_mod_09[1]; //AGENDA DE VEICULOS (0: Desabilitado; 1:leitura; 2:Leitura, cadastro e edição)
  $user_m9_02 = $user_mod_09[2]; // FINANCEIRO
  $user_m9_03 = $user_mod_09[3]; //
  $user_m9_04 = $user_mod_09[4]; //
  $user_m9_05 = $user_mod_09[5]; //


  if (isset($id)) {

    $clientesSelecionados = $pdo->prepare("SELECT *
    FROM clientes_usuarios cu
    INNER JOIN clientes c ON cu.cliente_id = c.clt_id
    WHERE c.clt_sts = '1'
    AND cu.usuario_id = :id");

    $clientesSelecionados->bindParam(':id', $id, PDO::PARAM_INT);
    $clientesSelecionados->execute();
    $rowClientesSelecionados = $clientesSelecionados->fetchAll(PDO::FETCH_ASSOC);
    $idsClientesSelecionados = array_column($rowClientesSelecionados, 'cliente_id');
    // 

    $filterEmpresas = null;

    $sql =  "SELECT *
    FROM clientes c
    WHERE c.clt_sts = 1";

    if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
      $filterEmpresas .= " AND c.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
    }

    if ($filterEmpresas) {
      $sql .= $filterEmpresas;
    }

    $todosClientes = $pdo->prepare(
      $sql
    );

    $todosClientes->execute();
  }
?>
  <div class="accordion edit-user-content" id="accordionExample">
    <input name="user_id" value="<?php echo $id; ?>" type="hidden">

    <div class="card edit-user-section">
      <div class="card-header pb-1 pt-2" id="headingOne">
        <!-- <h5 class="mb-0"> -->
        <button class="btn" type="button" data-toggle="collapse" data-target="#collapse1" aria-expanded="true" aria-controls="collapse1">
          <h6><i class="fas fa-address-card"></i> Informações Cadastrais</h6>
        </button>
        <!-- </h5> -->
      </div>
      <div id="collapse1" class="collapse show" aria-labelledby="headingOne" data-parent="#accordionExample">
        <div class="card-body">
          <div class="form-group row">

            <!-- Nome -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Nome Completo:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-address-card"></i></div>
                </div>
                <input id="nome" name="user_nome" value="<?php echo htmlspecialchars($user_nom); ?>" type="text" required class="form-control form-control-sm">
              </div>
            </div>

            <!-- Login -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Login:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-user"></i></div>
                </div>
                <input id="login" name="user_login" value="<?php echo htmlspecialchars($user_login); ?>" type="text" required class="form-control form-control-sm">
              </div>
            </div>

            <!-- Função -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Função:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                </div>
                <select name="user_funcao" required class="custom-select custom-select-sm">
                  <?php
                  $pdo = ConnectionN3();
                  $show_cargo = $pdo->prepare("SELECT * FROM cargos_n3 WHERE cargo_sts = '1' ORDER BY cargo_nome ASC");
                  $show_cargo->execute();
                  while ($rowc = $show_cargo->fetch(PDO::FETCH_ASSOC)) {
                    $cargo_id = $rowc["cargo_id"];
                    $cargo_nome = $rowc["cargo_nome"];
                  ?>
                    <option value="<?php echo $cargo_id; ?>" <?php if ($user_funcao == $cargo_id) echo "selected"; ?>><?php echo $cargo_nome; ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>

            <!-- Status -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Status:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-info"></i></div>
                </div>
                <select name="user_sts" required class="custom-select custom-select-sm">
                  <option value="1" <?php if ($user_sts == 1) echo "selected"; ?>>Ativo</option>
                  <option value="2" <?php if ($user_sts == 2) echo "selected"; ?>>Inativo</option>
                </select>
              </div>
            </div>

            <!-- E-mail -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">E-mail:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-at"></i></div>
                </div>
                <input name="user_mail" value="<?php echo htmlspecialchars($user_mail); ?>" type="email" required class="form-control form-control-sm">
              </div>
            </div>

            <!-- Celular -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Celular:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                </div>
                <input name="user_cel" value="<?php echo htmlspecialchars($user_cel); ?>" type="text" required class="form-control form-control-sm">
              </div>
            </div>

            <!-- Link -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Link:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-link"></i></div>
                </div>
                <input name="link" value="<?php echo htmlspecialchars($link); ?>" type="text" class="form-control form-control-sm">
              </div>
            </div>

            <!-- Tipo de usuário -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Tipo de usuário:</label>
              <div class="user-type-options">
                <label class="user-type-option" for="admin_edit">
                  <input type="radio" id="admin_edit" name="tipo_usuario" value="1" <?php echo ($tipo == 1) ? 'checked' : ''; ?>>
                  <span><i class="fas fa-id-badge"></i> Colaborador</span>
                </label>

                <label class="user-type-option" for="cliente_edit">
                  <input type="radio" id="cliente_edit" name="tipo_usuario" value="2" <?php echo ($tipo == 2) ? 'checked' : ''; ?>>
                  <span><i class="fas fa-building"></i> Cliente</span>
                </label>
              </div>
            </div>

            <!-- Tipo Pix -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Tipo Pix:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-key"></i></div>
                </div>
                <select name="pix_type" id="pix_type_edit" class="custom-select custom-select-sm">
                  <option value="">Selecione...</option>
                  <?php
                  $stmtTipos = $pdo->query("SELECT id, name_type FROM type_keys ORDER BY id");
                  while ($tipo = $stmtTipos->fetch(PDO::FETCH_ASSOC)) {
                    $selected = ($tipo['id'] == $row['pix_type']) ? "selected" : "";
                    echo "<option value='{$tipo['id']}' $selected>{$tipo['name_type']}</option>";
                  }
                  ?>
                </select>
              </div>
            </div>

            <!-- Chave Pix -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <label class="small mb-1 text-left">Chave Pix:</label>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text"><i class="fas fa-dollar-sign"></i></div>
                </div>
                <input type="text" id="chavepix_edit" name="chavepix" value="<?php echo htmlspecialchars($row['chavepix']); ?>" class="form-control form-control-sm">
              </div>
            </div>

            <!-- Empresas -->
            <div class="col-12 col-sm-6 col-md-4 col-lg-6">
              <label class="small mb-1 text-left">Empresas:</label>
              <div class="input-group">
                <select class="companiesEdit" name="companiesEdit[]" multiple="multiple" style="width: 100%; height: 50px" class="form-control form-control-sm">
                  <?php
                  while ($rowc = $todosClientes->fetch(PDO::FETCH_ASSOC)) {
                    $client_id = $rowc["clt_id"];
                    $empresa = $rowc["clt_nomer"];
                  ?>
                    <option value="<?php echo $client_id; ?>" <?php echo in_array($client_id, $idsClientesSelecionados) ? 'selected' : ''; ?>><?php echo $empresa; ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>



    <!--  Módulo Usuários -->
    <?php if ($m1_04 == 1) { ?>
      <div class="card edit-user-section">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <!-- <h5 class="mb-0"> -->
          <button class="btn" type="button" data-toggle="collapse" data-target="#collapse2" aria-expanded="false" aria-controls="collapse2">
            <h6><i class="text-info fas fa-users"></i> Módulo Usuários</h6>
          </button>
          <!-- </h5> -->
        </div>
        <div id="collapse2" class="collapse" aria-labelledby="heading2" data-parent="#accordionExample">
          <div class="card-body">
            <div class="form-group row">
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Acesso:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m1_00" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m1_00 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m1_00 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Visualização:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m1_01" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m1_01 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m1_01 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Cadastro:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m1_02" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m1_02 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m1_02 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Edição de Cadastro:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m1_03" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m1_03 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado </option>
                    <option value="1" <?php if ($user_m1_03 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Edição de Nível:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m1_04" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m1_04 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado </option>
                    <option value="1" <?php if ($user_m1_04 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>

              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Disponibilidade Técnica:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m8_01" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m8_01 == 0) {
                                        echo "selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m8_01 == 1) {
                                        echo "selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>

              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Relatorios:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m8_00" required="required" class="custom-select">
                    <option value="1" <?php if ($user_m8_00 == 1) {
                                        echo "selected";
                                      } ?>>Habilitado Cliente</option>
                    <option value="2" <?php if ($user_m8_00 == 2) {
                                        echo "selected";
                                      } ?>>Habilitado Nivel3</option>
                  </select>
                </div>
              </div>


              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Patrimônios:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="text-info fas fa-users"></i>
                    </div>
                  </div>
                  <select name="m8_02" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m8_02 == 0) {
                                        echo "selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m8_02 == 1) {
                                        echo "selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      <!-- Cadastro -->
      <div class="card edit-user-section">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <!-- <h5 class="mb-0"> -->
          <button class="btn" type="button" data-toggle="collapse" data-target="#collapse3" aria-expanded="false" aria-controls="collapse3">
            <h6><i class="fas fa-file-medical"></i> Cadastro</h6>
          </button>
          <!-- </h5> -->
        </div>
        <div id="collapse3" class="collapse" aria-labelledby="heading3" data-parent="#accordionExample">
          <div class="card-body">
            <div class="form-group row">
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Acesso:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-user-tie"></i>
                    </div>
                  </div>
                  <select name="m2_00" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m2_00 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m2_00 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Cliente:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-user-tie"></i>
                    </div>
                  </div>
                  <select name="m2_01" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m2_01 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m2_01 == 1) {
                                        echo " selected";
                                      } ?>>Apenas visualizar</option>
                    <option value="2" <?php if ($user_m2_01 == 2) {
                                        echo " selected";
                                      } ?>>Cadastrar</option>
                    <option value="3" <?php if ($user_m2_01 == 3) {
                                        echo " selected";
                                      } ?>>Cadastrar + Editar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Pessoas de contato:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-user-tag"></i>
                    </div>
                  </div>
                  <select name="m2_02" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m2_02 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m2_02 == 1) {
                                        echo " selected";
                                      } ?>>Apenas visualizar</option>
                    <option value="2" <?php if ($user_m2_02 == 2) {
                                        echo " selected";
                                      } ?>>Cadastrar</option>
                    <option value="3" <?php if ($user_m2_02 == 3) {
                                        echo " selected";
                                      } ?>>Cadastrar + Editar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Locais de atendimento:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-map-marked-alt"></i>
                    </div>
                  </div>
                  <select name="m2_03" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m2_03 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m2_03 == 1) {
                                        echo " selected";
                                      } ?>>Apenas visualizar</option>
                    <option value="2" <?php if ($user_m2_03 == 2) {
                                        echo " selected";
                                      } ?>>Cadastrar</option>
                    <option value="3" <?php if ($user_m2_03 == 3) {
                                        echo " selected";
                                      } ?>>Cadastrar + Editar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Categoria:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-tags"></i>
                    </div>
                  </div>
                  <select name="m2_04" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m2_04 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m2_04 == 1) {
                                        echo " selected";
                                      } ?>>Apenas visualizar</option>
                    <option value="2" <?php if ($user_m2_04 == 2) {
                                        echo " selected";
                                      } ?>>Cadastrar</option>
                    <option value="3" <?php if ($user_m2_04 == 3) {
                                        echo " selected";
                                      } ?>>Cadastrar + Editar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">SubCategoria:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-tag"></i>
                    </div>
                  </div>
                  <select name="m2_05" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m2_05 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m2_05 == 1) {
                                        echo " selected";
                                      } ?>>Apenas visualizar</option>
                    <option value="2" <?php if ($user_m2_05 == 2) {
                                        echo " selected";
                                      } ?>>Cadastrar</option>
                    <option value="3" <?php if ($user_m2_05 == 3) {
                                        echo " selected";
                                      } ?>>Cadastrar + Editar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Item:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-tag"></i>
                    </div>
                  </div>
                  <select name="m2_06" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m2_06 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m2_06 == 1) {
                                        echo " selected";
                                      } ?>>Apenas visualizar</option>
                    <option value="2" <?php if ($user_m2_06 == 2) {
                                        echo " selected";
                                      } ?>>Cadastrar</option>
                    <option value="3" <?php if ($user_m2_06 == 3) {
                                        echo " selected";
                                      } ?>>Cadastrar + Editar</option>
                  </select>
                </div>
              </div>

              <!-- Catálogo -->
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Catálogo:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-book"></i>
                    </div>
                  </div>
                  <!-- <select name="m8_04" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m8_04 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m8_04 == 1) {
                                        echo " selected";
                                      } ?>>Apenas visualizar</option>
                    <option value="2" <?php if ($user_m8_04 == 2) {
                                        echo " selected";
                                      } ?>>Visualizar + Editar</option>
                  </select> -->
                  <select name="m8_04" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m8_04 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>

                    <option value="1" <?php if ($user_m8_04 == 1) {
                                        echo " selected";
                                      } ?>>TI - Apenas visualizar</option>

                    <option value="2" <?php if ($user_m8_04 == 2) {
                                        echo " selected";
                                      } ?>>TI - Visualizar + Editar</option>

                    <option value="3" <?php if ($user_m8_04 == 3) {
                                        echo " selected";
                                      } ?>>DevOps - Apenas visualizar</option>

                    <option value="4" <?php if ($user_m8_04 == 4) {
                                        echo " selected";
                                      } ?>>DevOps - Visualizar + Editar</option>

                    <option value="5" <?php if ($user_m8_04 == 5) {
                                        echo " selected";
                                      } ?>>Todos - Apenas visualizar</option>

                    <option value="6" <?php if ($user_m8_04 == 6) {
                                        echo " selected";
                                      } ?>>Todos - Visualizar + Editar</option>
                  </select>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>


      <!-- Atendimentos -->
      <div class="card edit-user-section">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <!-- <h5 class="mb-0"> -->
          <button class="btn" type="button" data-toggle="collapse" data-target="#collapse4" aria-expanded="false" aria-controls="collapse4">
            <h6><i class="fas fa-headset text-danger"></i> Atendimentos</h6>
          </button>
          <!-- </h5> -->
        </div>
        <div id="collapse4" class="collapse" aria-labelledby="heading4" data-parent="#accordionExample">
          <div class="card-body">
            <div class="form-group row">
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Acesso:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-headset"></i>
                    </div>
                  </div>
                  <select name="m3_00" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m3_00 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m3_00 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Cadastrar Atendimento:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-plus"></i>
                    </div>
                  </div>
                  <select name="m3_01" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m3_01 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="2" <?php if ($user_m3_01 == 2) {
                                        echo " selected";
                                      } ?>>Cadastrar</option>
                    <option value="3" <?php if ($user_m3_01 == 3) {
                                        echo " selected";
                                      } ?>>Cadastrar + Editar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Executar atendimento:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-headset"></i>
                    </div>
                  </div>
                  <select name="m3_02" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m3_02 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="2" <?php if ($user_m3_02 == 2) {
                                        echo " selected";
                                      } ?>>Aceitar + Finalizar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Colocar atendimento em espera:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="far fa-pause-circle"></i>
                    </div>
                  </div>
                  <select name="m3_03" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m3_03 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="2" <?php if ($user_m3_03 == 2) {
                                        echo " selected";
                                      } ?>>Permitido</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Recusar atendimento:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="far fa-arrow-alt-circle-up"></i>
                    </div>
                  </div>
                  <select name="m3_04" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m3_04 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="2" <?php if ($user_m3_04 == 2) {
                                        echo " selected";
                                      } ?>>Permitido</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Gerir atendimento de outro técnico:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-headset"></i>
                    </div>
                  </div>
                  <select name="m3_05" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m3_05 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="2" <?php if ($user_m3_05 == 2) {
                                        echo " selected";
                                      } ?>>Permitido</option>
                  </select>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      <!-- Atendimentos DevOps -->
      <div class="card edit-user-section">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <!-- <h5 class="mb-0"> -->
          <button class="btn" type="button" data-toggle="collapse" data-target="#collapse5" aria-expanded="false" aria-controls="collapse5">
            <h6><i class="fas fa-code text-danger"></i> Atendimentos DevOps</h6>
          </button>
          <!-- </h5> -->
        </div>
        <div id="collapse5" class="collapse" aria-labelledby="heading4" data-parent="#accordionExample">
          <div class="card-body">
            <div class="form-group row">
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Acesso a Tarefas:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-key"></i>
                    </div>
                  </div>
                  <select name="m5_00" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m5_00 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m5_00 == 1) {
                                        echo " selected";
                                      } ?>>Visualizar</option>
                    <option value="2" <?php if ($user_m5_00 == 2) {
                                        echo " selected";
                                      } ?>>Visualizar + Cadastrar + Editar</option>
                  </select>
                </div>
              </div>




              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Acessao a Projetos:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-headset"></i>
                    </div>
                  </div>
                  <select name="m5_01" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m5_01 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m5_01 == 1) {
                                        echo " selected";
                                      } ?>>Visualizar</option>
                    <option value="2" <?php if ($user_m5_01 == 2) {
                                        echo " selected";
                                      } ?>>Visualizar + Cadastrar + Editar</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Logistica -->
      <div class="card edit-user-section">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <!-- <h5 class="mb-0"> -->
          <button class="btn" type="button" data-toggle="collapse" data-target="#collapse6" aria-expanded="false" aria-controls="collapse6">
            <h6><i class="fas fa-car"></i> Logística</h6>
          </button>
          <!-- </h5> -->
        </div>
        <div id="collapse6" class="collapse" aria-labelledby="heading4" data-parent="#accordionExample">
          <div class="card-body">
            <div class="form-group row">
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Acesso:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-key"></i>
                    </div>
                  </div>
                  <select name="m9_00" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m9_00 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m9_00 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>

              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted"> Agenda Veiculos:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-calendar-alt"></i>
                    </div>
                  </div>
                  <select name="m9_01" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m9_01 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="1" <?php if ($user_m9_01 == 1) {
                                        echo " selected";
                                      } ?>>Visualizar</option>
                    <option value="2" <?php if ($user_m9_01 == 2) {
                                        echo " selected";
                                      } ?>>Visualizar + Cadastrar + Editar</option>
                  </select>
                </div>
              </div>


              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted"> Acesso a RD:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-calendar-alt"></i>
                    </div>
                  </div>
                  <select name="m9_00" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m9_00 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m9_00 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>

              <?php if ($m9_02 > 0) { ?>
                <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                  <span class="form-text text-muted"> Acesso Painel Financeiro:</span>
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text">
                        <i class="fas fa-calendar-alt"></i>
                      </div>
                    </div>
                    <select name="m9_02" required="required" class="custom-select">
                      <option value="0" <?php if ($user_m9_02 == 0) {
                                          echo " selected";
                                        } ?>>Desabilitado</option>
                      <option value="1" <?php if ($user_m9_02 == 1) {
                                          echo " selected";
                                        } ?>>Contas Pagar/Receber</option>
                      <option value="2" <?php if ($user_m9_02 == 2) {
                                          echo " selected";
                                        } ?>>Gestão Contas + Aprovar</option>
                      <option value="3" <?php if ($user_m9_02 == 3) {
                                          echo " selected";
                                        } ?>>Gestão Contas + Pagar</option>
                    </select>
                  </div>
                </div>

              <?php } ?>

            </div>
          </div>
        </div>
      </div>

      <!-- Configuração -->
      <div class="card edit-user-section">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <!-- <h5 class="mb-0"> -->
          <button class="btn" type="button" data-toggle="collapse" data-target="#collapse7" aria-expanded="false" aria-controls="collapse7">
            <h6><i class="fas fa-cogs"></i> Configuração</h6>
          </button>
          <!-- </h5> -->
        </div>
        <div id="collapse7" class="collapse" aria-labelledby="heading5" data-parent="#accordionExample">
          <div class="card-body">
            <div class="form-group row">
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Acesso:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-cogs"></i>
                    </div>
                  </div>
                  <select name="m4_00" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m4_00 == 0) {
                                        echo " selected";
                                      } ?>>Desabilitado</option>
                    <option value="1" <?php if ($user_m4_00 == 1) {
                                        echo " selected";
                                      } ?>>Habilitado</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">Tempo para alerta:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-stopwatch"></i>
                    </div>
                  </div>
                  <select name="m4_01" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m4_01 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="3" <?php if ($user_m4_01 == 3) {
                                        echo " selected";
                                      } ?>>Editar</option>
                  </select>
                </div>
              </div>
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <span class="form-text text-muted">SLA de atendimento:</span>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text">
                      <i class="fas fa-stopwatch"></i>
                    </div>
                  </div>
                  <select name="m4_02" required="required" class="custom-select">
                    <option value="0" <?php if ($user_m4_02 == 0) {
                                        echo " selected";
                                      } ?>>Sem Acesso</option>
                    <option value="3" <?php if ($user_m4_02 == 3) {
                                        echo " selected";
                                      } ?>>Editar</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

    <?php } ?>

  </div>

<?php } ?>

<!-- <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

<script>
  $(document).ready(function() {
    $('.companiesEdit').select2({
      dropdownParent: $('#modalEdtUser .modal-content'),
      placeholder: 'Selecione as empresas'
    });


    const idsClientesSelecionados = <?php echo isset($idsClientesSelecionados) ? json_encode($idsClientesSelecionados) : []; ?> || [];
    $('.companiesEdit').val(idsClientesSelecionados);
    $('.companiesEdit').trigger('change');
  });
</script> -->

<!-- <script>
$(document).ready(function() {
  $('form').on('submit', function(event) {
    event.preventDefault(); // Impede o envio automático

    // Pega os dados do formulário, incluindo campos ocultos
    var formData = $(this).serializeArray();
    var dataObject = {};

    // Converte os dados para objeto JSON
    $.each(formData, function(_, field) {
      dataObject[field.name] = field.value;
    });

    // Confirma se os módulos estão sendo capturados
    console.log("🔍 Dados prontos para o UPDATE:", JSON.stringify(dataObject, null, 2));

    alert("⚠️ Confira os dados no console (F12) antes de enviar!");

    this.submit(); // Descomente após a validação
  });
});

</script> -->
