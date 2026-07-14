<?php

/**
 * View parcial: tarefa_acoes.php
 *
 * @var int $tarefa
 * @var int $user_id
 * @var string $tarefa_hora_abertura
 * @var string $tarefa_desc_abertura
 * @var string $tarefa_desc_fechamento
 * @var int|string $tarefa_status
 * @var int|string $tecnico_id
 * @var string $tecnico_nome
 * @var string $nomeTarefa
 * @var int|string $m8_01
 * @var int|string $m8_02
 * @var int|string $m8_03
 * @var int|string $m8_04
 * @var int|string $m8_05
 */

$botoesVisiveis = n3_tarefa3_get_botoes_visiveis(
    (int)$tarefa_status,
    (int)$tecnico_id,
    (int)$user_id,
    [
        'm8_01' => $m8_01 ?? 0,
        'm8_02' => $m8_02 ?? 0,
        'm8_03' => $m8_03 ?? 0,
        'm8_04' => $m8_04 ?? 0,
        'm8_05' => $m8_05 ?? 0,
    ],
    (int)($_SESSION['tipo'] ?? 0) === 2
);

$exibe_bt_tarefa_interacao = $botoesVisiveis['interacao'];
$exibe_bt_tarefa_aceitar = $botoesVisiveis['aceitar'];
$exibe_bt_tarefa_devolver = $botoesVisiveis['devolver'];
$exibe_bt_tarefa_espera = $botoesVisiveis['espera'];
$exibe_bt_tarefa_finalizar = $botoesVisiveis['finalizar'];
$exibe_bt_tarefa_retomar = $botoesVisiveis['retomar'];
?>

<div class="col-md-6 px-1">
    <div class="card">
        <div class="h6 card-header py-1">
            <div class="row">
                <div class="col-6 h6 pt-2 mb-0">
                    <i class="fas fa-check"></i> Ações
                </div>
                <div class="col-6 text-right px-0">
                    <?php if ($tarefa_status == 0) { ?>
                        <button type="button" class="btn btn-warning btn-sm btn-block text-center text-dark"> <i class="far fa-clock"></i> Atendimento Agendado </button>
                    <?php } ?>
                    <?php if ($tarefa_status == 1) { ?>
                        <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="fas fa-hourglass-half"></i> Aguardando Execução </button>
                    <?php } ?>
                    <?php if ($tarefa_status == 2) { ?>
                        <button type="button" class="btn btn-primary btn-sm btn-block text-center text-dark"> <i class="fas fa-magic"></i> Atendimento em Execução </button>
                    <?php } ?>
                    <?php if ($tarefa_status == 3) { ?>
                        <button type="button" class="btn btn-danger btn-sm btn-block text-center text-dark"> <i class="far fa-pause-circle"></i> Atendimento em Espera </button>
                    <?php } ?>
                    <?php if ($tarefa_status == 4) { ?>
                        <button type="button" class="btn btn-success btn-sm btn-block text-center text-dark"> <i class="fas fa-check"></i> Atendimento Finalizado </button>
                    <?php } ?>
                </div>
            </div>
        </div>
        <div class="card-body p-4">
            <div class="form-row">
                <div class="form-group col-sm-4 col-md-4">
                    <label class="my-0 small">Abertura:</label>
                    <input class="form-control form-control-sm" value="<?php echo date('d/m/y H:i', strtotime($tarefa_hora_abertura)); ?>" disabled="">
                </div>
                <div class="form-group col-sm-4 col-md-4">
                    <label class="my-0 small">Prazo:</label>
                    <input class="form-control form-control-sm" value="<?php echo $time_limit_to_close = date("d/m/y H:i", strtotime($tarefa_hora_abertura . " +20 hours")); ?>" disabled="">
                </div>

                <div class="form-group col-sm-4 col-md-4">
                    <label class="my-0 small">Técnico:</label>
                    <input class="form-control form-control-sm" value="<?php echo $tecnico_nome; ?>" disabled="">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col-sm-12">
                    <label class="my-0 small">Nome da Tarefa:</label>
                    <textarea class="form-control form-control-sm" rows="2" disabled=""><?php echo $nomeTarefa; ?></textarea>
                </div>
                <div class="form-group col-sm-12">
                    <label class="my-0 small">Descrição de abertura:</label>
                    <textarea class="form-control form-control-sm" rows="4" disabled=""><?php echo $tarefa_desc_abertura; ?></textarea>
                </div>
            </div>
            <?php if ($tarefa_status == 4) { ?>
                <div class="form-row">
                    <div class="form-group col-sm-12">
                        <label class="my-0 small">Descrição de fechamento:</label>
                        <textarea class="form-control form-control-sm" rows="3" disabled=""><?php echo $tarefa_desc_fechamento; ?></textarea>
                    </div>
                </div>
            <?php } ?>

            <!-- permissao para o usuario tipo 2 parceiro poder adicionar nova interacao -->
            <?php if ((int)($_SESSION['tipo'] ?? 0) === 2) { ?>
                <div class="task-action-buttons">
                    <button type="button" class="btn task-action-btn task-action-btn-interaction" data-toggle="modal" data-target="#tarefa_new_inter">
                        <i class="fas fa-headset"></i>
                        Nova Interação
                    </button>
                </div>
            <?php } else { ?>
                <div class="task-action-buttons">
                    <?php if ($exibe_bt_tarefa_aceitar == true && (int)$tarefa_status <= 1) { ?>
                        <button type="button" class="btn task-action-btn task-action-btn-start" data-toggle="modal" data-target="#tarefa_aceitar">
                            <i class="fas fa-play-circle"></i>
                            Iniciar ou Direcionar
                        </button>

                    <?php } elseif ($exibe_bt_tarefa_interacao == true) { ?>
                        <button type="button" class="btn task-action-btn task-action-btn-interaction" data-toggle="modal" data-target="#tarefa_new_inter">
                            <i class="fas fa-headset"></i>
                            Nova Interação
                        </button>
                    <?php } ?>

                    <?php if ($exibe_bt_tarefa_retomar == true) { ?>
                        <button type="button" class="btn task-action-btn task-action-btn-retake" data-toggle="modal" data-target="#tarefa_retomar">
                            <i class="fas fa-redo-alt"></i>
                            Retomar
                        </button>
                    <?php } ?>

                    <?php if ($exibe_bt_tarefa_espera == true) { ?>
                        <button type="button" class="btn task-action-btn task-action-btn-wait" data-toggle="modal" data-target="#tarefa_espera">
                            <i class="fas fa-pause-circle"></i>
                            Em Espera
                        </button>
                    <?php } ?>

                    <?php if ($exibe_bt_tarefa_devolver == true) { ?>
                        <button type="button" class="btn task-action-btn task-action-btn-return" data-toggle="modal" data-target="#tarefa_recusar">
                            <i class="fas fa-arrow-circle-up"></i>
                            Recusar
                        </button>
                    <?php } ?>

                    <?php if ($exibe_bt_tarefa_finalizar == true) { ?>
                        <button type="button" class="btn task-action-btn task-action-btn-finish" data-toggle="modal" data-target="#tarefa_finalizar">
                            <i class="fas fa-check-circle"></i>
                            Finalizar
                        </button>
                    <?php } ?>
                </div>
            <?php } ?>
        </div>
    </div>
</div>