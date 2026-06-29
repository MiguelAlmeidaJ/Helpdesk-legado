<?php
// busca_img_docs.php
session_start();
header('Content-Type: application/json; charset=utf-8');
include_once("../all/seguranca.php");
include_once("../all/conect.php");

$resposta = [
    'sucesso' => false,
    'mensagem' => 'Ocorreu um erro desconhecido.',
    'dados' => []
];

if (!isset($_GET['atd_id']) || !is_numeric($_GET['atd_id'])) {
    $resposta['mensagem'] = 'ID do atendimento inválido ou não fornecido.';
    echo json_encode($resposta);
    exit;
}

$id_do_atendimento_atual = (int)$_GET['atd_id'];

try {
    $conexao = ConnectionN3();
    if (!$conexao) {
        throw new Exception("Erro ao conectar ao banco de dados.");
    }

    // ALTERAÇÃO NA CONSULTA: Agora selecionamos o conteúdo do BLOB (img_atd)
    $sql_unificado = "
        (
            SELECT id, 'documento' AS tipo_item, caminho_arquivo AS caminho, nome_arquivo AS nome, data_upload AS data_ordenacao, tipo_arquivo, NULL AS conteudo_blob FROM documentos WHERE atd_id = :atd_id
        )
        UNION ALL
        (
            SELECT id, 'imagem_blob' AS tipo_item, NULL AS caminho, CONCAT('Imagem #', id) AS nome, data_atualizacao AS data_ordenacao, 'image/jpeg' AS tipo_arquivo, img_atd AS conteudo_blob FROM imagens WHERE atd_id = :atd_id
        )
        ORDER BY data_ordenacao DESC
    ";

    $comando = $conexao->prepare($sql_unificado);
    $comando->bindParam(':atd_id', $id_do_atendimento_atual, PDO::PARAM_INT);
    $comando->execute();

    $resultados = $comando->fetchAll(PDO::FETCH_ASSOC);
    $arquivos_formatados = [];

    // ALTERAÇÃO NA FORMATAÇÃO: Codifica o BLOB em Base64
    foreach ($resultados as $item) {
        $link_final = '';

        if ($item['tipo_item'] === 'documento') {
            $caminhoDocumento = str_replace('\\', '/', (string)$item['caminho']);
            $caminhoDocumento = preg_replace('#^(\.\./)+#', '../', $caminhoDocumento);
            $link_final = $caminhoDocumento;
        } else if ($item['tipo_item'] === 'imagem_blob') {
            // A MÁGICA ACONTECE AQUI:
            // Cria uma "Data URL" com o conteúdo da imagem em Base64
            $link_final = 'data:image/jpeg;base64,' . base64_encode($item['conteudo_blob']);
        }

        $arquivos_formatados[] = [
            'id' => $item['id'],
            'tipo_item' => $item['tipo_item'],
            'link' => $link_final, // O link agora contém o Base64 para imagens BLOB
            'nome' => htmlspecialchars($item['nome']),
            'tipo_arquivo' => $item['tipo_arquivo']
        ];
    }

    $resposta['sucesso'] = true;
    $resposta['mensagem'] = count($arquivos_formatados) . ' item(s) encontrado(s).';
    $resposta['dados'] = $arquivos_formatados;

} catch (Exception $e) {
    $resposta['mensagem'] = 'Erro no servidor: ' . $e->getMessage();
}

echo json_encode($resposta, JSON_UNESCAPED_UNICODE); // Removido PRETTY_PRINT para economizar bytes
?>