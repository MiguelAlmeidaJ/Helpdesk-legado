          <!-- Coluna de barras 2 Devops-->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100" style="overflow-y: auto; height: 500px;">
              <?php
              // Consulta separada para atendimentos
              $sql_atendimentos = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                     FROM atendimentos a
                     JOIN usuarios u ON a.tecnico = u.user_id
                    --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                     WHERE (u.user_funcao BETWEEN 9 AND 14)

                       AND u.user_sts = 1
                       AND (a.status = 4 OR a.status = 5)
                       {$filtro_data_sql_atendimentos}
                     GROUP BY u.user_id, u.user_nome";


              // Consulta separada para tarefas
              $sql_tarefas = "SELECT u.user_nome AS nome_tecnico, COUNT(t.id) AS total
                FROM tarefas t
                JOIN usuarios u ON t.tecnico = u.user_id
                --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                WHERE (u.user_funcao BETWEEN 9 AND 14)
                  AND u.user_sts = 1
                  AND (t.status = 4 OR t.status = 5)
                  {$filtro_data_sql_tarefas}
                GROUP BY u.user_id, u.user_nome";

              $stmt_atendimentos = $pdo->prepare($sql_atendimentos);
              $stmt_atendimentos->execute();
              $atendimentos_list = $stmt_atendimentos->fetchAll(PDO::FETCH_ASSOC);

              $stmt_tarefas = $pdo->prepare($sql_tarefas);
              $stmt_tarefas->execute();
              $tarefas_list = $stmt_tarefas->fetchAll(PDO::FETCH_ASSOC);

              // Combinar dados mantendo a separaÃ§Ã£o por cores
              $resultados_2 = [];

              foreach ($atendimentos_list as $atd) {
                $nome = $atd['nome_tecnico'];
                if (!isset($resultados_2[$nome])) {
                  $resultados_2[$nome] = ['total' => 0, 'atendimentos' => 0, 'tarefas' => 0];
                }
                $resultados_2[$nome]['atendimentos'] = $atd['total'];
                $resultados_2[$nome]['total'] += $atd['total'];
              }

              foreach ($tarefas_list as $trf) {
                $nome = $trf['nome_tecnico'];
                if (!isset($resultados_2[$nome])) {
                  $resultados_2[$nome] = ['total' => 0, 'atendimentos' => 0, 'tarefas' => 0];
                }
                $resultados_2[$nome]['tarefas'] = $trf['total'];
                $resultados_2[$nome]['total'] += $trf['total'];
              }

              // Ordenar por total
              uasort($resultados_2, function ($a, $b) {
                return $b['total'] <=> $a['total'];
              });

              $max_valor_2 = !empty($resultados_2) ? max(array_column($resultados_2, 'total')) : 0;
              $total_geral_devops = array_sum(array_column($resultados_2, 'total'));
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-code text-warning"></i> DevOps</h6>
                <span style="font-size: 0.9em;font-weight: bold;">Total: <?= $total_geral_devops ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($resultados_2)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  $index = 0;
                  foreach ($resultados_2 as $nome_tecnico => $item) {
                    $percentual_total = $max_valor_2 > 0 ? ($item['total'] / $max_valor_2) * 100 : 0;
                    $percentual_atd = $item['total'] > 0 ? ($item['atendimentos'] / $item['total']) * 100 : 0;
                    $percentual_trf = $item['total'] > 0 ? ($item['tarefas'] / $item['total']) * 100 : 0;

                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px;"></i>' : '';

                    $largura_atd = ($percentual_total * $percentual_atd) / 100;
                    $largura_trf = ($percentual_total * $percentual_trf) / 100;

                    echo '<div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                            <span>' . $coroa . htmlspecialchars($nome_tecnico) . '</span>
                                            <span style="font-size: 1.1em;">' . $item['total'] . '</span>
                                        </div>
                                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px; display: flex; align-items: center;">';

                    if ($item['atendimentos'] > 0) {
                      echo '<div title="Atendimentos: ' . $item['atendimentos'] . '" style="height: 100%; width: ' . $largura_atd . '%; background-color: #c23a1bff; display: flex; align-items: center; justify-content: center; color: #ffffffff; font-weight: bold; font-size: 0.75em;">' . $item['atendimentos'] . '</div>';
                    }
                    if ($item['tarefas'] > 0) {
                      echo '<div title="Tarefas: ' . $item['tarefas'] . '" style="height: 100%; width: ' . $largura_trf . '%; background-color: #f5981e; display: flex; align-items: center; justify-content: center; color: #ffffffff; font-weight: bold; font-size: 0.75em;">' . $item['tarefas'] . '</div>';
                    }
                    echo '</div>
                                      </div>';
                    $index++;
                  }
                }
                ?>
              </div>
            </div>
          </div>
