          <!-- Coluna de Barras 4 QA -->
          <div class="col-lg-3 col-md-6 col-sm-12 mb-3">
            <div class="card h-100">
              <?php
              // ConexÃ£o com o banco de dados
              $pdo = ConnectionN3();
              $sql_QA = "SELECT
              CASE
                WHEN u.user_funcao IN (3,7) THEN u.user_nome
                ELSE 'Outros Colaboradores'
              END AS nome_colaborador,
              COUNT(*) AS total
           FROM (
             SELECT inter_user, inter_data FROM interatividade WHERE inter_tipo = 1
             UNION ALL
             SELECT inter_user, inter_data FROM inter_tarefa WHERE inter_tipo = 1
           ) AS interacoes
           JOIN usuarios u ON u.user_id = interacoes.inter_user
           WHERE u.user_sts > 0
             {$filtro_data_sql_QA}
           GROUP BY
             CASE
               WHEN u.user_funcao IN (3,7) THEN u.user_nome
               ELSE 'Outros Colaboradores'
             END
           ORDER BY total DESC";


              $stmt_QA = $pdo->prepare($sql_QA);
              $stmt_QA->execute();
              $resultados_interacao = $stmt_QA->fetchAll(PDO::FETCH_ASSOC);
              $max_valor_criacao = !empty($resultados_interacao) ? max(array_column($resultados_interacao, 'total')) : 0;
              $total_geral_criacao = array_sum(array_column($resultados_interacao, 'total'));
              ?>

              <div class="card-header py-2 d-flex justify-content-between align-items-center">
                <h6><i class="fas fa-info-circle" style="color: #6f42c1;"></i> QA - Abertura de Atd</h6> <span style="font-size: 0.9em; font-weight: bold;"> Total: <?= $total_geral_criacao ?></span>
              </div>

              <div class="card-body atd-list" style="overflow-y: auto; height: 500px;">
                <?php
                if (empty($resultados_interacao)) {
                  echo '<p class="p-2 text-muted">Nenhum dado no período.</p>';
                } else {
                  foreach ($resultados_interacao as $index => $item) {
                    $percentual = $max_valor_criacao > 0 ? ($item['total'] / $max_valor_criacao) * 100 : 0;
                    $coroa = ($index == 0) ? '<i class="fas fa-crown text-warning crown-pulse" style="margin-right: 5px;"></i>' : '';

                    echo '
                    <div class="tecnico-item" style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-weight: bold;">
                            <span>' . $coroa . htmlspecialchars($item['nome_colaborador']) . '</span>
                            <span style="font-size: 1.1em;">' . $item['total'] . '</span>
                        </div>
                        <div style="background-color: #e9ecef; border-radius: 4px; overflow: hidden; height: 12px; margin-top: 4px;">
                            <div style="height: 100%; width: ' . $percentual . '%; background-color: #6f42c1;"></div>
                        </div>
                    </div>';
                  }
                }
                ?>
              </div>
            </div>
          </div>
