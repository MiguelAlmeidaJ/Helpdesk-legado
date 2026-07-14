          <!-- Coluna de 1 barras TI-->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100" style="overflow-y: auto; height: 500px;">
              <?php
              $pdo = ConnectionN3();
              $sql_prod_1 = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                                   FROM atendimentos a JOIN usuarios u ON a.tecnico = u.user_id
                                   WHERE u.user_funcao IN (1,2, 4, 5, 6)
                                     AND u.user_sts = 1
                                     AND (a.status = 4 OR a.status = 5)
                                     {$filtro_data_sql_atendimentos}
                                   GROUP BY u.user_id, u.user_nome ORDER BY total DESC";

              $stmt_prod_1 = $pdo->prepare($sql_prod_1);
              $stmt_prod_1->execute();
              $resultados_1 = $stmt_prod_1->fetchAll(PDO::FETCH_ASSOC);
              $max_valor_1 = !empty($resultados_1) ? max(array_column($resultados_1, 'total')) : 0;
              $total_geral_ti = array_sum(array_column($resultados_1, 'total'));
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-microchip text-primary"></i> TI</h6>
                <span style="font-size: 0.9em;font-weight: bold;"> Total: <?= $total_geral_ti ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($resultados_1)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  // AlteraÃ§Ã£o aqui para adicionar a coroa
                  foreach ($resultados_1 as $index => $item) {
                    $percentual = $max_valor_1 > 0 ? ($item['total'] / $max_valor_1) * 100 : 0;
                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px;"></i>' : '';
                    echo '<div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                            <span>' . $coroa . htmlspecialchars($item['nome_tecnico']) . '</span>
                                            <span style="font-size: 1.1em;">' . $item['total'] . '</span>
                                        </div>
                                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px;">
                                            <div style="height: 100%; width: ' . $percentual . '%; background-color: #007bff;"></div>
                                        </div>
                                      </div>';
                  }
                }
                ?>
              </div>
            </div>
          </div>
