<?php
  // 2. PÃ³dio do ano: DevOps (alterado para LIMIT 3)
  $sql_podio_devops = "SELECT nome_tecnico, COUNT(*) AS total FROM (
                       SELECT u.user_nome AS nome_tecnico 
                       FROM atendimentos a
                       JOIN usuarios u ON a.tecnico = u.user_id
                     --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                     WHERE (u.user_funcao BETWEEN 9 AND 14)
                         AND u.user_sts = 1
                         AND (a.status = 4 OR a.status = 5)
                         {$filtro_trimestre_atendimentos}

                       UNION ALL

                       SELECT u.user_nome AS nome_tecnico 
                       FROM tarefas t
                       JOIN usuarios u ON t.tecnico = u.user_id
                     --  WHERE (u.user_funcao BETWEEN 12 AND 14 OR u.user_funcao = 9)
                     WHERE (u.user_funcao BETWEEN 9 AND 14)
                         AND u.user_sts = 1
                         AND (t.status = 4 OR t.status = 5)
                         {$filtro_trimestre_tarefas}
                   ) AS dados_combinados
                   GROUP BY nome_tecnico 
                   ORDER BY total DESC 
                   LIMIT 3";
  $stmt_podio_devops = $pdo->prepare($sql_podio_devops);
  $stmt_podio_devops->execute();
  $podio_devops = $stmt_podio_devops->fetchAll(PDO::FETCH_ASSOC);
