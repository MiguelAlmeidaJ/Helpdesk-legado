<?php
/**
 * View: tarefa_detail.php
 * Este arquivo é incluído por tarefa.php quando existe uma tarefa selecionada.
 *
 * @var PDO $pdo
 * @var int $tarefa
 * @var int $user_id
 * @var string $token
 * @var string $agora
 * @var int|string $m8_01
 * @var int|string $m8_02
 * @var int|string $m8_03
 * @var int|string $m8_04
 * @var int|string $m8_05
 */

$tarefa = (int)($tarefa ?? 0);
$user_id = (int)($user_id ?? ($_SESSION['allterusN3Id'] ?? 0));
$token = $token ?? '';
$agora = $agora ?? date('Y-m-d H:i:s');

$m8_01 = (int)($m8_01 ?? 0);
$m8_02 = (int)($m8_02 ?? 0);
$m8_03 = (int)($m8_03 ?? 0);
$m8_04 = (int)($m8_04 ?? 0);
$m8_05 = (int)($m8_05 ?? 0);

$row = n3_tarefa3_fetch_detail($pdo, (int)$tarefa);

if (!$row) {
  echo "<div class='alert alert-danger m-3'>Tarefa não encontrada.</div>";
  exit;
}

$tarefa_desc_abertura = $row["desc_abertura"] ?? '';
$tarefa_desc_fechamento = $row["desc_fechamento"] ?? '';
$tarefa_hora_abertura = $row["abertura"] ?? '';
$tarefa_hora_fechamento = $row["fechamento"] ?? '';
$tarefa_reincidente = $row["reincidente"] ?? '';
$tarefa_status = $row["status"] ?? '';

$tarefa_tipo = (int)($row["tipo"] ?? 0);
$tarefa_tipo_nome = $row["tipo_nome"] ?? 'Não informado';

if ($tarefa_tipo_nome === '') {
  $tarefa_tipo_nome = 'Não informado';
}

$tarefa_nivel = (int)($row["nivel"] ?? 0);
$tarefa_nivel_nome = $row["nivel_nome"] ?? 'Não informado';

if ($tarefa_nivel_nome === '') {
  $tarefa_nivel_nome = 'Não informado';
}

$tarefa_forma = $row["forma"] ?? '';

$clt_id = $row["clt_id"] ?? '';
$clt_nomer = $row["clt_nomer"] ?? '';
$clt_nomef = $row["clt_nomef"] ?? '';
$clt_cnpj = $row["clt_cnpj"] ?? '';

$pessoa_nom = $row["pessoa_nom"] ?? '';
$pessoa_cargo = $row["pessoa_cargo"] ?? '';
$pessoa_tel = $row["pessoa_tel"] ?? '';
$pessoa_mail = $row["pessoa_mail"] ?? '';

$local = $row["local"] ?? '';
$local_nom = $row["local_nom"] ?? '';

if ($local == 0) {
  $local_nom = "Não informado";
}

$local_end = $row["local_end"] ?? '';
$local_city = $row["local_city"] ?? '';
$local_uf = $row["local_uf"] ?? '';

$tarefa_cat = $row["categoria"] ?? '';
$tarefa_item = $row["item"] ?? '';
$cat_nome = $row["cat_nome"] ?? '';
$tarefa_scat = $row["subcategoria"] ?? '';
$scat_nome = $row["scat_nome"] ?? '';
$itens_nome = $row["itens_nome"] ?? '';
$tarefa_itens_nome = $row["itens_nome"] ?? '';
$nomeTarefa = $row["nome_tarefa"] ?? '';

$tecnico_nome = $row["tecnico_nome"] ?? '';
$tecnico_id = $row["tecnico"] ?? '';

if ($tecnico_id == 0) {
  $tecnico_nome = "Não Atribuído";
}
?>

<div class="container-fluid">
  <div class="row mt-2">

    <?php include __DIR__ . "/detail/tarefa_sidebar_cliente.php"; ?>

    <?php include __DIR__ . "/detail/tarefa_acoes.php"; ?>

    <?php include __DIR__ . "/detail/tarefa_timeline.php"; ?>

  </div>
</div>

<?php include __DIR__ . "/tarefa_modals.php"; ?>