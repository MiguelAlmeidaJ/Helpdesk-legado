<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");
include_once("../all/token.php");
$hoje = date("Y-m-d");

if($m2_01==0){header("Location: ../index.php");}

$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING);
if ($usar_token=="true") {
  if($action){
    if ($action == "alterar_senha") {include_once("../all/update_senha.php");}
    
    if ($action == "new_clt") {
      $clt_nomer = filter_input(INPUT_POST, 'clt_nomer', FILTER_SANITIZE_STRING);
      $clt_nomef = filter_input(INPUT_POST, 'clt_nomef', FILTER_SANITIZE_STRING);
      $clt_cnpj = filter_input(INPUT_POST, 'clt_cnpj', FILTER_SANITIZE_STRING);
      $clt_end = filter_input(INPUT_POST, 'clt_end', FILTER_SANITIZE_STRING);
      $clt_city = filter_input(INPUT_POST, 'clt_city', FILTER_SANITIZE_STRING);
      $clt_uf= filter_input(INPUT_POST, 'clt_uf', FILTER_SANITIZE_STRING);
      $clt_mail= filter_input(INPUT_POST, 'clt_mail', FILTER_SANITIZE_STRING);
      $clt_tel= filter_input(INPUT_POST, 'clt_tel', FILTER_SANITIZE_STRING);
      $clt_ti= filter_input(INPUT_POST, 'clt_ti', FILTER_SANITIZE_NUMBER_INT);
      $clt_adm= filter_input(INPUT_POST, 'clt_adm', FILTER_SANITIZE_NUMBER_INT);
      $clt_mkt= filter_input(INPUT_POST, 'clt_mkt', FILTER_SANITIZE_NUMBER_INT);      

      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `clientes` (`clt_nomer`, `clt_nomef`, `clt_cnpj`, `clt_end`, `clt_city`, `clt_uf`, `clt_mail`, `clt_tel`, `clt_ti`, `clt_adm`, `clt_mkt`) VALUES (:clt_nomer, :clt_nomef, :clt_cnpj, :clt_end, :clt_city, :clt_uf, :clt_mail, :clt_tel, :clt_ti, :clt_adm, :clt_mkt);");
      $adc->bindParam(':clt_nomer', $clt_nomer);
      $adc->bindParam(':clt_nomef', $clt_nomef);
      $adc->bindParam(':clt_cnpj', $clt_cnpj);
      $adc->bindParam(':clt_end', $clt_end);
      $adc->bindParam(':clt_city', $clt_city);
      $adc->bindParam(':clt_uf', $clt_uf);
      $adc->bindParam(':clt_mail', $clt_mail);
      $adc->bindParam(':clt_tel', $clt_tel);
      $adc->bindParam(':clt_ti', $clt_ti);
      $adc->bindParam(':clt_adm', $clt_adm);
      $adc->bindParam(':clt_mkt', $clt_mkt);
      if($adc->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Cliente Cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar cliente!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    
    if ($action == "edt_clt") {
      $clt_id = filter_input(INPUT_POST, 'clt_id', FILTER_SANITIZE_NUMBER_INT);
      $clt_nomer = filter_input(INPUT_POST, 'clt_nomer', FILTER_SANITIZE_STRING);
      $clt_nomef = filter_input(INPUT_POST, 'clt_nomef', FILTER_SANITIZE_STRING);
      $clt_cnpj = filter_input(INPUT_POST, 'clt_cnpj', FILTER_SANITIZE_STRING);
      $clt_end = filter_input(INPUT_POST, 'clt_end', FILTER_SANITIZE_STRING);
      $clt_city = filter_input(INPUT_POST, 'clt_city', FILTER_SANITIZE_STRING);
      $clt_uf= filter_input(INPUT_POST, 'clt_uf', FILTER_SANITIZE_STRING);
      $clt_mail= filter_input(INPUT_POST, 'clt_mail', FILTER_SANITIZE_STRING);
      $clt_tel= filter_input(INPUT_POST, 'clt_tel', FILTER_SANITIZE_STRING);
      $clt_ti= filter_input(INPUT_POST, 'clt_ti', FILTER_SANITIZE_STRING);
      $clt_adm= filter_input(INPUT_POST, 'clt_adm', FILTER_SANITIZE_STRING);
      $clt_mkt= filter_input(INPUT_POST, 'clt_mkt', FILTER_SANITIZE_STRING);
      $clt_sts= filter_input(INPUT_POST, 'clt_sts', FILTER_SANITIZE_STRING);

      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `clientes` SET `clt_nomer`=:clt_nomer, `clt_nomef`=:clt_nomef, `clt_cnpj`=:clt_cnpj, `clt_end`=:clt_end, `clt_city`=:clt_city, `clt_uf`=:clt_uf, `clt_mail`=:clt_mail, `clt_tel`=:clt_tel, `clt_sts`=:clt_sts, `clt_ti`=:clt_ti, `clt_adm`=:clt_adm, `clt_mkt`=:clt_mkt WHERE  `clt_id`=:clt_id;");
      $edt->bindParam(':clt_nomer', $clt_nomer);
      $edt->bindParam(':clt_nomef', $clt_nomef);
      $edt->bindParam(':clt_cnpj', $clt_cnpj);
      $edt->bindParam(':clt_end', $clt_end);
      $edt->bindParam(':clt_city', $clt_city);
      $edt->bindParam(':clt_uf', $clt_uf);
      $edt->bindParam(':clt_mail', $clt_mail);
      $edt->bindParam(':clt_tel', $clt_tel);
      $edt->bindParam(':clt_sts', $clt_sts);
      $edt->bindParam(':clt_ti', $clt_ti);
      $edt->bindParam(':clt_adm', $clt_adm);
      $edt->bindParam(':clt_mkt', $clt_mkt);
      $edt->bindParam(':clt_id', $clt_id);
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Cliente editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Cliente!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }
    }
    
    if ($action == "new_pessoa") {
      $pessoa_nom = filter_input(INPUT_POST, 'pessoa_nom', FILTER_SANITIZE_STRING);
      $pessoa_cargo = filter_input(INPUT_POST, 'pessoa_cargo', FILTER_SANITIZE_STRING);
      $pessoa_tel = filter_input(INPUT_POST, 'pessoa_tel', FILTER_SANITIZE_STRING);
      $pessoa_mail = filter_input(INPUT_POST, 'pessoa_mail', FILTER_SANITIZE_STRING);
      $pessoa_clt = filter_input(INPUT_POST, 'pessoa_clt', FILTER_SANITIZE_NUMBER_INT);      

      $pdo = ConnectionN3();
      $adc= $pdo->prepare("INSERT INTO `pessoas` (`pessoa_clt`,`pessoa_nom`,`pessoa_cargo`,`pessoa_tel`,`pessoa_mail`) VALUES (:pessoa_clt, :pessoa_nom, :pessoa_cargo, :pessoa_tel, :pessoa_mail);");
      $adc->bindParam(':pessoa_clt', $pessoa_clt);
      $adc->bindParam(':pessoa_nom', $pessoa_nom);
      $adc->bindParam(':pessoa_cargo', $pessoa_cargo);
      $adc->bindParam(':pessoa_tel', $pessoa_tel);
      $adc->bindParam(':pessoa_mail', $pessoa_mail);
      if($adc->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Pessoa de Contato cadastrada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Pessoa de contato!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    
    if ($action == "edt_pessoa") {
      $pessoa_nom = filter_input(INPUT_POST, 'pessoa_nom', FILTER_SANITIZE_STRING);
      $pessoa_cargo = filter_input(INPUT_POST, 'pessoa_cargo', FILTER_SANITIZE_STRING);
      $pessoa_tel = filter_input(INPUT_POST, 'pessoa_tel', FILTER_SANITIZE_STRING);
      $pessoa_mail = filter_input(INPUT_POST, 'pessoa_mail', FILTER_SANITIZE_STRING);
      $pessoa_sts = filter_input(INPUT_POST, 'pessoa_sts', FILTER_SANITIZE_NUMBER_INT);
      $pessoa_id = filter_input(INPUT_POST, 'pessoa_id', FILTER_SANITIZE_NUMBER_INT);      

      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `pessoas` SET `pessoa_nom`=:pessoa_nom,  `pessoa_cargo`=:pessoa_cargo, `pessoa_tel`=:pessoa_tel, `pessoa_mail`=:pessoa_mail, `pessoa_sts`=:pessoa_sts WHERE  `pessoa_id`=:pessoa_id;");
      $edt->bindParam(':pessoa_nom', $pessoa_nom);
      $edt->bindParam(':pessoa_cargo', $pessoa_cargo);
      $edt->bindParam(':pessoa_tel', $pessoa_tel);
      $edt->bindParam(':pessoa_mail', $pessoa_mail);
      $edt->bindParam(':pessoa_sts', $pessoa_sts);
      $edt->bindParam(':pessoa_id', $pessoa_id);      
      
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Pessoa de Contato editada com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao editar Pessoa de contato!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }
    
    if ($action == "new_local") {
      $local_clt = filter_input(INPUT_POST, 'local_clt', FILTER_SANITIZE_NUMBER_INT);  
      $local_nom = filter_input(INPUT_POST, 'local_nom', FILTER_SANITIZE_STRING);
      $local_end = filter_input(INPUT_POST, 'local_end', FILTER_SANITIZE_STRING);
      $local_city = filter_input(INPUT_POST, 'local_city', FILTER_SANITIZE_STRING);
      $local_uf = filter_input(INPUT_POST, 'local_uf', FILTER_SANITIZE_STRING); 

      $pdo = ConnectionN3();
      $adc_user= $pdo->prepare("INSERT INTO `locais` (`local_clt`, `local_nom`, `local_end`, `local_city`, `local_uf`, `local_sts`) VALUES (:local_clt, :local_nom, :local_end, :local_city, :local_uf, '1');");
      $adc_user->bindParam(':local_clt', $local_clt);
      $adc_user->bindParam(':local_nom', $local_nom);
      $adc_user->bindParam(':local_end', $local_end);
      $adc_user->bindParam(':local_city', $local_city);
      $adc_user->bindParam(':local_uf', $local_uf);
      if($adc_user->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Local de atendimento cadastrado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao cadastrar Local de atendimento!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    } 
    
    if ($action == "edt_local") {
      $local_nom = filter_input(INPUT_POST, 'local_nom', FILTER_SANITIZE_STRING);
      $local_end = filter_input(INPUT_POST, 'local_end', FILTER_SANITIZE_STRING);
      $local_city = filter_input(INPUT_POST, 'local_city', FILTER_SANITIZE_STRING);
      $local_uf = filter_input(INPUT_POST, 'local_uf', FILTER_SANITIZE_STRING);    
      $local_sts = filter_input(INPUT_POST, 'local_sts', FILTER_SANITIZE_STRING); 
      $local_id = filter_input(INPUT_POST, 'local_id', FILTER_SANITIZE_NUMBER_INT);      

      $pdo = ConnectionN3();
      $edt= $pdo->prepare("UPDATE `locais` SET `local_nom`=:local_nom, `local_end`=:local_end, `local_city`=:local_city, `local_uf`=:local_uf, `local_sts`=:local_sts WHERE `local_id`=:local_id;");
      $edt->bindParam(':local_nom', $local_nom);
      $edt->bindParam(':local_end', $local_end);
      $edt->bindParam(':local_city', $local_city);
      $edt->bindParam(':local_uf', $local_uf);
      $edt->bindParam(':local_sts', $local_sts);   
      $edt->bindParam(':local_id', $local_id);   
      
      if($edt->execute()){
        $mensagem = "<i class=\"fas fa-check\"></i> Local de atendimento editado com sucesso!";
        $mensagem_cor = "alert-success";
        $log = "true";
      }else{
        $mensagem = "<i class=\"fas fa-exclamation-triangle\"></i> Falha ao ceditar Local de atendimento!";
        $mensagem_cor = "alert-danger"; 
        $log = "false";
      }  
    }    
  }
}
?>
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico"> 
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/help.css">
    <script type="text/javascript" src="../js/valida_cnpj.js"></script>
    <title>Allterus</title>
  </head>
  <body>
<?php include_once("../all/loading.php"); ?>
<?php include_once("../all/header.php"); ?>
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-12 mt-2">
          <div class="card">
            <div class="card-header py-2">
              <div class="row">
                <div class="col-6 h6 pt-1"><i class="fas fa-user-tie"></i> Clientes Cadastrados </div>
                <div class="col-6 text-right">
                  <button type="button" class="btn btn-outline-primary btn-sm text-center text-dark" data-toggle="modal" data-target="#new_user"> <i class="fas fa-user-plus text-dark"></i> Adicionar Cliente </button>
                </div>
              </div>
            </div>
            <div class="card-body p-0">
                <table class="table table-hover table-striped table-sm">
                  <thead>
                    <tr>
                      <th></th>
                      <th>#ID</th>
                      <th>Serviços</th>                      
                      <th>Razão Social</th>
                      <th>Nome Comercial</th>
                      <th>Endereço</th>
                      <th>Telefone</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
<?php
$pdo = ConnectionN3();

$filterEmpresas = null;

if(isset($_SESSION['tipo']) && $_SESSION['tipo'] == 2 && isset($_SESSION['empresas']) && count($_SESSION['empresas']) > 0) {
  $filterEmpresas.= " clientes.clt_id IN (" . implode(',', $_SESSION['empresas']) . ")";
}

$sql = "SELECT clientes.* FROM clientes ";

if($filterEmpresas){
  $sql.= "WHERE " . $filterEmpresas;
}

$sql.= "ORDER BY clientes.clt_nomer ASC";
$show_eqp = $pdo->prepare($sql);

$show_eqp->execute();
while($row=$show_eqp->fetch(PDO::FETCH_ASSOC)){
  $clt_id=$row["clt_id"];
  $clt_nomer=$row["clt_nomer"];
  $clt_nomef=$row["clt_nomef"];
  $clt_city=$row["clt_city"];
  $clt_uf=$row["clt_uf"];
  $clt_tel=$row["clt_tel"];
  $clt_sts=$row["clt_sts"];
  $clt_ti=$row["clt_ti"];
  $clt_adm=$row["clt_adm"];
  $clt_mkt=$row["clt_mkt"];
?>
                    <tr>
                      <td>
                        <?php if($clt_sts==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?> 
                        <?php if($clt_sts==0){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                      </td>
                      <td>
                        #<?php echo str_pad($clt_id , 4 , '0' , STR_PAD_LEFT); ?>
                      </td>
                      <td class="text-center">
<?php if($clt_ti==1){  ?><i class="fas fa-microchip text-success px-1" title="TI"></i><?php } ?>
<?php if($clt_adm==1){ ?><i class="fas fa-chart-bar text-primary px-1" title="ADM"></i><?php } ?>
<?php if($clt_mkt==1){ ?><i class="fas fa-bullhorn text-danger px-1" title="MKT"></i><?php } ?>
                      </td>
                      <td>
                        <?php echo substr($clt_nomer, 0, 35); ?>
                      </td>
                      <td>
                        <?php echo $clt_nomef; ?>
                      </td>
                      <td>
                        <?php echo $clt_city; ?> - <?php echo $clt_uf; ?>
                      </td>
                      <td>
                        <?php echo $clt_tel; ?>
                      </td>
                      <td>
                        <button type="button" class="btn btn-outline-secondary btn-sm view_clt" id="<?php echo $row['clt_id']; ?>"> <i class="far fa-edit"></i> </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm view_contato" id="<?php echo $row['clt_id']; ?>"> <i class="fas fa-user-tag"></i> </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm view_local" id="<?php echo $row['clt_id']; ?>"> <i class="fas fa-map-marked-alt"></i> </button>
                      </td>
                    </tr>
<?php } ?>
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    </div>
<!-- -->
<div class="modal fade" id="new_user" tabindex="-1" role="dialog" aria-labelledby="new_user" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <form action="#" method="POST">
        <div class="modal-header">
          <h6 class="modal-title"><i class="fas fa-user-tie"></i> Cadastro de Cliente</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-12">
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Razão Social:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="far fa-user"></i></div>
                    </div> 
                    <input name="clt_nomer" placeholder="Razão Social" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Nome Comercial:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="far fa-user"></i></div>
                    </div> 
                    <input name="clt_nomef" placeholder="Nome Comercial" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">CNPJ:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-paste"></i></div>
                    </div> 
                    <input type="text" name="clt_cnpj" id="cnpj" onkeyup="FormataCnpj(this,event)" onblur="if(!validarCNPJ(this.value)){alert('O CNPJ informado é inválido'); this.value='';}" maxlength="18"  class="form-control" ng-model="cadastro.cnpj">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Endereço:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-route"></i></div>
                    </div> 
                    <input name="clt_end" type="text"  placeholder="Rua, Número, Bairro"  class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Cidade:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-map-marked-alt"></i></div>
                    </div> 
                    <input name="clt_city" type="text"  placeholder="Município"  class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Estado:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-globe-americas"></i></div>
                    </div> 
                      <select name="clt_uf" required="required" class="form-control">
                        <option></option>
                        <option value="AC">Acre</option>
                        <option value="AL">Alagoas</option>
                        <option value="AP">Amapá</option>
                        <option value="AM">Amazonas</option>
                        <option value="BA">Bahia</option>
                        <option value="CE">Ceará</option>
                        <option value="DF">Distrito Federal</option>
                        <option value="ES">Espírito Santo</option>
                        <option value="GO">Goiás</option>
                        <option value="MA">Maranhão</option>
                        <option value="MT">Mato Grosso</option>
                        <option value="MS">Mato Grosso do Sul</option>
                        <option value="MG">Minas Gerais</option>
                        <option value="PA">Pará</option>
                        <option value="PB">Paraíba</option>
                        <option value="PR">Paraná</option>
                        <option value="PE">Pernambuco</option>
                        <option value="PI">Piauí</option>
                        <option value="RJ">Rio de Janeiro</option>
                        <option value="RN">Rio Grande do Norte</option>
                        <option value="RS">Rio Grande do Sul</option>
                        <option value="RO">Rondônia</option>
                        <option value="RR">Roraima</option>
                        <option value="SC">Santa Catarina</option>
                        <option value="SP">São Paulo</option>
                        <option value="SE">Sergipe</option>
                        <option value="TO">Tocantins</option>
                      </select>
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">E-mail:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-at"></i></div>
                    </div> 
                    <input name="clt_mail" type="email" class="form-control" required="required">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Telefone:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-mobile-alt"></i></div>
                    </div> 
                    <input name="clt_tel" placeholder="(00)00000-0000" type="text" required="required" class="form-control">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">TI:</label> 
                <div class="col-2">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-microchip"></i></div>
                    </div> 
                    <select name="clt_ti" required="required" class="form-control">
                      <option></option>
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                </div>
                <label class="col-2 col-form-label text-right px-0">ADM:</label> 
                <div class="col-2">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-chart-bar"></i></div>
                    </div> 
                    <select name="clt_adm" required="required" class="form-control">
                      <option></option>
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                </div>
                <label class="col-2 col-form-label text-right px-0">MKT:</label> 
                <div class="col-2">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-bullhorn"></i></div>
                    </div> 
                    <select name="clt_mkt" required="required" class="form-control">
                      <option></option>
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>
      </div>
        <div class="modal-footer">
          <input type="hidden" name="action" value="new_clt">
          <input type="hidden" name="token" value="<?php echo $token;?>">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
          <button type="input" class="btn btn-primary">Salvar novo Cliente</button>
        </div>
      </form>
    </div>
  </div>
</div>
<!-- -->

<?php if (isset($mensagem)){ ?>
<div class="row pull-right" style="position:absolute; top: 65px; right:25px;">
  <div class="alert <?php echo $mensagem_cor; ?> alert-dismissible fade show" role="alert">
    <?php echo $mensagem; ?> 
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
</div>
<?php }?>
<?php include_once("../all/update_pass.php"); ?>
    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.min.js"></script>
<!--    <script src="../js/bootstrap.bundle.min.js"></script>    -->
<?php if (isset($mensagem)){ ?>
    <script>
      window.setTimeout(function() {
        $(".alert").alert('close');
      }, 4000); 
    </script>
<?php }?>
<!-- MODAL DE EDIÇÃO DE CLIENTE -->
<div class="modal fade" id="modalEdtClt" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
<?php if($m2_01==3){?>      
      <form method="POST" action="#">
<?php } ?>
        <div class="modal-header">
          <h6 class="modal-title" id="modalEdtCltLabel"><i class="fas fa-user-edit"></i> Edição de Cliente</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body p-0">
          <div class="row">
            <div class="col-md-12">        
              <span id="info_edt_clt"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Fechar</button>
          <input type="hidden" name="action" value="edt_clt">
          <input type="hidden" name="token" value="<?php echo $token;?>">
<?php if($m2_01==3){?>
          <button type="submit" class="btn btn-outline-danger">Editar</button>
<?php } ?>
        </div>
<?php if($m2_01==3){?>
      </form>
<?php } ?>
    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_clt', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('clt_edt.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_clt").html(retorna);
          $('#modalEdtClt').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->    
<!-- MODAL DE EDIÇÃO DE PESSOAS DE CONTATO -->
<div class="modal fade" id="modalEdtContato" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true" >
  <div class="modal-dialog modal-xl">
    <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="modalEdtContatoLabel"><i class="fas fa-user-tag"></i> Gestão de Pessoas de contato do cliente</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-12">        
              <span id="info_edt_contato"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Fechar</button>
        </div>

    </div>
  </div>
</div>
<script>
  $(document).ready(function(){
    $(document).on('click','.view_contato', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('contato.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_contato").html(retorna);
          $('#modalEdtContato').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->
<!-- MODAL DE EDIÇÃO DE LOCAL DE ATENDIMENTO -->
<div class="modal fade" id="modalEdtLocal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true" >
  <div class="modal-dialog modal-xl">
    <div class="modal-content">

        <div class="modal-header">
          <h6 class="modal-title" id="modalEdtLocalLabel"><i class="fas fa-map-marked-alt"></i> Gestão de Locais de atendimento</h6>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-12">        
              <span id="info_edt_local"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-info" data-dismiss="modal">Fechar</button>
        </div>

    </div>
  </div>
</div>
<!-- MODAL DE AJUDA PARA CADASTRO DE NOVO ATENDIMENTO -->    
<div class="modal right fade" id="Help" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">

      <div class="modal-header">
        <h6 class="modal-title" id="myModalLabel"><i class="far fa-question-circle text-danger"></i> Cadastro de Clientes</h6>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>

      <div class="modal-body">
        <p>Em construção...
        </p>
      </div>

    </div>
  </div>
</div>    
    
<script>
  $(document).ready(function(){
    $(document).on('click','.view_local', function(){
      var id = $(this).attr("id");
      if(id !== ''){
        var dados = {
          id: id
        };
        $.post('local.php', dados, function(retorna){
          //Carregar o conteúdo para o usuário
          $("#info_edt_local").html(retorna);
          $('#modalEdtLocal').modal('show'); 
        });
      }
    });
  });
</script>    
<!-- -->
  </body>
</html>