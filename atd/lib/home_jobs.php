<?php

function atd_home_activate_due_scheduled($pdo)
{
  $now = date('Y-m-d H:i:s');
  $stmt = $pdo->prepare("SELECT id FROM atendimentos WHERE `status` = 0 AND abertura <= :agora");
  $stmt->execute([':agora' => $now]);
  $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

  if (empty($ids)) {
    return 0;
  }

  $updated = 0;
  $upd = $pdo->prepare("UPDATE atendimentos SET `status` = 1 WHERE id = :id AND `status` = 0 AND abertura <= :agora");
  $ins = $pdo->prepare("INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) VALUES (1, :atd, 1, :data, :descricao)");

  foreach ($ids as $id) {
    $upd->execute([':id' => (int)$id, ':agora' => $now]);
    if ($upd->rowCount() > 0) {
      $ins->execute([
        ':atd' => (int)$id,
        ':data' => $now,
        ':descricao' => 'Status do atendimento alterado automaticamente para Aguardando Execucao.',
      ]);
      $updated++;
    }
  }

  return $updated;
}

function atd_home_resume_due_waiting($pdo)
{
  $now = date('Y-m-d H:i:s');
  $stmt = $pdo->prepare("
    SELECT atendimentos.id, espera_ultima.espera_id
    FROM atendimentos
    INNER JOIN (
      SELECT e.espera_atd, e.espera_id, e.espera_prev
      FROM espera e
      INNER JOIN (
        SELECT espera_atd, MAX(espera_id) AS espera_id
        FROM espera
        GROUP BY espera_atd
      ) ult ON ult.espera_atd = e.espera_atd AND ult.espera_id = e.espera_id
    ) espera_ultima ON espera_ultima.espera_atd = atendimentos.id
    WHERE atendimentos.`status` = 3
      AND espera_ultima.espera_prev IS NOT NULL
      AND espera_ultima.espera_prev <= :agora
  ");
  $stmt->execute([':agora' => $now]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if (empty($rows)) {
    return 0;
  }

  $updated = 0;
  $updAtd = $pdo->prepare("UPDATE atendimentos SET `status` = 2 WHERE id = :id AND `status` = 3");
  $updEspera = $pdo->prepare("UPDATE espera SET espera_end = :agora WHERE espera_id = :espera_id");
  $ins = $pdo->prepare("INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) VALUES (6, :atd, 1, :data, :descricao)");

  foreach ($rows as $row) {
    $updAtd->execute([':id' => (int)$row['id']]);
    if ($updAtd->rowCount() > 0) {
      $updEspera->execute([':agora' => $now, ':espera_id' => (int)$row['espera_id']]);
      $ins->execute([
        ':atd' => (int)$row['id'],
        ':data' => $now,
        ':descricao' => 'Status do atendimento alterado automaticamente para Em Execucao.',
      ]);
      $updated++;
    }
  }

  return $updated;
}

function atd_home_calculate_next_recurrence($dataRecorrencia, $vezesReabrir, $semana)
{
  if (empty($dataRecorrencia)) {
    return null;
  }

  try {
    $data = new DateTime($dataRecorrencia);
  } catch (Exception $e) {
    error_log('Data de recorrencia invalida: ' . $dataRecorrencia . ' - ' . $e->getMessage());
    return null;
  }

  switch ((int)$vezesReabrir) {
    case 1:
      $data->modify('+1 day');
      return $data->format('Y-m-d H:i:s');
    case 6:
      $data->modify('+1 week');
      return $data->format('Y-m-d H:i:s');
    case 2:
      $data->modify('+1 month');
      return $data->format('Y-m-d H:i:s');
    case 3:
      $data->modify('+3 month');
      return $data->format('Y-m-d H:i:s');
    case 4:
      $data->modify('+6 month');
      return $data->format('Y-m-d H:i:s');
    case 5:
      $data->modify('+12 month');
      return $data->format('Y-m-d H:i:s');
    case 7:
      $weekday = (int)$data->format('w');
      $hora = $data->format('H:i:s');
      $semanaRaw = trim((string)$semana);
      $usarUltimaSemana = ($semanaRaw === '' || $semanaRaw === '0' || strcasecmp($semanaRaw, 'Ultima') === 0);

      if (!$usarUltimaSemana) {
        $semanaNumero = (int)$semanaRaw;
        if ($semanaNumero < 1) {
          $semanaNumero = (int)ceil(((int)$data->format('d')) / 7);
        }
        $semanaNumero = max(1, min(5, $semanaNumero));
      }

      $baseMes = (clone $data)->modify('first day of next month');

      if ($usarUltimaSemana) {
        $proxima = (clone $baseMes)->modify('last day of this month');
        while ((int)$proxima->format('w') !== $weekday) {
          $proxima->modify('-1 day');
        }
      } else {
        $proxima = clone $baseMes;
        while ((int)$proxima->format('w') !== $weekday) {
          $proxima->modify('+1 day');
        }
        if ($semanaNumero > 1) {
          $proxima->modify('+' . ($semanaNumero - 1) . ' week');
        }
        if ($proxima->format('m') !== $baseMes->format('m')) {
          $proxima->modify('-1 week');
        }
      }

      $proxima->setTime((int)substr($hora, 0, 2), (int)substr($hora, 3, 2), (int)substr($hora, 6, 2));
      return $proxima->format('Y-m-d H:i:s');
    default:
      return null;
  }
}

function atd_home_process_recurrences($pdo)
{
  $lockAcquired = false;
  try {
    $lockStmt = $pdo->query("SELECT GET_LOCK('n3ti_atd_recorrencias', 5)");
    $lockAcquired = ((int)$lockStmt->fetchColumn() === 1);
  } catch (Exception $e) {
    error_log('Falha ao obter lock de recorrencia: ' . $e->getMessage());
  }

  if (!$lockAcquired) {
    return 0;
  }

  try {
    return atd_home_process_recurrences_locked($pdo);
  } finally {
    try {
      $pdo->query("SELECT RELEASE_LOCK('n3ti_atd_recorrencias')");
    } catch (Exception $e) {
      error_log('Falha ao liberar lock de recorrencia: ' . $e->getMessage());
    }
  }
}

function atd_home_process_recurrences_locked($pdo)
{
  $now = date('Y-m-d H:i:s');
  $stmt = $pdo->prepare("
    SELECT id, cliente, pessoa, `local`, tipo, categoria, subcategoria, item,
           nivel, prioridade, forma, desc_abertura, data_recorrencia,
           vezes_reabrir, vezes, semana
    FROM atendimentos
    WHERE recorrente = '2'
      AND data_recorrencia IS NOT NULL
      AND vezes > 0
      AND data_recorrencia <= :agora
  ");
  $stmt->execute([':agora' => $now]);

  $created = 0;
  while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $nextDate = atd_home_calculate_next_recurrence($row['data_recorrencia'], $row['vezes_reabrir'], $row['semana']);
    if (empty($nextDate)) {
      error_log('Recorrencia ignorada por regra invalida no atendimento ' . $row['id'] . ' (vezes_reabrir=' . $row['vezes_reabrir'] . ', data=' . $row['data_recorrencia'] . ').');
      continue;
    }

    try {
      $pdo->beginTransaction();

      $upd = $pdo->prepare("
        UPDATE atendimentos
        SET data_recorrencia = :nova_data,
            vezes = vezes - 1
        WHERE id = :id
          AND recorrente = '2'
          AND vezes > 0
          AND data_recorrencia = :data_atual
      ");
      $upd->execute([
        ':nova_data' => $nextDate,
        ':id' => (int)$row['id'],
        ':data_atual' => $row['data_recorrencia'],
      ]);

      if ($upd->rowCount() === 0) {
        $pdo->rollBack();
        continue;
      }

      $insert = $pdo->prepare("
        INSERT INTO atendimentos
        (cliente, pessoa, `local`, tipo, categoria, subcategoria, item,
         nivel, prioridade, forma, desc_abertura, abertura, tecnico,
         reincidente, status, recorrente, data_recorrencia, vezes_reabrir, vezes, semana)
        VALUES
        (:cliente, :pessoa, :local, :tipo, :categoria, :subcategoria, :item,
         :nivel, :prioridade, :forma, :desc_abertura, :abertura, 0,
         0, 0, 2, NULL, 0, 0, :semana)
      ");
      $insert->execute([
        ':cliente' => $row['cliente'],
        ':pessoa' => $row['pessoa'],
        ':local' => $row['local'],
        ':tipo' => $row['tipo'],
        ':categoria' => $row['categoria'],
        ':subcategoria' => $row['subcategoria'],
        ':item' => $row['item'],
        ':nivel' => $row['nivel'],
        ':prioridade' => $row['prioridade'],
        ':forma' => $row['forma'],
        ':desc_abertura' => $row['desc_abertura'],
        ':abertura' => $row['data_recorrencia'],
        ':semana' => $row['semana'],
      ]);

      $newId = $pdo->lastInsertId();
      $inter = $pdo->prepare("INSERT INTO interatividade (inter_tipo, inter_atd, inter_user, inter_data, inter_desc) VALUES (1, :atd, 1, :data, :descricao)");
      $inter->execute([
        ':atd' => $newId,
        ':data' => $row['data_recorrencia'],
        ':descricao' => 'Chamado aberto automaticamente conforme regra de recorrencia.',
      ]);

      $pdo->commit();
      $created++;
    } catch (Exception $e) {
      if ($pdo->inTransaction()) {
        $pdo->rollBack();
      }
      error_log('Erro ao processar recorrencia do atendimento ' . $row['id'] . ': ' . $e->getMessage());
    }
  }

  return $created;
}

function atd_home_should_process_recurrences($intervalSeconds = 60, $force = false)
{
  if ($force || (int)$intervalSeconds <= 0) {
    return true;
  }

  if (!isset($_SESSION) || !is_array($_SESSION)) {
    return true;
  }

  $now = time();
  $lastRun = isset($_SESSION['atd_home_recurrences_last_run']) ? (int)$_SESSION['atd_home_recurrences_last_run'] : 0;
  if ($lastRun > 0 && ($now - $lastRun) < (int)$intervalSeconds) {
    return false;
  }

  $_SESSION['atd_home_recurrences_last_run'] = $now;
  return true;
}

function atd_home_run_jobs($pdo, $options = [])
{
  $recurrenceInterval = isset($options['recurrence_interval']) ? (int)$options['recurrence_interval'] : 0;
  $forceRecurrences = !empty($options['force_recurrences']);

  return [
    'scheduled' => atd_home_activate_due_scheduled($pdo),
    'waiting' => atd_home_resume_due_waiting($pdo),
    'recurrences' => atd_home_should_process_recurrences($recurrenceInterval, $forceRecurrences) ? atd_home_process_recurrences($pdo) : 0,
  ];
}
