<?php
  $pdo = $pdo ?? ConnectionN3();
  // 3. Podio do trimestre: MKT
  $sql_podio_mkt = "SELECT u.user_nome AS nome_tecnico, COUNT(t.id) AS artes_feitas
                FROM tarefas_terc_andar t
                JOIN usuarios u ON t.tecnico = u.user_id
                WHERE u.user_sts = 1
                  AND (t.status = 4 OR t.status = 5)
                  {$filtro_trimestre_tarefas}
                GROUP BY u.user_id, u.user_nome
                ORDER BY artes_feitas DESC
                LIMIT 3";
  $stmt_podio_mkt = $pdo->prepare($sql_podio_mkt);
  $stmt_podio_mkt->execute();
  $podio_mkt = $stmt_podio_mkt->fetchAll(PDO::FETCH_ASSOC);