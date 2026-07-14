<?php

function n3_tarefa3_lookup_nome(PDO $pdo, string $tabela, int $id): string
{
  $tabelasPermitidas = [
    'tipos_terc_andar',
    'categorias_terc_andar',
    'subcategorias_terc_andar',
    'niveis_terc_andar'
  ];

  if (!in_array($tabela, $tabelasPermitidas, true) || $id <= 0) {
    return 'Não informado';
  }

  $stmt = $pdo->prepare("
    SELECT nome
    FROM {$tabela}
    WHERE id = :id
    LIMIT 1
  ");

  $stmt->bindValue(':id', $id, PDO::PARAM_INT);
  $stmt->execute();

  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  return $row['nome'] ?? 'Não informado';
}

function n3_tarefa3_h($value): string
{
  return htmlspecialchars((string)($value ?? ''), ENT_QUOTES, 'UTF-8');
}

function n3_tarefa3_forma_nome($forma): string
{
  switch ((int)$forma) {
    case 1:
      return 'Remoto';

    case 2:
      return 'Presencial';

    case 3:
      return 'Remoto - Plantão';

    case 4:
      return 'Presencial - Plantão';

    default:
      return 'Não informado';
  }
}

function n3_tarefa3_timeline_colors(int $inter_tipo): array
{
  switch ($inter_tipo) {
    case 1: // Abertura
      return [
        'dot' => 'b-primary',
        'active' => 'active-primary',
      ];

    case 2: // Aceite
      return [
        'dot' => 'b-success',
        'active' => 'active-success',
      ];

    case 3: // Devolução
      return [
        'dot' => 'b-danger',
        'active' => 'active-danger',
      ];

    case 4: // Transferência
      return [
        'dot' => 'b-warning',
        'active' => 'active-warning',
      ];

    case 5: // Espera
      return [
        'dot' => 'b-danger',
        'active' => 'active-danger',
      ];

    case 6: // Retomada
      return [
        'dot' => 'b-primary',
        'active' => 'active-primary',
      ];

    case 7: // Interação
      return [
        'dot' => 'b-primary',
        'active' => 'active-primary',
      ];

    case 8: // Finalização
      return [
        'dot' => 'b-success',
        'active' => 'active-success',
      ];

    case 9: // Edição
      return [
        'dot' => 'b-danger',
        'active' => 'active-danger',
      ];

    default:
      return [
        'dot' => 'b-primary',
        'active' => 'active-primary',
      ];
  }
}