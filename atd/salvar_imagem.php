<?php
include_once("../all/conect.php");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $img_id = $_POST['img_id'];
    $img_atd = file_get_contents($_FILES['img_atd']['tmp_name']);
    
    if ($_POST['img_id']) {
        // Atualize a imagem existente
        $query = "UPDATE imagens SET img_atd = ?, data_atualizacao = NOW() WHERE id = ?";
        $stmt = $pdo->prepare($query);
        if ($stmt->execute([$img_atd, $img_id])) {
            echo 'Imagem atualizada com sucesso.';
        } else {
            echo 'Erro ao atualizar a imagem.';
        }
    } else {
        // Insira uma nova imagem
        $query = "INSERT INTO imagens (atd_id, user_id, img_atd, data_atualizacao) VALUES (?, ?, ?, NOW())";
        $stmt = $pdo->prepare($query);
        if ($stmt->execute([$_POST['atd_id'], $_POST['user_id'], $img_atd])) {
            echo 'Imagem salva com sucesso.';
        } else {
            echo 'Erro ao salvar a imagem.';
        }
    }
}
?>
