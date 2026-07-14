          <div class="col-lg-3 col-md-6 col-sm-12 mb-0">
            <?php
            if (!empty($podio_mkt)) :
              $primeiro_mkt = $podio_mkt[0] ?? null;
              $segundo_mkt  = $podio_mkt[1] ?? null;
              $terceiro_mkt = $podio_mkt[2] ?? null;
            ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>MKT</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-card-body">
                  <?php if ($primeiro_mkt) : ?>
                    <div class="annual-first">
                      <span class="annual-medal">&#129351;</span>
                      <div>
                        <p class="annual-name"><?= htmlspecialchars($primeiro_mkt['nome_tecnico']) ?></p>
                        <p class="annual-total"><?= $primeiro_mkt['artes_feitas'] ?> tarefa</p>
                      </div>
                    </div>
                  <?php endif; ?>
                  <div class="annual-runners">
                    <?php if ($segundo_mkt) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129352;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($segundo_mkt['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $segundo_mkt['artes_feitas'] ?> tarefa</span>
                        </div>
                      </div>
                    <?php endif; ?>
                    <?php if ($terceiro_mkt) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129353;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($terceiro_mkt['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $terceiro_mkt['artes_feitas'] ?> tarefa</span>
                        </div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            <?php else : ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>MKT</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-empty">Nenhum registro no trimestre.</div>
              </div>
            <?php endif; ?>
          </div>
