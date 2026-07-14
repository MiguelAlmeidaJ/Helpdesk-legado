<?php
  // 1. PÃ³dio do ano: TI (alterado para LIMIT 3)
  $pdo = ConnectionN3();
  $sql_podio_ti = "SELECT u.user_nome AS nome_tecnico, COUNT(a.id) AS total
                 FROM atendimentos a JOIN usuarios u ON a.tecnico = u.user_id
                 WHERE u.user_funcao IN (1, 2, 3, 4, 5, 6)
                 AND u.user_sts = 1
                 AND (a.status = 4 OR a.status = 5)
                 {$filtro_trimestre_atendimentos}
                 GROUP BY u.user_id, u.user_nome ORDER BY total DESC LIMIT 3";
  $stmt_podio_ti = $pdo->prepare($sql_podio_ti);
  $stmt_podio_ti->execute();
  $podio_ti = $stmt_podio_ti->fetchAll(PDO::FETCH_ASSOC);
