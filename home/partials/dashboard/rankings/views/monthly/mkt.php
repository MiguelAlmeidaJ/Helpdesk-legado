          <!-- Coluna de barras 3 Marketing-->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100 " style="overflow-y: auto; height: 500px;">
              <?php
              $pdo = $pdo ?? ConnectionN3();
              $sql_mkt_tarefas = "SELECT u.user_nome AS nome_tecnico, COUNT(t.id) AS total
                FROM tarefas_terc_andar t
                JOIN usuarios u ON t.tecnico = u.user_id
                WHERE u.user_sts = 1
                  AND (t.status = 4 OR t.status = 5)
                  {$filtro_data_sql_tarefas}
                GROUP BY u.user_id, u.user_nome
                ORDER BY total DESC";

              $stmt_mkt = $pdo->prepare($sql_mkt_tarefas);
              $stmt_mkt->execute();
              $dados_mkt = $stmt_mkt->fetchAll(PDO::FETCH_ASSOC);

              foreach ($dados_mkt as &$dado) {
                $dado['artes_feitas'] = $dado['total'];
              }
              unset($dado);

              $total_geral_mkt = array_sum(array_column($dados_mkt, 'artes_feitas'));
              $max_valor_mkt = !empty($dados_mkt) ? max(array_column($dados_mkt, 'artes_feitas')) : 0;
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-bullhorn text-success"></i> MKT</h6>
                <span style="font-size: 0.9em;font-weight: bold;"> Total: <?= $total_geral_mkt ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($dados_mkt)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no periodo.</p>';
                } else {
                  foreach ($dados_mkt as $index => $item) {
                    $percentual = $max_valor_mkt > 0 ? ($item['artes_feitas'] / $max_valor_mkt) * 100 : 0;
                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px; "></i>' : '';
                    echo '<div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                            <span>' . $coroa . htmlspecialchars($item['nome_tecnico']) . '</span>
                                            <span style="font-size: 1.1em;">' . $item['artes_feitas'] . '</span>
                                        </div>
                                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px;">
                                            <div style="height: 100%; width: ' . $percentual . '%; background-color: #109618;"></div>
                                        </div>
                                      </div>';
                  }
                }
                ?>
              </div>
            </div>
          </div>