<?php
$resultados_1 = $resultados_1 ?? [];
$resultados_2 = $resultados_2 ?? [];
$dados_mkt = $dados_mkt ?? [];
$resultados_interacao = $resultados_interacao ?? [];
$total_geral_ti = $total_geral_ti ?? 0;
$total_geral_devops = $total_geral_devops ?? 0;
$total_geral_mkt = $total_geral_mkt ?? 0;
$total_geral_criacao = $total_geral_criacao ?? 0;
$rankingTotals = [
  'TI' => (int)($total_geral_ti ?? 0),
  'DevOps' => (int)($total_geral_devops ?? 0),
  'MKT' => (int)($total_geral_mkt ?? 0),
  'QA' => (int)($total_geral_criacao ?? 0),
];
$rankingTotalPeriodo = array_sum($rankingTotals);
$rankingSetoresAtivos = count(array_filter($rankingTotals, function ($total) {
  return $total > 0;
}));
$rankingMelhorSetorNome = '-';
$rankingMelhorSetorTotal = 0;
foreach ($rankingTotals as $setor => $total) {
  if ($total > $rankingMelhorSetorTotal) {
    $rankingMelhorSetorNome = $setor;
    $rankingMelhorSetorTotal = $total;
  }
}
$rankingLeaders = [];
if (!empty($resultados_1[0])) {
  $rankingLeaders[] = ['nome' => $resultados_1[0]['nome_tecnico'], 'total' => (int)$resultados_1[0]['total'], 'setor' => 'TI'];
}
if (!empty($resultados_2)) {
  $devopsTopName = array_key_first($resultados_2);
  $rankingLeaders[] = ['nome' => $devopsTopName, 'total' => (int)$resultados_2[$devopsTopName]['total'], 'setor' => 'DevOps'];
}
if (!empty($dados_mkt[0])) {
  $rankingLeaders[] = ['nome' => $dados_mkt[0]['nome_tecnico'], 'total' => (int)$dados_mkt[0]['artes_feitas'], 'setor' => 'MKT'];
}
if (!empty($resultados_interacao[0])) {
  $rankingLeaders[] = ['nome' => $resultados_interacao[0]['nome_colaborador'], 'total' => (int)$resultados_interacao[0]['total'], 'setor' => 'QA'];
}
usort($rankingLeaders, function ($a, $b) {
  return $b['total'] <=> $a['total'];
});
$rankingLiderGeral = $rankingLeaders[0] ?? ['nome' => '-', 'total' => 0, 'setor' => '-'];
$rankingSemRegistros = array_keys(array_filter($rankingTotals, function ($total) {
  return $total === 0;
}));
?>
<div class="ranking-summary-panel">
  <div class="ranking-summary-main">
    <span class="ranking-kicker">Resumo geral</span>
    <h6>Cenario do periodo</h6>
    <p><?= htmlspecialchars($periodo_label, ENT_QUOTES, 'UTF-8') ?></p>
  </div>
  <div class="ranking-summary-grid">
    <div class="ranking-summary-card is-total">
      <span>Total no periodo</span>
      <strong><?= $rankingTotalPeriodo ?></strong>
    </div>
    <div class="ranking-summary-card is-team">
      <span>Melhor setor</span>
      <strong><?= htmlspecialchars($rankingMelhorSetorNome, ENT_QUOTES, 'UTF-8') ?></strong>
      <small><?= $rankingMelhorSetorTotal ?> registros</small>
    </div>
    <div class="ranking-summary-card is-leader">
      <span>Lider geral</span>
      <strong><?= htmlspecialchars($rankingLiderGeral['nome'], ENT_QUOTES, 'UTF-8') ?></strong>
      <small><?= htmlspecialchars($rankingLiderGeral['setor'], ENT_QUOTES, 'UTF-8') ?> - <?= $rankingLiderGeral['total'] ?></small>
    </div>
    <div class="ranking-summary-card is-active">
      <span>Setores ativos</span>
      <strong><?= $rankingSetoresAtivos ?> de <?= count($rankingTotals) ?></strong>
      <small><?= $rankingSemRegistros ? 'Sem registros: ' . htmlspecialchars(implode(', ', $rankingSemRegistros), ENT_QUOTES, 'UTF-8') : 'Todos com registros' ?></small>
    </div>
  </div>
</div>