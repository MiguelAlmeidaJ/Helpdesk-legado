<?php

function n3_tarefa3_get_botoes_visiveis(
  int $tarefa_status,
  int $tecnico_id,
  int $user_id,
  array $perms = [],
  bool $usuario_parceiro = false
): array {
  $botoes = [
    'interacao' => true,
    'aceitar' => false,
    'devolver' => false,
    'espera' => false,
    'finalizar' => false,
    'retomar' => false,
  ];

  if ($usuario_parceiro) {
    return $botoes;
  }

  $m8_01 = (int)($perms['m8_01'] ?? 0);
  $m8_02 = (int)($perms['m8_02'] ?? 0);
  $m8_03 = (int)($perms['m8_03'] ?? 0);
  $m8_04 = (int)($perms['m8_04'] ?? 0);
  $m8_05 = (int)($perms['m8_05'] ?? 0);

  $usuarioPodeEditar = $m8_01 >= 3;
  $usuarioPodeExecutar = $m8_02 >= 2;
  $usuarioPodeEsperar = $m8_03 >= 2;
  $usuarioPodeRecusar = $m8_04 >= 2;
  $usuarioPodeGerenciarTerceiros = $m8_05 >= 2;

  $usuarioEhTecnico = $tecnico_id === $user_id;

  // Sem técnico definido: pode aceitar/iniciar
  if ($tecnico_id === 0) {
    $botoes['aceitar'] = true;
  }

  // Aguardando execução e usuário é o técnico responsável
  if ($tarefa_status === 1 && $usuarioEhTecnico) {
    $botoes['aceitar'] = true;
  }

  // Em espera e usuário é o técnico responsável
  if ($tarefa_status === 3 && $usuarioEhTecnico) {
    $botoes['retomar'] = true;
    $botoes['finalizar'] = false;
  }

  // Em execução e usuário é o técnico responsável
  if ($tarefa_status === 2 && $usuarioEhTecnico && $usuarioPodeExecutar) {
    $botoes['devolver'] = true;
    $botoes['espera'] = true;
    $botoes['finalizar'] = true;
  }

  // Usuário editor pode aceitar/iniciar
  if ($usuarioPodeEditar) {
    $botoes['aceitar'] = true;
  }

  // Regra de espera
  if (!$usuarioPodeEsperar) {
    $botoes['espera'] = false;
  }

  // Regra de recusa/devolução
  if (!$usuarioPodeRecusar && !$usuarioPodeGerenciarTerceiros && !$usuarioEhTecnico) {
    $botoes['devolver'] = false;
  }

  // Gerência de terceiros
  if ($usuarioPodeGerenciarTerceiros) {
    if ($tarefa_status === 3) {
      $botoes['retomar'] = true;
    }

    if ($tarefa_status === 2) {
      $botoes['espera'] = true;
    }

    if ($tarefa_status > 0 && $tarefa_status < 4) {
      $botoes['devolver'] = true;
    }

    if ($tarefa_status > 1 && $tarefa_status < 4) {
      $botoes['finalizar'] = true;
    }
  }

  // Segurança final: tarefa finalizada não mostra ações operacionais
  if ($tarefa_status === 4) {
    $botoes['aceitar'] = false;
    $botoes['devolver'] = false;
    $botoes['espera'] = false;
    $botoes['finalizar'] = false;
    $botoes['retomar'] = false;
  }

  return $botoes;
}