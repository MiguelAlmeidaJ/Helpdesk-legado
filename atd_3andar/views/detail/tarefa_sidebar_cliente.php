<?php

/**
 * View parcial: tarefa_sidebar_cliente.php
 *
 * @var int $tarefa
 * @var int|string $m8_01
 * @var int|string $m8_05
 * @var string $nomeTarefa
 * @var string $clt_nomer
 * @var string $clt_nomef
 * @var string $clt_cnpj
 * @var string $pessoa_nom
 * @var string $pessoa_cargo
 * @var string $pessoa_tel
 * @var string $local
 * @var string $local_nom
 * @var string $local_end
 * @var string $local_city
 * @var string $local_uf
 * @var int|string $tarefa_forma
 * @var int|string $tarefa_reincidente
 * @var string $tarefa_tipo_nome
 * @var string $cat_nome
 * @var string $scat_nome
 * @var string $itens_nome
 */
?>

<div class="col-md-3 px-1">
    <div class="card">
        <div class="card-header py-1 h6 pt-2 pb-2">
            <i class="fas fa-headset text-danger"></i> Tarefa #<?php echo str_pad($tarefa, 5, '0', STR_PAD_LEFT); ?>
            <!-- <br /><small><?php echo $nomeTarefa; ?></small> -->
        </div>
        <div class="card-body pt-1 pl-0 pr-0">
            <ul class="list-unstyled">
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-building mr-2"></i><?php echo $clt_nomer; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-paste small ml-3 pl-3 mr-2"></i><small>CNPJ: <?php echo $clt_cnpj; ?></small></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-building small ml-3 pl-3 mr-2"></i><small><?php echo $clt_nomef; ?></small></li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-user-tag mr-2"></i><?php echo $pessoa_nom; ?></li>
                <?php if ($pessoa_cargo != "") { ?>
                    <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-sitemap small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_cargo; ?></small></li>
                <?php } ?>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-mobile-alt small ml-3 pl-3 mr-2"></i><small><?php echo $pessoa_tel; ?></small></li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-map-marked-alt mr-2"></i><?php echo $local_nom; ?></li>
                <?php if ($local > 0) {   ?>
                    <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-map-signs small ml-3 pl-3 mr-2"></i><small><?php echo "$local_end - $local_city - $local_uf"; ?></small></li>
                <?php } ?>


                <hr class="p-0 mt-2 mb-0">
                <li class="mt-1 align-items-center">
                    <div class="row px-0 mx-0 ">
                        <div class="col-10 pt-1 small">
                            <strong>Classificação da Tarefa:</strong>
                        </div>
                        <?php if ((int)($m8_01 ?? 0) >= 3 || (int)($m8_05 ?? 0) >= 2) { ?>
                            <div class="col-2 text-right">
                                <button type="button" class="btn btn-outline-secondary btn-sm small" data-toggle="modal" data-target="#tarefa_edt"> <i class="far fa-edit"></i></button>
                            </div>
                        <?php } ?>
                    </div>
                </li>
                <hr class="p-0 mt-1 mb-0">
                <li class="pl-2 mt-1 d-flex align-items-center">
                    <?php if ($tarefa_forma == 1) { ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> Tarefa Remota <?php } ?>
                    <?php if ($tarefa_forma == 2) { ?> <i class="fas fa-briefcase mr-2 text-danger"></i> Tarefa Presencial <?php } ?>
                    <?php if ($tarefa_forma == 3) { ?> <i class="fas fa-laptop-house mr-2 text-primary"></i> Tarefa Remota - Plantão <?php } ?>
                    <?php if ($tarefa_forma == 4) { ?> <i class="fas fa-briefcase mr-2 text-danger"></i> Tarefa Presencial - Plantão <?php } ?>
                    <?php if ($tarefa_reincidente == 1) { ?>
                        <i class=" ml-3 fas fa-exclamation-triangle text-danger" title="Reincidente"></i>
                    <?php } ?>
                </li>
                <li class="pl-2 mt-1 d-flex align-items-center"><i class="fas fa-archive mr-2"></i><?php echo $tarefa_tipo_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-folder-open ml-3 mr-2"></i><?php echo $cat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="far fa-file-alt ml-5 mr-2 text-primary"></i><?php echo $scat_nome; ?></li>
                <li class="pl-2 mt-0 d-flex align-items-center"><i class="fas fa-list-ol ml-5 pl-4 mr-2"></i><?php echo $itens_nome; ?></li>
            </ul>
        </div>
    </div>
</div>