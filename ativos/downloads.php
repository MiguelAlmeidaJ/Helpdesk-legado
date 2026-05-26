<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

// Estabelece a conexão com o banco de dados
$pdo = ConnectionN3();


?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.9, shrink-to-fit=no">
  <link rel="icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../css/help.css">
  <link rel="stylesheet" href="../css/bootstrap.min.css">
  <link rel="stylesheet" href="../fontawesome/css/all.css">
  <link rel="stylesheet" href="../css/bootstrap-select.min.css">
  <link rel="stylesheet" href="../css/timeline.css">
  <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
  <title>Allterus</title>
  <!-- CSS do Bootstrap -->
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <style>
    body {
      transform: scale(0.9);
      transform-origin: top left;
      width: 111%;
      margin: 0;
      padding: 0;
    }

    .container {
      margin: 10px;
      margin-left: 10px;
      align-items: flex-start;
    }

    .card {
      margin: 10px;
      margin-left: 10px;
      margin-right: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      background-color: #f8f9fa;
      padding: 10px;
      font-size: 1.25em;
      border-bottom: 1px solid #ccc;
    }

    .card-header .atendimentos {
      float: right;
      font-size: 0.9em;
      /* Ajuste conforme necessário */
      padding: 5px;

    }

    .btn {
      font-size: 0.9em;
      margin-right: 5px;
      margin-bottom: 5px;
      padding: 5px;
      border-radius: 5px;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      width: 100%;
    }
  </style>
</head>

<body>

  <?php include("../all/sidebar.php"); ?>

  <div class="container-fluid">
    <div class="row">
      <div class="col-md-12">
        <div class="card" style="overflow-x: hidden; overflow-y: hidden; min-height: 620px">
          <div class="card-header py-2">
            <i class="fas fa-download"></i> Downloads
            <!-- card esquerdo diponibilidade tecnica -->
          </div>

          <div class="card-body">
            <div class="row">
              <!-- Card 1 -->
              <!-- <div class="col-12 col-md-4 col-lg-3 mb-3">
                <a href="https://drive.google.com/file/d/1kyWfNw3zYVFYeNyd15Wxsc_AVc3tX8Lh/view?usp=sharing" class="d-block text-center">
                  <img src="../img/plugin.png" class="img-fluid" alt="Responsive image" style="width: 40%; height: auto;">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center mt-3 mb-3 text-wrap">
                    Gestor de Equipamentos Windows v1.1.06.25
                  </button>
                </a>
              </div> -->
              <!-- Card 2 -->
              <div class="col-12 col-md-4 col-lg-3 mb-3">
                <a href="https://drive.google.com/uc?export=download&id=1Xh75s09rCcANoKwazH46K-4Pvio1cccN" class="d-block text-center">
                  <img src="../img/plugin.png" class="img-fluid" alt="Responsive image" style="width: 40%; height: auto;">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center mt-3 mb-3 text-wrap">
                    Gestor de Equipamentos Windows v1.1.07.02
                  </button>
                </a>
              </div>
              <!-- Card 3 -->
              <div class="col-12 col-md-4 col-lg-3 mb-3">
                <a href="https://drive.google.com/file/d/1iqvJ3N1mswm5dSt2Q0VKAbm9OC7qismy/view?usp=sharing" class="d-block text-center">
                  <img src="../img/plugin.png" class="img-fluid" alt="Responsive image" style="width: 40%; height: auto;">
                  <button type="button" class="btn btn-outline-success btn-sm btn-block text-center mt-3 mb-3 text-wrap">
                    Gestor de Equipamentos Windows v1.1.07.04
                  </button>
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
</body>

</html>