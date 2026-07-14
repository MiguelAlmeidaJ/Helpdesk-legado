<?php
  // --- nova pagina home ---
  $ano_atual = date('Y');

  $trimestre_atual = (int) ceil(date('n') / 3);
  $trimestre_mes_inicio = (($trimestre_atual - 1) * 3) + 1;
  $trimestre_mes_fim = $trimestre_mes_inicio + 2;
  $trimestre_inicio = date('Y-m-d', mktime(0, 0, 0, $trimestre_mes_inicio, 1, $ano_atual));
  $trimestre_fim = date('Y-m-t', mktime(0, 0, 0, $trimestre_mes_fim, 1, $ano_atual));
  $ranking_trimestral_titulo = $trimestre_atual . '&ordm; trimestre ' . $ano_atual;
  $ranking_trimestral_periodo = 'T' . $trimestre_atual . ' ' . $ano_atual;

  $data_inicio_padrao = date('Y-m-01');
  $data_fim_padrao = date('Y-m-t');
  $quickRange = $_GET['quick'] ?? null;
  if ($quickRange === 'today') {
    $data_inicio_padrao = date('Y-m-d');
    $data_fim_padrao = date('Y-m-d');
  } elseif ($quickRange === 'week') {
    $data_inicio_padrao = date('Y-m-d', strtotime('monday this week'));
    $data_fim_padrao = date('Y-m-d', strtotime('sunday this week'));
  } elseif ($quickRange === 'quarter') {
    $data_inicio_padrao = $trimestre_inicio;
    $data_fim_padrao = $trimestre_fim;
  }
  $data_inicio = $_GET['data_inicio'] ?? $data_inicio_padrao;
  $data_fim = $_GET['data_fim'] ?? $data_fim_padrao;

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data_inicio) || !strtotime($data_inicio)) {
    $data_inicio = $data_inicio_padrao;
  }

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data_fim) || !strtotime($data_fim)) {
    $data_fim = $data_fim_padrao;
  }

  if ($data_inicio > $data_fim) {
    [$data_inicio, $data_fim] = [$data_fim, $data_inicio];
  }

  $periodo_inicio_valor = htmlspecialchars($data_inicio, ENT_QUOTES, 'UTF-8');
  $periodo_fim_valor = htmlspecialchars($data_fim, ENT_QUOTES, 'UTF-8');
  $periodo_label = date('d/m/Y', strtotime($data_inicio)) . ' - ' . date('d/m/Y', strtotime($data_fim));

  $filtro_data_sql_atendimentos = " AND a.abertura BETWEEN '{$data_inicio} 00:00:00' AND '{$data_fim} 23:59:59' ";
  $filtro_data_sql_tarefas = " AND t.fechamento BETWEEN '{$data_inicio}' AND '{$data_fim} 23:59:59' ";
  $filtro_data_sql_QA = " AND interacoes.inter_data BETWEEN '{$data_inicio}' AND '{$data_fim} 23:59:59' ";


  // Filtros para o trimestre atual
  $filtro_trimestre_atendimentos = " AND a.abertura BETWEEN '{$trimestre_inicio} 00:00:00' AND '{$trimestre_fim} 23:59:59' ";
  $filtro_trimestre_tarefas = " AND t.fechamento BETWEEN '{$trimestre_inicio}' AND '{$trimestre_fim} 23:59:59' ";
  $filtro_trimestre_sql_QA = " AND interacoes.inter_data BETWEEN '{$trimestre_inicio}' AND '{$trimestre_fim} 23:59:59' ";
