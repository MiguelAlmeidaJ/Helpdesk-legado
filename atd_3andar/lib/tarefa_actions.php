<?php

function n3_tarefa3_action_new_inter(PDO $pdo, int $tarefa, int $user_id, string $agora): array
{
  $inter_desc = htmlspecialchars(filter_input(INPUT_POST, 'inter_desc', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');

  $stmt = $pdo->prepare("
    INSERT INTO inter_terc_andar 
      (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc) 
    VALUES 
      ('7', :tarefa, :user_id, :agora, :inter_desc)
  ");

  $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
  $stmt->bindValue(':agora', $agora);
  $stmt->bindValue(':inter_desc', $inter_desc);

  if ($stmt->execute()) {
    return [
      'mensagem' => '<i class="fas fa-check"></i> Interação cadastrada!',
      'mensagem_cor' => 'alert-success',
    ];
  }

  return [
    'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao cadastrar interação!',
    'mensagem_cor' => 'alert-danger',
  ];
}

function n3_tarefa3_action_retomar(PDO $pdo, int $tarefa, int $user_id, string $agora): array
{
  $stmt = $pdo->prepare("
    UPDATE tarefas_terc_andar
    SET status = '2'
    WHERE id = :tarefa
  ");

  $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);

  if (!$stmt->execute()) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao retomar o atendimento!',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $show_espera = $pdo->prepare("
    SELECT espera_id
    FROM espera_terc_andar
    WHERE espera_tarefa = :tarefa
    ORDER BY espera_id DESC
    LIMIT 1
  ");

  $show_espera->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $show_espera->execute();

  $espera = $show_espera->fetch(PDO::FETCH_ASSOC);
  $espera_id = (int)($espera['espera_id'] ?? 0);

  if ($espera_id > 0) {
    $edt_espera = $pdo->prepare("
      UPDATE espera_terc_andar
      SET espera_end = :agora
      WHERE espera_id = :espera_id
    ");

    $edt_espera->bindValue(':agora', $agora);
    $edt_espera->bindValue(':espera_id', $espera_id, PDO::PARAM_INT);
    $edt_espera->execute();
  }

  $inter = $pdo->prepare("
    INSERT INTO inter_terc_andar
      (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
    VALUES
      ('6', :tarefa, :user_id, :agora, 'Retomou a tarefa.')
  ");

  $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $inter->bindValue(':user_id', $user_id, PDO::PARAM_INT);
  $inter->bindValue(':agora', $agora);

  if ($inter->execute()) {
    return [
      'mensagem' => '<i class="fas fa-check"></i> Beleza! <br> Agora vamos descrever as interações com o cliente!',
      'mensagem_cor' => 'alert-success',
    ];
  }

  return [
    'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao adicionar registro na tabela de interação!',
    'mensagem_cor' => 'alert-danger',
  ];
}

function n3_tarefa3_action_finalizar(PDO $pdo, int $tarefa, int $user_id, string $agora): array
{
  $desc_fechamento = htmlspecialchars(filter_input(INPUT_POST, 'desc_fechamento', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');

  $stmt = $pdo->prepare("
    UPDATE tarefas_terc_andar
    SET 
      desc_fechamento = :desc_fechamento,
      fechamento = :fechamento,
      status = '4'
    WHERE id = :tarefa
  ");

  $stmt->bindValue(':desc_fechamento', $desc_fechamento);
  $stmt->bindValue(':fechamento', $agora);
  $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);

  if (!$stmt->execute()) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao finalizar o atendimento!',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $inter_desc = 'Finalizou o atendimento. <br> Descrição: ' . $desc_fechamento;

  $inter = $pdo->prepare("
    INSERT INTO inter_terc_andar
      (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
    VALUES
      ('8', :tarefa, :user_id, :agora, :inter_desc)
  ");

  $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $inter->bindValue(':user_id', $user_id, PDO::PARAM_INT);
  $inter->bindValue(':agora', $agora);
  $inter->bindValue(':inter_desc', $inter_desc);

  if ($inter->execute()) {
    return [
      'mensagem' => '<i class="fas fa-check"></i> Ótimo! <br> O que mais temos para hoje?!',
      'mensagem_cor' => 'alert-success',
    ];
  }

  return [
    'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa finalizada, mas falhou ao registrar interação!',
    'mensagem_cor' => 'alert-warning',
  ];
}

function n3_tarefa3_action_recusar(PDO $pdo, int $tarefa, int $user_id, string $agora): array
{
  $tecnico = (int) filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
  $inter_desc = htmlspecialchars(filter_input(INPUT_POST, 'inter_desc', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');

  if ($tarefa <= 0) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa inválida.',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  if ($tecnico > 0) {
    $stmt = $pdo->prepare("
      UPDATE tarefas_terc_andar
      SET tecnico = :tecnico, status = '1'
      WHERE id = :tarefa
    ");

    $stmt->bindValue(':tecnico', $tecnico, PDO::PARAM_INT);
    $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
    $updateOk = $stmt->execute();

    if (!$updateOk) {
      return [
        'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao direcionar a tarefa!',
        'mensagem_cor' => 'alert-danger',
      ];
    }

    $show_tec = $pdo->prepare("
      SELECT user_nome
      FROM usuarios
      WHERE user_id = :tecnico
      LIMIT 1
    ");

    $show_tec->bindValue(':tecnico', $tecnico, PDO::PARAM_INT);
    $show_tec->execute();

    $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
    $tecnico_nome = $exibe['user_nome'] ?? 'técnico selecionado';

    $inter_desc_final = "Direcionou a tarefa para $tecnico_nome: <br> $inter_desc";

    $inter = $pdo->prepare("
      INSERT INTO inter_terc_andar
        (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
      VALUES
        ('4', :tarefa, :user_id, :agora, :inter_desc)
    ");

    $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
    $inter->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $inter->bindValue(':agora', $agora);
    $inter->bindValue(':inter_desc', $inter_desc_final);

    if ($inter->execute()) {
      return [
        'mensagem' => '<i class="fas fa-check"></i> OK! <br> Tarefa direcionada para ' . $tecnico_nome . '.',
        'mensagem_cor' => 'alert-warning',
      ];
    }

    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa direcionada, mas falhou ao registrar interação.',
      'mensagem_cor' => 'alert-warning',
    ];
  }

  $stmt = $pdo->prepare("
    UPDATE tarefas_terc_andar
    SET tecnico = '0', status = '1'
    WHERE id = :tarefa
  ");

  $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $updateOk = $stmt->execute();

  if (!$updateOk) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao recusar a tarefa!',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $inter_desc_final = "Recusou a tarefa: <br> $inter_desc";

  $inter = $pdo->prepare("
    INSERT INTO inter_terc_andar
      (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
    VALUES
      ('3', :tarefa, :user_id, :agora, :inter_desc)
  ");

  $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $inter->bindValue(':user_id', $user_id, PDO::PARAM_INT);
  $inter->bindValue(':agora', $agora);
  $inter->bindValue(':inter_desc', $inter_desc_final);

  if ($inter->execute()) {
    return [
      'mensagem' => '<i class="fas fa-check"></i> OK! <br> Tarefa recusada e devolvida para a fila.',
      'mensagem_cor' => 'alert-warning',
    ];
  }

  return [
    'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa recusada, mas falhou ao registrar interação.',
    'mensagem_cor' => 'alert-warning',
  ];
}

function n3_tarefa3_action_espera(PDO $pdo, int $tarefa, int $user_id, string $agora): array
{
  $espera_desc = htmlspecialchars(filter_input(INPUT_POST, 'espera_desc', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
  $espera_prev = htmlspecialchars(filter_input(INPUT_POST, 'espera_prev', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');

  if ($tarefa <= 0) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa inválida.',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  if ($user_id <= 0) {
    n3_forbidden('Sessão inválida. Faça login novamente.');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  $debugAntes = $pdo->prepare("
    SELECT id, tecnico, status
    FROM tarefas_terc_andar
    WHERE id = :tarefa
    LIMIT 1
  ");

  $debugAntes->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $debugAntes->execute();

  $espera_prev_br = '-';

  if (!empty($espera_prev) && strtotime($espera_prev)) {
    $espera_prev_br = date('d/m/Y H:i', strtotime($espera_prev));
  }

  $stmt = $pdo->prepare("
    UPDATE tarefas_terc_andar
    SET status = '3'
    WHERE id = :tarefa
  ");

  $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $updateOk = $stmt->execute();

  if (!$updateOk) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao editar o status da tarefa!',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $insertEspera = $pdo->prepare("
    INSERT INTO espera_terc_andar
      (espera_tarefa, espera_start, espera_prev, espera_desc, espera_user)
    VALUES
      (:tarefa, :agora, :espera_prev, :espera_desc, :user_id)
  ");

  $insertEspera->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $insertEspera->bindValue(':agora', $agora);
  $insertEspera->bindValue(':espera_prev', $espera_prev);
  $insertEspera->bindValue(':espera_desc', $espera_desc);
  $insertEspera->bindValue(':user_id', $user_id, PDO::PARAM_INT);
  $insertEsperaOk = $insertEspera->execute();

  if (!$insertEsperaOk) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao inserir registro na tabela de espera!',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $inter_desc = "Colocou a tarefa Em Espera. <br> Previsão de retorno: $espera_prev_br <br> Descrição: $espera_desc";

  $inter = $pdo->prepare("
    INSERT INTO inter_terc_andar
      (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
    VALUES
      ('5', :tarefa, :user_id, :agora, :inter_desc)
  ");

  $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $inter->bindValue(':user_id', $user_id, PDO::PARAM_INT);
  $inter->bindValue(':agora', $agora);
  $inter->bindValue(':inter_desc', $inter_desc);
  $insertInterOk = $inter->execute();

  $debugDepois = $pdo->prepare("
    SELECT id, tecnico, status
    FROM tarefas_terc_andar
    WHERE id = :tarefa
    LIMIT 1
  ");

  $debugDepois->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $debugDepois->execute();

  if ($insertInterOk) {
    return [
      'mensagem' => '<i class="fas fa-check"></i> OK! <br> A tarefa foi colocada Em Espera.',
      'mensagem_cor' => 'alert-warning',
    ];
  }

  return [
    'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Espera registrada, mas falhou ao registrar interação.',
    'mensagem_cor' => 'alert-warning',
  ];
}

function n3_tarefa3_action_aceitar(PDO $pdo, int $tarefa, int $user_id, string $agora): array
{
  $tecnico = (int) filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);
  $usuario_logado = $user_id;

  if ($usuario_logado <= 0) {
    n3_forbidden('Sessão inválida. Faça login novamente.');
  }

  if ($tarefa <= 0) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa inválida.',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  $debugAntes = $pdo->prepare("
    SELECT id, tecnico, status
    FROM tarefas_terc_andar
    WHERE id = :tarefa
    LIMIT 1
  ");

  $debugAntes->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $debugAntes->execute();

  if ($tecnico <= 0) {
    $tecnico = $usuario_logado;
  }

  if ($tecnico === $usuario_logado) {
    $stmt = $pdo->prepare("
      UPDATE tarefas_terc_andar
      SET tecnico = :tecnico, status = '2'
      WHERE id = :tarefa
    ");

    $stmt->bindValue(':tecnico', $usuario_logado, PDO::PARAM_INT);
    $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
    $updateOk = $stmt->execute();

    if (!$updateOk) {
      return [
        'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao iniciar a tarefa.',
        'mensagem_cor' => 'alert-danger',
      ];
    }

    $inter = $pdo->prepare("
      INSERT INTO inter_terc_andar
        (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
      VALUES
        ('2', :tarefa, :user_id, :agora, 'Iniciou a tarefa.')
    ");

    $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
    $inter->bindValue(':user_id', $usuario_logado, PDO::PARAM_INT);
    $inter->bindValue(':agora', $agora);
    $insertOk = $inter->execute();

    if ($insertOk) {
      return [
        'mensagem' => '<i class="fas fa-check"></i> Ótimo! <br> A tarefa foi iniciada.',
        'mensagem_cor' => 'alert-success',
      ];
    }

    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa iniciada, mas falhou ao registrar interação.',
      'mensagem_cor' => 'alert-warning',
    ];
  }

  $stmt = $pdo->prepare("
    UPDATE tarefas_terc_andar
    SET tecnico = :tecnico, status = '1'
    WHERE id = :tarefa
  ");

  $stmt->bindValue(':tecnico', $tecnico, PDO::PARAM_INT);
  $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $updateOk = $stmt->execute();

  if (!$updateOk) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao direcionar a tarefa.',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $show_tec = $pdo->prepare("
    SELECT user_nome
    FROM usuarios
    WHERE user_id = :tecnico
    LIMIT 1
  ");

  $show_tec->bindValue(':tecnico', $tecnico, PDO::PARAM_INT);
  $show_tec->execute();

  $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
  $tecnico_nome = $exibe['user_nome'] ?? 'técnico selecionado';

  $inter_desc = "Direcionou a tarefa para $tecnico_nome.";

  $inter = $pdo->prepare("
    INSERT INTO inter_terc_andar
      (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
    VALUES
      ('4', :tarefa, :user_id, :agora, :inter_desc)
  ");

  $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $inter->bindValue(':user_id', $usuario_logado, PDO::PARAM_INT);
  $inter->bindValue(':agora', $agora);
  $inter->bindValue(':inter_desc', $inter_desc);
  $insertOk = $inter->execute();

  if ($insertOk) {
    return [
      'mensagem' => '<i class="fas fa-check"></i> OK! <br> A tarefa foi direcionada para ' . $tecnico_nome . '.',
      'mensagem_cor' => 'alert-success',
    ];
  }

  return [
    'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa direcionada, mas falhou ao registrar interação.',
    'mensagem_cor' => 'alert-warning',
  ];
}

function n3_tarefa3_action_create(PDO $pdo, int $user_id, string $hoje, string $agora): array
{
  $nome_tarefa = htmlspecialchars(filter_input(INPUT_POST, 'nome_tarefa', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');
  $cliente = (int) filter_input(INPUT_POST, 'cliente', FILTER_SANITIZE_NUMBER_INT);
  $pessoa = (int) filter_input(INPUT_POST, 'solicitante', FILTER_SANITIZE_NUMBER_INT);
  $local = (int) filter_input(INPUT_POST, 'local', FILTER_SANITIZE_NUMBER_INT);
  $tipo = (int) filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_NUMBER_INT);
  $forma = (int) filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
  $categoria = (int) filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_NUMBER_INT);
  $subcategoria = (int) filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_NUMBER_INT);
  $item = (int) filter_input(INPUT_POST, 'item', FILTER_SANITIZE_NUMBER_INT);
  $nivel = (int) filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_NUMBER_INT);
  $desc_abertura = filter_input(INPUT_POST, 'desc_abertura', FILTER_UNSAFE_RAW);
  $abertura = filter_input(INPUT_POST, 'abertura', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
  $tecnico = (int) filter_input(INPUT_POST, 'tecnico', FILTER_SANITIZE_NUMBER_INT);

  if (empty($nome_tarefa) || empty($desc_abertura) || empty($abertura)) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Preencha os campos obrigatórios.',
      'mensagem_cor' => 'alert-danger',
      'tarefa' => 0,
    ];
  }

  if (strtotime($abertura) > strtotime($agora)) {
    $tarefa_sts = 0;
    $agendamento = date("d/m/Y H:i", strtotime($abertura));
    $inter_msg = "Registrou o Agendamento da Tarefa para $agendamento.";
  } else {
    $tarefa_sts = 1;
    $inter_msg = "Registrou solicitação de Tarefa.";
  }

  $prazo_reincidente = 30;
  $data_reincidente = date("Y-m-d", strtotime($hoje . " - $prazo_reincidente days"));

  $show = $pdo->prepare("
    SELECT id 
    FROM tarefas_terc_andar 
    WHERE abertura > :data_reincidente
      AND cliente = :cliente
      AND categoria = :categoria
      AND subcategoria = :subcategoria
    LIMIT 1
  ");

  $show->bindValue(':data_reincidente', $data_reincidente);
  $show->bindValue(':cliente', $cliente, PDO::PARAM_INT);
  $show->bindValue(':categoria', $categoria, PDO::PARAM_INT);
  $show->bindValue(':subcategoria', $subcategoria, PDO::PARAM_INT);
  $show->execute();

  $reincidente = $show->fetch(PDO::FETCH_ASSOC) ? 1 : 0;

  $stmt = $pdo->prepare("
    INSERT INTO tarefas_terc_andar 
    (
      cliente,
      nome_tarefa,
      pessoa,
      local,
      tipo,
      categoria,
      subcategoria,
      item,
      nivel,
      forma,
      desc_abertura,
      abertura,
      tecnico,
      reincidente,
      status
    ) 
    VALUES 
    (
      :cliente,
      :nome_tarefa,
      :pessoa,
      :local,
      :tipo,
      :categoria,
      :subcategoria,
      :item,
      :nivel,
      :forma,
      :desc_abertura,
      :abertura,
      :tecnico,
      :reincidente,
      :status
    )
  ");

  $stmt->bindValue(':cliente', $cliente, PDO::PARAM_INT);
  $stmt->bindValue(':nome_tarefa', $nome_tarefa);
  $stmt->bindValue(':pessoa', $pessoa, PDO::PARAM_INT);
  $stmt->bindValue(':local', $local, PDO::PARAM_INT);
  $stmt->bindValue(':tipo', $tipo, PDO::PARAM_INT);
  $stmt->bindValue(':categoria', $categoria, PDO::PARAM_INT);
  $stmt->bindValue(':subcategoria', $subcategoria, PDO::PARAM_INT);
  $stmt->bindValue(':item', $item, PDO::PARAM_INT);
  $stmt->bindValue(':nivel', $nivel, PDO::PARAM_INT);
  $stmt->bindValue(':forma', $forma, PDO::PARAM_INT);
  $stmt->bindValue(':desc_abertura', $desc_abertura);
  $stmt->bindValue(':abertura', $abertura);
  $stmt->bindValue(':tecnico', $tecnico, PDO::PARAM_INT);
  $stmt->bindValue(':reincidente', $reincidente, PDO::PARAM_INT);
  $stmt->bindValue(':status', $tarefa_sts, PDO::PARAM_INT);

  if (!$stmt->execute()) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao cadastrar tarefa!',
      'mensagem_cor' => 'alert-danger',
      'tarefa' => 0,
    ];
  }

  $tarefa = (int)$pdo->lastInsertId();

  $inter = $pdo->prepare("
    INSERT INTO inter_terc_andar 
      (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc) 
    VALUES 
      ('1', :tarefa, :user_id, :agora, :inter_desc)
  ");

  $inter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $inter->bindValue(':user_id', $user_id, PDO::PARAM_INT);
  $inter->bindValue(':agora', $agora);
  $inter->bindValue(':inter_desc', $inter_msg);
  $inter->execute();

  if ($tecnico > 0 && $tecnico !== $user_id) {
    $show_tec = $pdo->prepare("
      SELECT user_nome 
      FROM usuarios 
      WHERE user_id = :tecnico
      LIMIT 1
    ");

    $show_tec->bindValue(':tecnico', $tecnico, PDO::PARAM_INT);
    $show_tec->execute();

    $exibe = $show_tec->fetch(PDO::FETCH_ASSOC);
    $tecnico_nome = $exibe['user_nome'] ?? 'técnico selecionado';

    $inter_desc = "Direcionou a tarefa para $tecnico_nome.";

    $interTec = $pdo->prepare("
      INSERT INTO inter_terc_andar 
        (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc) 
      VALUES 
        ('4', :tarefa, :user_id, :agora, :inter_desc)
    ");

    $interTec->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
    $interTec->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $interTec->bindValue(':agora', $agora);
    $interTec->bindValue(':inter_desc', $inter_desc);
    $interTec->execute();
  }

  return [
    'mensagem' => '<i class="fas fa-check"></i> Tarefa cadastrada!',
    'mensagem_cor' => 'alert-success',
    'tarefa' => $tarefa,
  ];
}

function n3_tarefa3_action_edit_classificacao(PDO $pdo, int $tarefa, int $user_id, string $agora): array
{
  $tipo = (int) filter_input(INPUT_POST, 'tipo', FILTER_SANITIZE_NUMBER_INT);
  $categoria = (int) filter_input(INPUT_POST, 'categoria', FILTER_SANITIZE_NUMBER_INT);
  $subcategoria = (int) filter_input(INPUT_POST, 'subcategoria', FILTER_SANITIZE_NUMBER_INT);
  $item = (int) filter_input(INPUT_POST, 'item', FILTER_SANITIZE_NUMBER_INT);
  $nivel = (int) filter_input(INPUT_POST, 'nivel', FILTER_SANITIZE_NUMBER_INT);
  $forma = (int) filter_input(INPUT_POST, 'forma', FILTER_SANITIZE_NUMBER_INT);
  $desc_abertura = htmlspecialchars(filter_input(INPUT_POST, 'desc_abertura', FILTER_DEFAULT), ENT_QUOTES, 'UTF-8');

  if ($tarefa <= 0) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa inválida.',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  $novo_tipo_nome = n3_tarefa3_lookup_nome($pdo, 'tipos_terc_andar', $tipo);
  $nova_categoria_nome = n3_tarefa3_lookup_nome($pdo, 'categorias_terc_andar', $categoria);
  $nova_subcategoria_nome = n3_tarefa3_lookup_nome($pdo, 'subcategorias_terc_andar', $subcategoria);
  $novo_nivel_nome = n3_tarefa3_lookup_nome($pdo, 'niveis_terc_andar', $nivel);
  $nova_forma_nome = n3_tarefa3_forma_nome($forma);

  $stmtItem = $pdo->prepare("
    SELECT itens_nome
    FROM itens
    WHERE itens_id = :item
    LIMIT 1
  ");
  $stmtItem->bindValue(':item', $item, PDO::PARAM_INT);
  $stmtItem->execute();
  $itemRow = $stmtItem->fetch(PDO::FETCH_ASSOC);
  $novo_item_nome = $itemRow['itens_nome'] ?? 'Não informado';

  $stmtOriginal = $pdo->prepare("
    SELECT 
      tarefas_terc_andar.tipo,
      tarefas_terc_andar.nivel,
      tarefas_terc_andar.forma,
      tarefas_terc_andar.item,
      tarefas_terc_andar.categoria,
      tarefas_terc_andar.subcategoria,
      tarefas_terc_andar.desc_abertura,

      tipos.nome AS tipo_nome,
      categorias.nome AS cat_nome,
      subcategorias.nome AS scat_nome,
      niveis.nome AS nivel_nome,
      itens.itens_nome

    FROM tarefas_terc_andar

    LEFT JOIN tipos_terc_andar AS tipos
      ON tipos.id = tarefas_terc_andar.tipo

    LEFT JOIN categorias_terc_andar AS categorias
      ON categorias.id = tarefas_terc_andar.categoria

    LEFT JOIN subcategorias_terc_andar AS subcategorias
      ON subcategorias.id = tarefas_terc_andar.subcategoria

    LEFT JOIN niveis_terc_andar AS niveis
      ON niveis.id = tarefas_terc_andar.nivel

    LEFT JOIN itens
      ON itens.itens_id = tarefas_terc_andar.item

    WHERE tarefas_terc_andar.id = :tarefa
    LIMIT 1
  ");

  $stmtOriginal->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $stmtOriginal->execute();

  $original = $stmtOriginal->fetch(PDO::FETCH_ASSOC);

  if (!$original) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Tarefa não encontrada.',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  $alterou = false;

  $camposParaAtualizar = [];
  $paramsUpdate = [
    ':tarefa' => $tarefa,
  ];

  $interacoes = [];

  if ($tipo !== (int)$original['tipo']) {
    $camposParaAtualizar[] = 'tipo = :tipo';
    $paramsUpdate[':tipo'] = $tipo;

    $interacoes[] = [
      'desc' => 'Editou o Tipo: <s>De: ' . ($original['tipo_nome'] ?? 'Não informado') . '</s> para ' . $novo_tipo_nome . '.',
    ];

    $alterou = true;
  }

  if ($nivel !== (int)$original['nivel']) {
    $camposParaAtualizar[] = 'nivel = :nivel';
    $paramsUpdate[':nivel'] = $nivel;

    $interacoes[] = [
      'desc' => 'Editou o Nível: <s>De: ' . ($original['nivel_nome'] ?? 'Não informado') . '</s> para ' . $novo_nivel_nome . '.',
    ];

    $alterou = true;
  }

  if ($categoria !== (int)$original['categoria']) {
    $camposParaAtualizar[] = 'categoria = :categoria';
    $paramsUpdate[':categoria'] = $categoria;

    $interacoes[] = [
      'desc' => 'Editou a Categoria: <s>De: ' . ($original['cat_nome'] ?? 'Não informado') . '</s> para ' . $nova_categoria_nome . '.',
    ];

    $alterou = true;
  }

  if ($subcategoria !== (int)$original['subcategoria']) {
    $camposParaAtualizar[] = 'subcategoria = :subcategoria';
    $paramsUpdate[':subcategoria'] = $subcategoria;

    $interacoes[] = [
      'desc' => 'Editou a Sub Categoria: <s>De: ' . ($original['scat_nome'] ?? 'Não informado') . '</s> para ' . $nova_subcategoria_nome . '.',
    ];

    $alterou = true;
  }

  if ($item !== (int)$original['item']) {
    $camposParaAtualizar[] = 'item = :item';
    $paramsUpdate[':item'] = $item;

    $interacoes[] = [
      'desc' => 'Editou o Item: <s>De: ' . ($original['itens_nome'] ?? 'Não informado') . '</s> para ' . $novo_item_nome . '.',
    ];

    $alterou = true;
  }

  if ($forma !== (int)$original['forma']) {
    $camposParaAtualizar[] = 'forma = :forma';
    $paramsUpdate[':forma'] = $forma;

    $interacoes[] = [
      'desc' => 'Editou a forma de atendimento: <s>De: ' . n3_tarefa3_forma_nome((int)$original['forma']) . '</s> para ' . $nova_forma_nome . '.',
    ];

    $alterou = true;
  }

  if ($desc_abertura !== (string)$original['desc_abertura']) {
    $camposParaAtualizar[] = 'desc_abertura = :desc_abertura';
    $paramsUpdate[':desc_abertura'] = $desc_abertura;

    $interacoes[] = [
      'desc' => 'Editou a Descrição de Abertura: <s>De: ' . ($original['desc_abertura'] ?? '') . '</s> para: ' . $desc_abertura . '.',
    ];

    $alterou = true;
  }

  if (!$alterou) {
    return [
      'mensagem' => '<i class="fas fa-info-circle"></i> Nenhuma alteração foi identificada.',
      'mensagem_cor' => 'alert-info',
    ];
  }

  $sqlUpdate = "
    UPDATE tarefas_terc_andar
    SET " . implode(', ', $camposParaAtualizar) . "
    WHERE id = :tarefa
  ";

  $stmtUpdate = $pdo->prepare($sqlUpdate);

  foreach ($paramsUpdate as $param => $value) {
    if ($param === ':tarefa' || is_int($value)) {
      $stmtUpdate->bindValue($param, $value, PDO::PARAM_INT);
    } else {
      $stmtUpdate->bindValue($param, $value);
    }
  }

  if (!$stmtUpdate->execute()) {
    return [
      'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Falha ao editar classificação da tarefa.',
      'mensagem_cor' => 'alert-danger',
    ];
  }

  foreach ($interacoes as $interacao) {
    $stmtInter = $pdo->prepare("
      INSERT INTO inter_terc_andar
        (inter_tipo, inter_tarefa, inter_user, inter_data, inter_desc)
      VALUES
        ('9', :tarefa, :user_id, :agora, :inter_desc)
    ");

    $stmtInter->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
    $stmtInter->bindValue(':user_id', $user_id, PDO::PARAM_INT);
    $stmtInter->bindValue(':agora', $agora);
    $stmtInter->bindValue(':inter_desc', $interacao['desc']);
    $stmtInter->execute();
  }

  return [
    'mensagem' => '<i class="fas fa-check"></i> OK! <br> Classificação da tarefa alterada!',
    'mensagem_cor' => 'alert-success',
  ];
}

function n3_tarefa3_handle_action(PDO $pdo, string $action, int $tarefa, int $user_id, string $hoje, string $agora): array
{
  switch ($action) {
    case 'tarefa_adc':
      return n3_tarefa3_action_create($pdo, $user_id, $hoje, $agora);

    case 'tarefa_edt':
      return n3_tarefa3_action_edit_classificacao($pdo, $tarefa, $user_id, $agora);

    case 'tarefa_new_inter':
      return n3_tarefa3_action_new_inter($pdo, $tarefa, $user_id, $agora);

    case 'tarefa_aceitar':
      return n3_tarefa3_action_aceitar($pdo, $tarefa, $user_id, $agora);

    case 'tarefa_retomar':
      return n3_tarefa3_action_retomar($pdo, $tarefa, $user_id, $agora);

    case 'tarefa_recusar':
      return n3_tarefa3_action_recusar($pdo, $tarefa, $user_id, $agora);

    case 'tarefa_espera':
      return n3_tarefa3_action_espera($pdo, $tarefa, $user_id, $agora);

    case 'tarefa_finalizar':
      return n3_tarefa3_action_finalizar($pdo, $tarefa, $user_id, $agora);

    default:
      return [
        'mensagem' => '<i class="fas fa-exclamation-triangle"></i> Ação inválida.',
        'mensagem_cor' => 'alert-danger',
        'tarefa' => $tarefa,
      ];
  }
}