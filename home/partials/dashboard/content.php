<body class="home-dashboard">
  <?php include_once($projectRoot . "/all/loading_home.php"); ?>
  <?php include_once($projectRoot . "/all/sidebar.php"); ?>

  <?php
  require __DIR__ . '/rankings/data/period.php';
  require __DIR__ . '/rankings/data/ti-quarterly.php';
  require __DIR__ . '/rankings/data/devops-quarterly.php';
  require __DIR__ . '/rankings/data/mkt-quarterly.php';
  require __DIR__ . '/rankings/data/qa-quarterly.php';
  ?>

  <?php if (isset($_SESSION['tipo']) && $_SESSION['tipo'] == 1) : ?>
    <div class="card shadow">
      <div class="card-header py-2 " style="background: #FFF;">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">RANKING
          </h5>
          <form class="ranking-period-form" method="get" id="rankingPeriodForm">
            <input type="hidden" id="data_inicio" name="data_inicio" value="<?= $periodo_inicio_valor ?>">
            <input type="hidden" id="data_fim" name="data_fim" value="<?= $periodo_fim_valor ?>">
            <button type="button" class="ranking-range-toggle" id="rankingRangeToggle" aria-expanded="false" aria-controls="rankingRangePicker">
              <i class="far fa-calendar-alt"></i>
              <span id="rankingRangeLabel"><?= htmlspecialchars($periodo_label, ENT_QUOTES, 'UTF-8') ?></span>
            </button>
            <div class="ranking-range-picker" id="rankingRangePicker">
              <div class="ranking-calendar-header">
                <button type="button" class="ranking-calendar-nav" id="rankingCalendarPrev" aria-label="Mes anterior">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <div class="ranking-calendar-title">
                  <span id="rankingCalendarMonth"></span>
                  <span id="rankingCalendarYear"></span>
                </div>
                <button type="button" class="ranking-calendar-nav" id="rankingCalendarNext" aria-label="Proximo mes">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
              <div class="ranking-calendar-weekdays">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sab</span>
              </div>
              <div class="ranking-calendar-grid" id="rankingCalendarGrid"></div>
              <div class="ranking-range-actions">
                <span class="ranking-range-hint" id="rankingRangeHint">Selecione o periodo</span>
                <a href="home.php" class="btn btn-outline-secondary btn-sm">Mes atual</a>
                <button type="submit" class="btn btn-secondary btn-sm" id="rankingRangeApply">Aplicar</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="card-body bg-light;">
        <div class="row monthly-ranking-row">
          <?php
          require __DIR__ . '/rankings/views/monthly/ti.php';
          require __DIR__ . '/rankings/views/monthly/devops.php';
          require __DIR__ . '/rankings/views/monthly/mkt.php';
          require __DIR__ . '/rankings/views/monthly/qa.php';
          ?>
        </div>
        <!-- </div> -->

        <hr class="my-1">
        <div class="annual-ranking-intro">
          <h6><i class="fas fa-trophy"></i> Ranking trimestral <?= $ranking_trimestral_titulo ?></h6>
        </div>
        <div class="row annual-ranking-grid mt-1 mb-0">
          <?php
          require __DIR__ . '/rankings/views/quarterly/ti.php';
          require __DIR__ . '/rankings/views/quarterly/devops.php';
          require __DIR__ . '/rankings/views/quarterly/mkt.php';
          require __DIR__ . '/rankings/views/quarterly/qa.php';
          ?>
        </div>
        </div>
      </div>
  <?php endif; ?>

  <?php if (isset($mensagem)) { ?>
    <div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
      <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
        <?php echo $mensagem; ?>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  <?php } ?>