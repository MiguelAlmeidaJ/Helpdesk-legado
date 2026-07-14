<?php

function n3_tarefa3_get_tecnico_atual(PDO $pdo, int $tarefa): ?int
{
  if ($tarefa <= 0) {
    return null;
  }

  $stmt = $pdo->prepare("
    SELECT tecnico 
    FROM tarefas_terc_andar 
    WHERE id = :id 
    LIMIT 1
  ");

  $stmt->execute([':id' => $tarefa]);

  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$row) {
    return null;
  }

  return (int)$row['tecnico'];
}

function n3_tarefa3_action_allowed(string $action, int $tarefa, ?int $tecnicoAtual, int $userId, array $perms): bool
{
  $m8_00 = (int)($perms['m8_00'] ?? 0);
  $m8_01 = (int)($perms['m8_01'] ?? 0);
  $m8_04 = (int)($perms['m8_04'] ?? 0);
  $m8_05 = (int)($perms['m8_05'] ?? 0);

  switch ($action) {
    case 'tarefa_adc':
      return $m8_01 >= 2;

    case 'tarefa_edt':
      return ($m8_01 >= 3 || $m8_05 >= 2);

    case 'tarefa_new_inter':
      return $m8_00 >= 1;

    case 'tarefa_aceitar':
    case 'tarefa_retomar':
    case 'tarefa_finalizar':
    case 'tarefa_espera':
    case 'tarefa_recusar':
      return (
        $m8_01 >= 3 ||
        $m8_04 >= 2 ||
        $m8_05 >= 2 ||
        (
          $m8_00 >= 1 &&
          $tecnicoAtual !== null &&
          (int)$tecnicoAtual === (int)$userId
        )
      );

    default:
      return false;
  }
}

function n3_tarefa3_assert_action_permission(PDO $pdo, ?string $action, int $tarefa, int $userId, array $perms): void
{
  if (!$action || $action === 'alterar_senha') {
    return;
  }

  $tecnicoAtual = null;

  if ($tarefa > 0 && $action !== 'tarefa_adc') {
    $tecnicoAtual = n3_tarefa3_get_tecnico_atual($pdo, $tarefa);

    if ($tecnicoAtual === null) {
      n3_forbidden('Tarefa nao encontrada.', 404);
    }
  }

  $allowedAction = n3_tarefa3_action_allowed($action, $tarefa, $tecnicoAtual, $userId, $perms);

  if (!$allowedAction) {
    n3_forbidden('Voce nao tem permissao para executar esta acao na tarefa.');
  }
}