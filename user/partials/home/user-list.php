<body class="user-dashboard">
  <?php include_once("../all/loading.php"); ?>
  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid user-page">
    <div class="row">
      <div class="col-md-12">
        <div class="card user-page-card">
          <div class="card-header p-0">
            <div class="user-card-header">
              <div class="user-title-wrap">
                <span class="user-title-icon"><i class="fas fa-users"></i></span>
                <div>
                  <h1 class="user-page-title">Usuários cadastrados</h1>
                  <p class="user-page-subtitle">Gerencie acessos, perfis e situação dos usuários do sistema.</p>
                </div>
              </div>
              <?php if (($m1_02 ?? 0) == 1) { ?>
                <!-- ? Mantém sintaxe Bootstrap 4 -->
                <button type="button" class="btn btn-outline-primary btn-sm user-add-button" data-toggle="modal" data-target="#new_user">
                  <i class="fas fa-user-plus"></i> Adicionar Usuário
                </button>
              <?php } ?>
            </div>
          </div>

          <?php if (isset($flashMessage['message']) && isset($flashMessage['class'])) { ?>
            <div class="alert <?php echo e($flashMessage['class']); ?> user-flash mb-0 py-2 px-3 pr-5" id="userFlashMessage" role="alert">
              <?php echo renderFlashMessage($flashMessage['message']); ?>
              <button type="button" class="close" aria-label="Fechar" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          <?php } ?>

          <div class="card-body p-0">
            <div class="user-list-toolbar">
              <div class="user-search-wrap">
                <i class="fas fa-search"></i>
                <input type="search" class="form-control form-control-sm" id="userListSearch" placeholder="Filtrar por nome, funcao ou tipo">
              </div>
              <div class="btn-group btn-group-sm user-status-filter" role="group" aria-label="Filtro de situacao dos usuarios">
                <button type="button" class="btn btn-primary active" data-user-filter="active">Ativos</button>
                <button type="button" class="btn btn-outline-secondary mx-2" data-user-filter="all">Todos</button>
                <button type="button" class="btn btn-outline-secondary" data-user-filter="inactive">Inativos</button>
              </div>
            </div>
            <div class="table-container">
              <table class="table table-hover table-sm user-table">
                <thead>
                  <tr>
                    <th>Situação</th>
                    <th>Nome</th>
                    <th>Função</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                  $filterUsuariosEmpresas = "";

                  if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['usuarios']) && count($_SESSION['usuarios']) > 0) {
                    $filterUsuariosEmpresas .= " AND usuarios.user_id IN (" . implode(',', array_map('intval', $_SESSION['usuarios'])) . ")";
                  }

                  $pdo = ConnectionN3();
                  $show_eqp = $pdo->prepare("SELECT usuarios.user_id, usuarios.user_nome, usuarios.user_sts, usuarios.user_funcao, usuarios.tipo_usuario, cargos_n3.cargo_nome
                      FROM usuarios 
                      LEFT JOIN cargos_n3 ON cargos_n3.cargo_id = usuarios.user_funcao
                      WHERE usuarios.user_id > '1' $filterUsuariosEmpresas
                      ORDER BY usuarios.user_sts ASC, usuarios.user_nome ASC");
                  $show_eqp->execute();

                  while ($row = $show_eqp->fetch(PDO::FETCH_ASSOC)) {
                    $usuario_ativo = (int)$row["user_sts"] === 1;
                    $pode_alterar_usuario = (($m1_03 ?? 0) == 1);
                    $pode_desativar_usuario = $pode_alterar_usuario && $usuario_ativo && (string)$row['user_id'] !== (string)$usuario_logado_id;
                  ?>
                    <tr class="<?php echo $usuario_ativo ? '' : 'user-row-inactive'; ?>" data-user-status="<?php echo $usuario_ativo ? 'active' : 'inactive'; ?>">
                      <td>
                        <?php if ($usuario_ativo) { ?>
                          <span class="user-status-badge is-active"><span class="user-status-dot"></span> Ativo</span>
                        <?php } else { ?>
                          <span class="user-status-badge is-inactive"><span class="user-status-dot"></span> Inativo</span>
                        <?php } ?>
                      </td>
                      <td>
                        <div class="user-name-cell"><span class="user-avatar"><i class="fas fa-user"></i></span>
                          <span class="user-name-text"><?php echo e($row["user_nome"]); ?></span>
                        </div>
                      </td>
                      <td><?php echo e($row["cargo_nome"] ?? "-"); ?></td>
                      <td>
                        <span class="user-type-badge"><?php echo $row["tipo_usuario"] == 1 ? "Colaborador" : "Cliente"; ?></span>
                      </td>
                      <td>
                        <div class="user-actions">
                          <?php if ($pode_alterar_usuario) { ?>
                            <button type="button" class="btn btn-sm view_data user-action-btn user-action-edit" id="<?php echo (int)$row['user_id']; ?>">
                              <i class="fas fa-user-edit"></i> Editar
                            </button>
                          <?php } ?>

                          <?php if ($pode_desativar_usuario) { ?>
                            <form method="POST" action="" onsubmit="return confirm('Deseja desativar este usuário?');">
                              <input type="hidden" name="action" value="deactivate_user">
                              <input type="hidden" name="user_id" value="<?php echo (int)$row['user_id']; ?>">
                              <input type="hidden" name="token" value="<?php echo e($token); ?>">
                              <button type="submit" class="btn btn-sm user-action-btn user-action-disable">
                                <i class="fas fa-user-slash"></i> Desativar
                              </button>
                            </form>
                          <?php } elseif ($usuario_ativo && $pode_alterar_usuario && (string)$row['user_id'] === (string)$usuario_logado_id) { ?>
                            <button type="button" class="btn btn-sm user-action-btn user-action-edit" disabled>
                              <i class="fas fa-user-shield"></i> Atual
                            </button>
                          <?php } ?>

                          <?php if (!$pode_alterar_usuario) { ?>
                            <span class="text-muted small">Sem permissão</span>
                          <?php } ?>
                        </div>
                      </td>
                    </tr>
                  <?php } ?>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

