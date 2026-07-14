<?php

function n3_tarefa3_fetch_detail(PDO $pdo, int $tarefa): ?array
{
  $show_tarefa = $pdo->prepare("
    SELECT 
      tarefas_terc_andar.`area`,
      tarefas_terc_andar.`nome_tarefa`,
      tarefas_terc_andar.`tipo`,
      tarefas_terc_andar.`categoria`,
      tarefas_terc_andar.`subcategoria`,
      tarefas_terc_andar.`item`,
      tarefas_terc_andar.`local`,
      tarefas_terc_andar.`forma`,
      tarefas_terc_andar.`desc_abertura`,
      tarefas_terc_andar.`nivel`,
      tarefas_terc_andar.`desc_fechamento`,
      tarefas_terc_andar.`abertura`,
      tarefas_terc_andar.`fechamento`,
      tarefas_terc_andar.`reincidente`,
      tarefas_terc_andar.`status`,
      tarefas_terc_andar.`tecnico`,

      tipos.nome AS tipo_nome,
      categorias.nome AS cat_nome,
      subcategorias.nome AS scat_nome,
      niveis.nome AS nivel_nome,

      clientes.`clt_id`,
      clientes.`clt_nomer`,
      clientes.`clt_nomef`,
      clientes.`clt_cnpj`,

      pessoas.`pessoa_nom`,
      pessoas.`pessoa_cargo`,
      pessoas.`pessoa_tel`,
      pessoas.`pessoa_mail`,

      locais.`local_nom`,
      locais.`local_end`,
      locais.`local_city`,
      locais.`local_uf`,

      itens.`itens_nome`,

      usuarios.`user_nome` AS tecnico_nome,
      usuarios.`user_cel` AS tecnico_tel,
      usuarios.`user_mail` AS tecnico_mail

    FROM tarefas_terc_andar

    LEFT JOIN clientes 
      ON clientes.clt_id = tarefas_terc_andar.cliente

    LEFT JOIN pessoas 
      ON pessoas.pessoa_id = tarefas_terc_andar.pessoa

    LEFT JOIN locais 
      ON locais.local_id = tarefas_terc_andar.`local`

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

    LEFT JOIN usuarios 
      ON usuarios.user_id = tarefas_terc_andar.tecnico

    WHERE tarefas_terc_andar.id = :tarefa
    LIMIT 1
  ");

  $show_tarefa->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $show_tarefa->execute();

  $row = $show_tarefa->fetch(PDO::FETCH_ASSOC);

  return $row ?: null;
}

function n3_tarefa3_fetch_timeline(PDO $pdo, int $tarefa): array
{
  if ($tarefa <= 0) {
    return [];
  }

  $stmt = $pdo->prepare("
    SELECT 
      inter_terc_andar.inter_id,
      inter_terc_andar.inter_tipo,
      inter_terc_andar.inter_data,
      inter_terc_andar.inter_desc,
      inter_terc_andar.inter_user,
      usuarios.user_nome
    FROM inter_terc_andar
    INNER JOIN usuarios 
      ON usuarios.user_id = inter_terc_andar.inter_user
    WHERE inter_terc_andar.inter_tarefa = :tarefa
      AND inter_terc_andar.inter_tipo > 0
    ORDER BY inter_terc_andar.inter_id DESC
  ");

  $stmt->bindValue(':tarefa', $tarefa, PDO::PARAM_INT);
  $stmt->execute();

  return $stmt->fetchAll(PDO::FETCH_ASSOC);
}