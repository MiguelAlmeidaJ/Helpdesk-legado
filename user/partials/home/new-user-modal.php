  <div class="modal fade user-modal" id="new_user" tabindex="-1" role="dialog" aria-labelledby="new_user_title" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <form action="#" method="POST" id="newUserForm">
          <div class="modal-header">
            <div class="user-modal-title">
              <span class="user-modal-icon"><i class="fas fa-user-plus"></i></span>
              <div>
                <h6 class="modal-title" id="new_user_title">Cadastro de usuários</h6>
                <p>Preencha os dados de acesso, perfil e vínculos do novo usuário.</p>
              </div>
            </div>
            <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <ul class="nav nav-tabs user-modal-tabs" role="tablist">
              <li class="nav-item">
                <a class="nav-link active" id="new-user-data-tab" data-toggle="tab" href="#new-user-data" role="tab" aria-controls="new-user-data" aria-selected="true">
                  <i class="fas fa-user"></i> Dados
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" id="new-user-access-tab" data-toggle="tab" href="#new-user-access" role="tab" aria-controls="new-user-access" aria-selected="false">
                  <i class="fas fa-shield-alt"></i> Permissoes
                </a>
              </li>
            </ul>
            <div class="tab-content user-modal-tab-content">
              <div class="tab-pane fade show active" id="new-user-data" role="tabpanel" aria-labelledby="new-user-data-tab">
                <div class="form-row">

              <div class="form-group col-md-12">
                <label class="small mb-1 text-left">Nome:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="far fa-user"></i></div>
                  </div>
                  <input name="user_nome" placeholder="Nome completo" type="text" class="form-control form-control-sm" maxlength="60" autocomplete="name" required>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-left"> E-mail:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-at"></i></div>
                  </div>
                  <input name="user_mail" type="email" class="form-control form-control-sm" maxlength="60" autocomplete="email" required>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left"> Celular:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                  </div>
                  <input name="user_cel" placeholder="(00)00000-0000" type="text" class="form-control form-control-sm" maxlength="20" autocomplete="tel" required>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-right">Login:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-sign-in-alt"></i></div>
                  </div>
                  <input name="user_login" type="text" class="form-control form-control-sm" maxlength="15" autocomplete="username" required>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-right">Senha:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-key"></i></div>
                  </div>
                  <input name="user_pass" type="password" class="form-control form-control-sm" id="passwordInput" minlength="12" maxlength="100" autocomplete="new-password" required>
                </div>
                <div class="password-meter" id="passwordMeter" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div class="password-rules" id="passwordRules">
                  <strong class="password-rules-label">Requisitos: 12 ou mais caracteres contendo</strong>
                  <span data-rule="upper"><i class="fas fa-circle"></i> Maiúscula</span>
                  <span data-rule="lower"><i class="fas fa-circle"></i> Minúscula</span>
                  <span data-rule="number"><i class="fas fa-circle"></i> Número</span>
                  <span data-rule="symbol"><i class="fas fa-circle"></i> Símbolo</span>
                </div>
                <div id="passwordError" class="text-danger mt-2" style="display: none;"></div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Tipo Pix:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-key"></i></div>
                  </div>
                  <select name="pix_type" class="custom-select custom-select-sm">
                    <option value="">Selecione...</option>
                    <?php
                    $pdo = ConnectionN3();
                    $stmtTipos = $pdo->query("SELECT id, name_type FROM type_keys ORDER BY id");
                    while ($tipo = $stmtTipos->fetch(PDO::FETCH_ASSOC)) {
                      echo '<option value="' . e($tipo['id']) . '">' . e($tipo['name_type']) . '</option>';
                    }
                    ?>
                  </select>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Chave Pix:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-dollar-sign"></i></div>
                  </div>
                  <input name="chavepix" placeholder="Chave Pix" type="text" class="form-control form-control-sm" maxlength="120">
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Função:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                  </div>
                  <select name="user_funcao" required="required" class="custom-select custom-select-sm
                  ">
                    <option></option>
                    <?php
                    $pdo = ConnectionN3();
                    $show_cargo = $pdo->prepare("SELECT cargos_n3.* FROM cargos_n3 WHERE cargos_n3.cargo_sts = '1'");
                    $show_cargo->execute();
                    while ($rowc = $show_cargo->fetch(PDO::FETCH_ASSOC)) {
                      $cargo_id = $rowc["cargo_id"];
                      $cargo_nome = $rowc["cargo_nome"];
                    ?>
                      <option value="<?php echo (int)$cargo_id; ?>"><?php echo e($cargo_nome); ?></option>
                    <?php } ?>
                  </select>
                </div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Tipo:</label>
                <div class="user-type-options">
                  <?php
                  $tipoUsuarioSelecionado = isset($userType) ? (int)$userType : 2;
                  ?>
                  <label class="user-type-option" for="admin">
                    <input type="radio" id="admin" name="tipo_usuario" value="1" <?php echo ($tipoUsuarioSelecionado == 1) ? 'checked' : ''; ?> required>
                    <span><i class="fas fa-id-badge"></i> Colaborador</span>
                  </label>
                  <label class="user-type-option" for="cliente">
                    <input type="radio" id="cliente" name="tipo_usuario" value="2" <?php echo ($tipoUsuarioSelecionado == 2) ? 'checked' : ''; ?> required>
                    <span><i class="fas fa-building"></i> Cliente</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-row">

              <div class="form-group col-md-6">
                <label class="small mb-1 text-left">Empresas:</label>
                <select class="companies" id="newUserCompanies" name="companies[]" multiple="multiple" style="width: 100%">
                  <?php
                  $filterEmpresas = null;
                  $pdo = ConnectionN3();
                  $sql = "SELECT clientes.* FROM clientes WHERE clientes.clt_sts = '1'";
                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
                    $filterEmpresas .= " AND clientes.clt_id IN (" . implode(',', array_map('intval', $_SESSION['empresas'])) . ")";
                  }
                  if ($filterEmpresas) {
                    $sql .= $filterEmpresas;
                  }
                  $show_cargo = $pdo->prepare($sql);
                  $show_cargo->execute();
                  while ($rowc = $show_cargo->fetch(PDO::FETCH_ASSOC)) {
                    $client_id = $rowc["clt_id"];
                    $empresa = $rowc["clt_nomer"];
                  ?>
                    <option value="<?php echo (int)$client_id; ?>"><?php echo e($empresa); ?></option>
                  <?php } ?>
                </select>
                <div class="companies-helper" id="companiesHelper">Obrigatório para usuários do tipo Cliente.</div>
              </div>

              <div class="form-group col-md-6">
                <label class="small mb-1 text-right">Link:</label>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <div class="input-group-text"><i class="fas fa-link"></i></div>
                  </div>
                  <input name="link" placeholder="Coloque o link" type="text" class="form-control form-control-sm" maxlength="50">
                </div>
              </div>
            </div>

              </div>
              <div class="tab-pane fade" id="new-user-access" role="tabpanel" aria-labelledby="new-user-access-tab">
                <div class="permission-grid">
                  <?php renderModulePermissions(); ?>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
              <input type="hidden" name="action" value="new_user">
              <input type="hidden" name="token" value="<?php echo e($token); ?>">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar novo usuário</button>
            </div>
        </form>
      </div>
    </div>
  </div>

