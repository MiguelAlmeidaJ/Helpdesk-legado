          <div class="col-lg-3 col-md-6 col-sm-12 mb-0">
            <?php
            if (!empty($podio_qa)) :
              $primeiro_qa = $podio_qa[0] ?? null;
              $segundo_qa  = $podio_qa[1] ?? null;
              $terceiro_qa = $podio_qa[2] ?? null;
            ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>QA</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-card-body">
                  <?php if ($primeiro_qa) : ?>
                    <div class="annual-first">
                      <span class="annual-medal">&#129351;</span>
                      <div>
                        <p class="annual-name"><?= htmlspecialchars($primeiro_qa['nome_colaborador']) ?></p>
                        <p class="annual-total"><?= $primeiro_qa['total'] ?> chamados</p>
                      </div>
                    </div>
                  <?php endif; ?>
                  <div class="annual-runners">
                    <?php if ($segundo_qa) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129352;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($segundo_qa['nome_colaborador']) ?></p>
                          <span class="annual-runner-total"><?= $segundo_qa['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                    <?php if ($terceiro_qa) : ?>
                      <div class="annual-runner">
                        <span class="annual-runner-rank">&#129353;</span>
                        <div>
                          <p class="annual-runner-name"><?= htmlspecialchars($terceiro_qa['nome_colaborador']) ?></p>
                          <span class="annual-runner-total"><?= $terceiro_qa['total'] ?> chamados</span>
                        </div>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            <?php else : ?>
              <div class="annual-card">
                <div class="annual-card-header">
                  <h6 class="annual-card-title"><i class="fas fa-trophy"></i>QA</h6>
                  <span class="annual-card-year"><?= $ranking_trimestral_periodo ?></span>
                </div>
                <div class="annual-empty">Nenhum registro no trimestre.</div>
              </div>
            <?php endif; ?>
          </div>
