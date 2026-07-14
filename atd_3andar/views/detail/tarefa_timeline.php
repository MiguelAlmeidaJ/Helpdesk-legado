<?php
/**
 * View parcial: tarefa_timeline.php
 *
 * @var PDO $pdo
 * @var int $tarefa
 */

$tarefa = (int)($tarefa ?? 0);
$interacoes = n3_tarefa3_fetch_timeline($pdo, $tarefa);
?>

<div class="col-md-3 px-1">
  <div class="card">
    <div class="card-header py-1 h6 pt-2 pb-2">
      <i class="fas fa-list-ol"></i> Histórico da Tarefa #<?php echo str_pad($tarefa, 5, '0', STR_PAD_LEFT); ?>
    </div>

    <div class="card-body">
      <div class="timeline">

        <?php foreach ($interacoes as $interacao) { ?>
          <?php
          $inter_tipo = (int)($interacao["inter_tipo"] ?? 0);
          $inter_data = $interacao["inter_data"] ?? '';
          $inter_desc = $interacao["inter_desc"] ?? '';
          $inter_user = $interacao["user_nome"] ?? '';

          $cores = n3_tarefa3_timeline_colors($inter_tipo);
          $tl_dot_color = $cores['dot'];
          $tl_active_color = $cores['active'];
          ?>

          <div class="tl-item <?php echo $tl_active_color; ?>">
            <div class="tl-dot <?php echo $tl_dot_color; ?>"></div>
            <div class="tl-content">
              <div class="tl-date text-muted">
                <i class="far fa-user"></i>
                <?php echo htmlspecialchars($inter_user, ENT_QUOTES, 'UTF-8'); ?>

                <i class="far fa-clock"></i>
                <?php echo !empty($inter_data) ? date('d/m/y H:i', strtotime($inter_data)) : ''; ?>
              </div>

              <div>
                <?php echo $inter_desc; ?>
              </div>
            </div>
          </div>
        <?php } ?>

        <?php if (empty($interacoes)) { ?>
          <div class="text-muted small">
            Nenhuma interação registrada.
          </div>
        <?php } ?>

      </div>
    </div>
  </div>
</div>