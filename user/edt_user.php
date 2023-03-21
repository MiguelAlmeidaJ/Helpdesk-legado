<?php
session_start();
include_once("../all/permissoes.php");
if (isset($_POST["user_id"])) {
  include_once("../all/conect.php");
  $id = $_POST["user_id"];

  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT usuarios.* FROM usuarios WHERE usuarios.user_id = '$id'");
  $show->execute();
  $row = $show->fetch(PDO::FETCH_ASSOC);
  $user_nom = $row["user_nome"];
  $user_sts = $row["user_sts"];
  $user_funcao = $row["user_funcao"];
  $user_login = $row["user_login"];
  $user_cel = $row["user_cel"];
  $user_mail = $row["user_mail"];
  $user_sts = $row["user_sts"];
  $user_mod_01 = $row["user_modulo_01"];
  $user_mod_02 = $row["user_modulo_02"];
  $user_mod_03 = $row["user_modulo_03"];
  $user_mod_04 = $row["user_modulo_04"];

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

  //CONFIGURAÇÕES 
  $user_m4_00 = $user_mod_04[0]; //Ver configurações
  $user_m4_01 = $user_mod_04[1]; //Tempo para exibição de alerta no chamado
  $user_m4_02 = $user_mod_04[2]; //SLA de atendimento


  // dd

  if (isset($id)) {

    $clientesSelecionados = $pdo->prepare("SELECT *
    FROM clientes_usuarios cu
    INNER JOIN clientes c ON cu.cliente_id = c.clt_id
    WHERE c.clt_sts = '1'
    AND cu.usuario_id = " . $id);

    $clientesSelecionados->execute();
    $rowClientesSelecionados = $clientesSelecionados->fetchAll(PDO::FETCH_ASSOC);
    $idsClientesSelecionados = array_column($rowClientesSelecionados, 'cliente_id');
    // 

    $filterEmpresas = null;

    $sql =  "SELECT *
    FROM clientes c
    WHERE c.clt_sts = 1";

    if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
      $filterEmpresas.= " AND c.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
    }

    if($filterEmpresas) {
      $sql.= $filterEmpresas;
    }

    $todosClientes = $pdo->prepare(
     $sql
    );  

    $todosClientes->execute();
  }
?>
  <div class="accordion" id="accordionExample">
    <input name="user_id" value="<?php echo $id; ?>" type="hidden">
    <div class="card">
      <div class="card-header pb-1 pt-2" id="headingOne">
        <h5 class="mb-0">
          <button class="btn pt-0 pb-0" type="button" data-toggle="collapse" data-target="#collapse1" aria-expanded="true" aria-controls="collapse1">
            <h6><i class="fas fa-address-card"></i> Informações Cadastrais</h6>
          </button>
        </h5>
      </div>
      <div id="collapse1" class="collapse show" aria-labelledby="heading1" data-parent="#accordionExample">
        <div class="card-body">
          <div class="form-group row">
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
              <span class="form-text text-muted">Nome Completo:</span>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text">
                    <i class="fas fa-address-card"></i>
                  </div>
                </div>
                <input id="nome" name="user_nome" value="<?php echo $user_nom; ?>" type="text" required="" class="form-control">
              </div>
            </div>
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 ">
              <span class="form-text text-muted">Login:</span>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text">
                    <i class="fas fa-user"></i>
                  </div>
                </div>
                <input id="login" name="user_login" value="<?php echo $user_login; ?>" type="text" required="" class="form-control">
              </div>
            </div>
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 ">
              <span class="form-text text-muted">Função:</span>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text">
                    <i class="fas fa-sitemap"></i>
                  </div>
                </div>
                <select name="user_funcao" required="required" class="custom-select">
                  <?php
                  $pdo = ConnectionN3();
                  $show_cargo = $pdo->prepare("SELECT cargos_n3.* FROM cargos_n3 WHERE cargos_n3.cargo_sts = '1' ORDER BY cargos_n3.cargo_nome ASC");
                  $show_cargo->execute();
                  while ($rowc = $show_cargo->fetch(PDO::FETCH_ASSOC)) {
                    $cargo_id = $rowc["cargo_id"];
                    $cargo_nome = $rowc["cargo_nome"];
                  ?>
                    <option value="<?php echo $cargo_id; ?>" <?php if ($user_funcao == $cargo_id) {
                                                                echo " selected";
                                                              } ?>><?php echo $cargo_nome; ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 ">
              <span class="form-text text-muted">Status:</span>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text">
                    <i class="fas fa-info"></i>
                  </div>
                </div>
                <select name="user_sts" required="required" class="custom-select">
                  <option value="1" <?php if ($user_sts == 1) {
                                      echo " selected";
                                    } ?>>Ativo</option>
                  <option value="2" <?php if ($user_sts == 2) {
                                      echo " selected";
                                    } ?>>Inativo</option>
                </select>
              </div>
            </div>
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 ">
              <span class="form-text text-muted">E-mail:</span>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text">
                    <i class="fas fa-at"></i>
                  </div>
                </div>
                <input name="user_mail" value="<?php echo $user_mail; ?>" type="text" required="" class="form-control">
              </div>
            </div>
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 ">
              <span class="form-text text-muted">Celular:</span>
              <div class="input-group">
                <div class="input-group-prepend">
                  <div class="input-group-text">
                    <i class="fas fa-mobile-alt"></i>
                  </div>
                </div>
                <input name="user_cel" value="<?php echo $user_cel; ?>" type="text" required="" class="form-control">
              </div>
            </div>

            <div class="col-12 col-sm-6 col-md-4 col-lg-3 ">
              <span class="form-text text-muted">Empresas:</span>
              <div class="input-group">
                <select required="required" class="companiesEdit" name="companiesEdit[]" multiple="multiple" style="width: 100%">
                  <option></option>
                  <?php
                  while ($rowc = $todosClientes->fetch(PDO::FETCH_ASSOC)) {
                    $client_id = $rowc["clt_id"];
                    $empresa = $rowc["clt_nomer"];
                  ?>
                    <option value="<?php echo $client_id; ?>"><?php echo $empresa; ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>

    <?php if ($m1_04 == 1) { ?>
      <div class="card">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <h5 class="mb-0">
            <button class="btn pt-0 pb-0" type="button" data-toggle="collapse" data-target="#collapse2" aria-expanded="true" aria-controls="collapse2">
              <h6><i class="text-info fas fa-users"></i> Módulo Usuários</h6>
            </button>
          </h5>
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

            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <h5 class="mb-0">
            <button class="btn pt-0 pb-0" type="button" data-toggle="collapse" data-target="#collapse3" aria-expanded="true" aria-controls="collapse3">
              <h6><i class="fas fa-file-medical"></i> Cadastro</h6>
            </button>
          </h5>
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


            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <h5 class="mb-0">
            <button class="btn pt-0 pb-0" type="button" data-toggle="collapse" data-target="#collapse4" aria-expanded="true" aria-controls="collapse4">
              <h6><i class="fas fa-headset text-danger"></i> Atendimentos</h6>
            </button>
          </h5>
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

      <div class="card">
        <div class="card-header pb-1 pt-2" id="headingOne">
          <h5 class="mb-0">
            <button class="btn pt-0 pb-0" type="button" data-toggle="collapse" data-target="#collapse5" aria-expanded="true" aria-controls="collapse5">
              <h6><i class="fas fa-cogs"></i> Configuração</h6>
            </button>
          </h5>
        </div>
        <div id="collapse5" class="collapse" aria-labelledby="heading5" data-parent="#accordionExample">
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

<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

<script>
  $(document).ready(function() {
    $('.companiesEdit').select2();


  const idsClientesSelecionados = <?php echo isset($idsClientesSelecionados) ? json_encode($idsClientesSelecionados) : []; ?> || [];
      $('.companiesEdit').val(idsClientesSelecionados);
      $('.companiesEdit').trigger('change');
  });

  </script>