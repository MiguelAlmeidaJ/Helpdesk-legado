<?php
session_start();
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  include_once("../all/token.php");
  $id = $_POST["id"];
?>
   <div class="row">
      <div class="col-md-7 p-1">
        <div class="card">
          <h6 class="card-header py-2">
            <i class="fas fa-user-tag"></i> Pessoas de Contato
          </h6>
          <div class="card-body p-0">
            <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>Email</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
<?php
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT pessoas.* FROM pessoas WHERE pessoas.pessoa_clt = '$id' ORDER BY pessoa_sts DESC, pessoa_nom ASC");
  $show->execute();
  $conta_pessoas = $show->rowCount();
  if($conta_pessoas>0){  
    while($row=$show->fetch(PDO::FETCH_ASSOC)){
    $pessoa_id=$row["pessoa_id"];
    $pessoa_nom=$row["pessoa_nom"];
    $pessoa_cargo=$row["pessoa_cargo"];
    $pessoa_tel=$row["pessoa_tel"];
    $pessoa_mail=$row["pessoa_mail"];
    $pessoa_sts=$row["pessoa_sts"];
?>
                    <tr>
                      <td>
                        <?php if($pessoa_sts==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?> 
                        <?php if($pessoa_sts==0){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                      </td>
                      <td>
                        <p class="m-0"><?php echo $pessoa_nom; ?> </p>
                        <p class="small m-0"><?php echo $pessoa_cargo; ?> </p>
                      </td>
                      <td>
                        <?php echo $pessoa_tel; ?>
                      </td>
                      <td>
                        <?php echo $pessoa_mail; ?>
                      </td>
                      <td>
<?php if($m2_02==3){ ?>
                      <a data-toggle="modal" href="#modalEdtPessoa<?php echo $pessoa_id; ?>" class="btn btn-outline-warning btn-sm"><i class="far fa-edit"></i></a>
                  <div class="modal fade" id="modalEdtPessoa<?php echo $pessoa_id; ?>">
                    <div class="modal-dialog">
                      <form method="POST" action="#">
                      <div class="modal-content">
                        <div class="modal-header">
                          <h6 class="modal-title" id="modalEdtContatoLabel"><i class="fas fa-user-tag"></i> Edição de dados da pessoa</h6>
                          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                          </button>
                        </div>
                        <div class="modal-body">
                          <div class="row">
                            <div class="col-md-12">                            
                              <div class="form-group row my-1">
                                <label class="col-2 col-form-label text-right px-0">Nome:</label> 
                                <div class="col-10">
                                  <div class="input-group">
                                    <div class="input-group-prepend">
                                      <div class="input-group-text"><i class="far fa-user"></i></div>
                                    </div> 
                                    <input name="pessoa_nom" value="<?php echo $pessoa_nom; ?>" type="text" class="form-control" required="required">
                                  </div>
                                </div>
                              </div>
                              <div class="form-group row my-1">
                                <label class="col-2 col-form-label text-right px-0">Cargo:</label> 
                                <div class="col-10">
                                  <div class="input-group">
                                    <div class="input-group-prepend">
                                      <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                                    </div> 
                                    <input name="pessoa_cargo" value="<?php echo $pessoa_cargo; ?>" type="text" class="form-control" required="required">
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
                                    <input name="pessoa_mail" type="email" value="<?php echo $pessoa_mail; ?>" class="form-control" required="required">
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
                                    <input name="pessoa_tel" value="<?php echo $pessoa_tel; ?>" type="text" required="required" class="form-control">
                                  </div>
                                </div>
                              </div>            

                              <div class="form-group row my-1">
                                <label class="col-2 col-form-label text-right">Status:</label> 
                                <div class="col-10">
                                  <div class="input-group">
                                    <div class="input-group-prepend">
                                      <div class="input-group-text"><i class="fas fa-toggle-on"></i></div>
                                    </div> 
                                    <select name="pessoa_sts" required="required" class="form-control">
                                      <option value="1" <?php if($pessoa_sts==1){echo "selected";} ?>>Ativo</option>
                                      <option value="0" <?php if($pessoa_sts==0){echo "selected";} ?>>Inativo</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="modal-footer">
                          <input type="hidden" name="pessoa_id" value="<?php echo $pessoa_id; ?>">
                          <input type="hidden" name="action" value="edt_pessoa">
                          <input type="hidden" name="token" value="<?php echo $token;?>">
                          <button type="submit" class="btn btn-outline-danger btn-sm">Editar</button>                            
                        </div>
                      </div>
                      </form>
                    </div>
                  </div>        
<?php } ?>
                      </td>
                    </tr>

<?php } ?>
<?php } else { ?>
                    <tr>
                      <td colspan="5">
                        Cliente sem pessoa de contato cadastrada.
                      </td>
                    </tr>
<?php } ?>                
                  </tbody>
                </table>
          </div>
        </div>
      </div>
<?php if($m2_02>1){ ?>     
      <div class="col-md-5 p-1">
        <div class="card">
          <h6 class="card-header py-2">
            <i class="fas fa-user-plus"></i> Novo Contato
          </h6>
          <form method="POST" action="#">
            <div class="card-body">
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Nome:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="far fa-user"></i></div>
                    </div> 
                    <input name="pessoa_nom" placeholder="Nome Completo" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>
              <div class="form-group row my-1">
                <label class="col-2 col-form-label text-right px-0">Cargo:</label> 
                <div class="col-10">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-sitemap"></i></div>
                    </div> 
                    <input name="pessoa_cargo" type="text" class="form-control" required="required">
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
                    <input name="pessoa_mail" type="email" class="form-control" required="required">
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
                    <input name="pessoa_tel" placeholder="(00)00000-0000" type="text" required="required" class="form-control">
                  </div>
                </div>
              </div>          
            </div>
            <div class="modal-footer">
              <input type="hidden" name="pessoa_clt" value="<?php echo $id;?>">
              <input type="hidden" name="action" value="new_pessoa">
              <input type="hidden" name="token" value="<?php echo $token;?>">
              <button type="submit" class="btn btn-outline-danger btn-sm">Cadastrar</button>
            </div>
          </form>
        </div>
      </div>
<?php } ?>     
    </div>
<?php } ?>
