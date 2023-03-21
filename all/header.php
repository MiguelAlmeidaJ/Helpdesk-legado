    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <a class="navbar-brand" href="../home.php">
        <img src="../img/logo_allterus_001.png"  height="30" class="d-inline-block align-top pr-1" alt="">ALLTERUS
      </a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNavDropdown">
        
        <ul class="navbar-nav mr-1">
<?php //verifica as permissões de acesso do usuário
if ($m1_00==1) { ?>
          <li class="nav-item text-left px-1 pt-1">
            <a class="dropdown-item m-0 pt-1" href="../user/home.php"><i class="text-info fas fa-users"></i><small> Usuários</small></a>
          </li>
<?php } ?>
<?php if ($m2_00==1) { ?>
      <li class="dropdown px-1 pt-1">
        <a class="dropdown-item dropdown-toggle m-0 pt-1" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-file-medical"></i><small> Cadastros</small></a>
        <div class="dropdown-menu">
<?php if ($m2_01>0) { ?>
          <a class="dropdown-item" href="../cads/clientes.php"><i class="fas fa-file-medical"></i><small> Clientes</small></a>
          <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m2_04>0) { ?>
          <a class="dropdown-item" href="../cads/categorias.php"><i class="fas fa-tags"></i><small> Categorias</small></a>
          <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m7_00==1) { ?>
  <a class="dropdown-item" href="../cads_cont/centros_custo.php"><i class="fas fa-funnel-dollar"></i><small> Centros de Custo</small></a>
  <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m7_00==1) { ?>
  <a class="dropdown-item" href="../cads_cont/class_contab.php"><i class="fas fa-tags"></i><small> Classificação Contábil</small></a>
  <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m7_00==1) { ?>
  <a class="dropdown-item" href="../cads_cont/ind_reaju.php"><i class="fas fa-donate"></i><small> Índices de reajuste</small></a>
  <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m7_00==1) { ?>
  <a class="dropdown-item" href="../cads_cont/forma_pag.php"><i class="fas fa-comments-dollar"></i><small> Formas de Pagamento</small></a>
  <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m7_00==1) { ?>
  <a class="dropdown-item" href="../cads_cont/tipo_despesa.php"><i class="fas fa-tag"></i><small> Tipo de Despesa</small></a>
  <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m7_00==1) { ?>
  <a class="dropdown-item" href="../cads_cont/tipo_servi.php"><i class="fas fa-tag"></i><small> Tipo de Serviço</small></a>
  <div class="dropdown-divider"></div>
<?php } ?>
<?php if ($m7_00==1) { ?>
  <a class="dropdown-item" href="../cads_cont/tipo_taxas.php"><i class="fas fa-tag"></i><small> Tipo Taxas</small></a>
 
<?php } ?>
        </div>
      </li>
<?php } ?>
<?php  if ($m3_00==1) { ?>
      <li class="dropdown px-1 pt-1">
        <a class="dropdown-item dropdown-toggle m-0 pt-1 text-danger" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-headset text-danger"></i><small> Atendimentos</small></a>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="../atd/home.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Atendimentos</small></a>
          
<?php  if ($m3_01>0) { ?>
          <div class="dropdown-divider"></div>          
          <a class="dropdown-item text-danger" href="../atd/atd.php"><i class="fas fa-plus text-danger"></i><small> Novo Atendimento</small></a>
<?php } ?>
        </div>
      </li>
<?php } ?>
<?php  if ($m5_00==1) { ?>
      <li class="dropdown px-1 pt-1">
        <a class="dropdown-item dropdown-toggle m-0 pt-1 text-danger" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-server text-danger"></i><small> Projetos</small></a>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="../atd_projeto/home.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Projetos</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../atd_projeto/hometarefas.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Tarefas</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../atd_projeto/dash_pro.php"><i class="fas fa-poll-h text-primary"></i><small> Dash Projetos</small></a>
          <div class="dropdown-divider"></div>
<?php  if ($m5_01>0) { ?>
          <div class="dropdown-divider"></div>          
          <a class="dropdown-item text-danger" href="../atd_projeto/projeto.php"><i class="fas fa-plus"></i><small> Novo Projeto</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item text-danger" href="../atd_projeto/tarefa.php"><i class="fas fa-plus text-danger"></i><small> Nova Tarefa</small></a>
<?php } ?>

        </div>
      </li>
<?php } ?>
<?php  if ($m8_00==1) { ?>
      <li class="dropdown px-1 pt-1">
        <a class="dropdown-item dropdown-toggle m-0 pt-1 text-danger" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-server text-danger"></i><small> Marketing</small></a>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="../atd_mkt/home.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Projetos</small></a>
          <!--<div class="dropdown-divider"></div>-->
          <!--<a class="dropdown-item" href="../atd_mkt/hometarefas.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Tarefas</small></a>
          <div class="dropdown-divider"></div>-->
          <!--<a class="dropdown-item" href="../atd_mkt/dash_pro.php"><i class="fas fa-poll-h text-primary"></i><small> Dash Projetos</small></a>
          <div class="dropdown-divider"></div>-->
<?php  if ($m8_01>0) { ?>
          <div class="dropdown-divider"></div>          
          <a class="dropdown-item text-danger" href="../atd_mkt/projeto.php"><i class="fas fa-plus"></i><small> Novo Projeto</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item text-danger" href="../atd_mkt/tarefa.php"><i class="fas fa-plus text-danger"></i><small> Nova Tarefa</small></a>
<?php } ?>

        </div>
      </li>
<?php } ?>
<?php  if ($m6_00==1) { ?>
      <li class="dropdown px-1 pt-1">
        <a class="dropdown-item dropdown-toggle m-0 pt-1 text-danger" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fab fa-medapps"></i><small> Facility</small></a>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="../atd_facility/home.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Facility</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../atd_facility/dash_pro.php"><i class="fas fa-poll-h text-primary"></i><small> Dash Facility</small></a>
          <div class="dropdown-divider"></div>
<?php  if ($m6_01>0) { ?>
          <div class="dropdown-divider"></div>          
          <a class="dropdown-item text-danger" href="../atd_facility/atd.php"><i class="fas fa-plus text-danger"></i><small> Novo Facility</small></a>
          
<?php } ?>

        </div>
      </li>
      
<?php } ?>
<?php  if ($m7_00==1) { ?>    
      <li class="dropdown px-1 pt-1">
        <a class="dropdown-item dropdown-toggle m-0 pt-1 text-danger" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="far fa-file-alt text-danger"></i><small> Contratos</small></a>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="../cont/home.php"><i class="fas fa-list-ul text-primary"></i><small> Lista de Contratos</small></a>
          <div class="dropdown-divider"></div>          
          <a class="dropdown-item text-danger" href="../cont/contrato.php"><i class="far fa-building"></i> <small> <i class="fas fa-plus text-danger"></i> Novo Contrato</small></a>
        </div>
      </li>
<?php } ?>

      <li class="dropdown px-1 pt-1">
        <a class="dropdown-item dropdown-toggle m-0 pt-1 text-info" href="#" data-toggle="dropdown" role="button" aria-expanded="false" aria-haspopup="true" tabindex="-1"><i class="fas fa-clipboard-list text-info"></i><small> Relatórios</small></a>
        <div class="dropdown-menu">
          <a class="dropdown-item" href="../rel/atd_abertos_por_tecnico.php"><i class="fas fa-user-tie text-info"></i><small> Atd abertos por tecnico</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../rel/atd_total_por_cliente.php"><i class="fas fa-headset text-info"></i><small> Atd total Por Cliente</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../rel/atd_total_por_tecnico.php"><i class="fas fa-user-tie text-info"></i><small> Atd total por técnico</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../rel/atd_total_por_categoria.php"><i class="fas fa-tags text-info"></i><small> Atd total por categoria</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../rel/atd_tempo_por_tecnico.php"><i class="far fa-clock text-warning"></i><small> Tempo médio para atendmento</small></a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="../rel/atd_analitico_por_cliente.php"><i class="fas fa-align-justify text-info"></i><small> Atd analítico Por Cliente</small></a>
        </div>
      </li>

<?php if ($m4_00==1) {?>
          <li class="nav-item text-left px-1 pt-1">
            <a class="dropdown-item m-0 pt-1" href="../config/home.php"><i class="fas fa-cogs"></i><small> Cofigurações</small></a>
          </li>
<?php } ?>

        </ul>
        <ul class="navbar-nav ml-auto">
          <li class="nav-item text-left px-1 pt-1">
            <a class="dropdown-item m-0 pt-1 text-danger" href="#" data-toggle="modal" data-target="#Help"><i class="far fa-question-circle"></i><small> Help</small></a>
<!--            <a class="dropdown-item m-0 pt-1" href="#" data-toggle="modal" data-target="#modal-right"><i class="far fa-question-circle"></i><small> Help</small></a>-->
          </li>
          <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" id="navbarDropdownMenuLink" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fas fa-user"></i> </a>
              <div class="dropdown-menu dropdown-menu-right dropdown-unique" aria-labelledby="navbarDropdownMenuLink">
                <a class="dropdown-item disabled" href="#"><i class="text-dark fas fa-address-book"></i> <?php echo $user_nome;?></a>
                <a class="dropdown-item" href="#" data-toggle="modal" data-target="#modalSenha"><i class="fas fa-user-cog"></i> Senha</a>
                <a class="dropdown-item" href="../index.php"><i class="fas fa-sign-out-alt"></i> Sair</a>
              </div>
          </li>
        </ul>
      </div>
    </nav>
    