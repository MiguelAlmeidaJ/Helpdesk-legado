          <div class="col-lg-3 col-md-6 col-sm-12 mb-0">
            <?php
            if (!empty($podio_devops)) :
              $primeiro_devops = $podio_devops[0] ?? null;
              $segundo_devops  = $podio_devops[1] ?? null;
              $terceiro_devops = $podio_devops[2] ?? null;
            ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>DevOps</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-card-body">
                  <?php if ($primeiro_devops) : ?>
                    <div class="annual-first">
                      <span class="annual-medal">&#129351;</span>
                      <div>
                        <p class="annual-name"><?= htmlspecialchars($primeiro_devops['nome_tecnico']) ?></p>
                        <p class="annual-total"><?= $primeiro_devops['total'] ?> chamados</p>
                      </div>
                    </div>
                  <?php endif; ?>
                  <div class="annual-runners">
                    <?php if ($segundo_devops) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129352;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($segundo_devops['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $segundo_devops['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                    <?php if ($terceiro_devops) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129353;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($terceiro_devops['nome_tecnico']) ?></p>
                          <span class="annual-runner-total"><?= $terceiro_devops['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            <?php else : ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>DevOps</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-empty">Nenhum registro no trimestre.</div>
              </div>
            <?php endif; ?>
          </div>
