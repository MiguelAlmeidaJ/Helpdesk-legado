<?php
  // 4. PÃ³dio do ano: QA
  $sql_podio_qa = "SELECT
                            CASE
                                WHEN u.user_funcao = 7 THEN u.user_nome
                                ELSE 'Outros Colaboradores'
                            END AS nome_colaborador,
                            
                            COUNT(*) AS total
                          FROM (
                            SELECT inter_user, inter_data 
                            FROM interatividade WHERE inter_tipo = 1
                            UNION ALL
                            SELECT inter_user, inter_data 
                            FROM inter_tarefa WHERE inter_tipo = 1
                          ) AS interacoes
                          JOIN usuarios u ON u.user_id = interacoes.inter_user
                          WHERE u.user_sts = 1
                        {$filtro_trimestre_sql_QA}
                      GROUP BY u.user_id, u.user_nome ORDER BY total DESC LIMIT 3";
  $stmt_podio_qa = $pdo->prepare($sql_podio_qa);
  $stmt_podio_qa->execute();
  $podio_qa = $stmt_podio_qa->fetchAll(PDO::FETCH_ASSOC);
