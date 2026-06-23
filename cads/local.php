<?php
session_start();
include_once("../all/permissoes.php");
if(isset($_POST["id"])){
  include_once("../all/conect.php");
  include_once("../all/token.php");
  $id = filter_input(INPUT_POST, 'id', FILTER_SANITIZE_NUMBER_INT);

  function h($value)
  {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
  }
?>
   <div class="row">
      <div class="col-md-7 p-1">
        <div class="card">
          <h6 class="card-header py-2">
            <i class="fas fa-map-marked-alt"></i> Locais de Atendimento
          </h6>
          <div class="card-body p-0">
            <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Local</th>
                      <th>Endereço</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
<?php
  $pdo = ConnectionN3();
  $show = $pdo->prepare("SELECT locais.* FROM locais WHERE locais.local_clt = :id ORDER BY local_sts DESC, local_nom ASC");
  $show->bindParam(':id', $id, PDO::PARAM_INT);
  $show->execute();
  $conta_locais = $show->rowCount();
  if($conta_locais>0){  
    while($row=$show->fetch(PDO::FETCH_ASSOC)){
    $local_id=$row["local_id"];
    $local_nom=$row["local_nom"];
    $local_end=$row["local_end"];
    $local_city=$row["local_city"];
    $local_uf=$row["local_uf"];
    $local_sts=$row["local_sts"];
?>
                    <tr>
                      <td>
                        <?php if($local_sts==1){ ?><i class="fas fa-toggle-on text-primary" title="Ativo"></i><?php } ?> 
                        <?php if($local_sts==0){ ?><i class="fas fa-toggle-off text-muted" title="Inativo"></i><?php } ?>
                      </td>
                      <td>
                        <?php echo h($local_nom); ?>
                      </td>
                      <td>
                        <?php echo h($local_end); ?> - <?php echo h($local_city); ?> - <?php echo h($local_uf); ?>
                      </td>
                      <td>
<?php if($m2_03==3){ ?>                        
                      <a data-toggle="modal" href="#modalEdtLocal<?php echo h($local_id); ?>" class="btn btn-outline-warning btn-sm"><i class="far fa-edit"></i></a>
                  <div class="modal fade" id="modalEdtLocal<?php echo h($local_id); ?>">
                    <div class="modal-dialog">
                      <form method="POST" action="#">
                      <div class="modal-content">
                        <div class="modal-header">
                          <h6 class="modal-title" id="modalEdtContatoLabel"><i class="fas fa-map-marked-alt"></i> Edição de dados do local de atendimento</h6>
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
                                    <input name="local_nom" value="<?php echo h($local_nom); ?>" type="text" class="form-control" required="required">
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
                                    <input name="local_end" type="text"  value="<?php echo h($local_end); ?>" class="form-control" required="required">
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
                                    <input name="local_city" type="text"  value="<?php echo h($local_city); ?>"   class="form-control" required="required">
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
                                    <select name="local_uf" required="required" class="form-control">
                                    <option value="AC" <?php if($local_uf=="AC"){echo "selected";} ?>>Acre</option>
                                    <option value="AL" <?php if($local_uf=="AL"){echo "selected";} ?>>Alagoas</option>
                                    <option value="AP" <?php if($local_uf=="AP"){echo "selected";} ?>>Amapá</option>
                                    <option value="AM" <?php if($local_uf=="AM"){echo "selected";} ?>>Amazonas</option>
                                    <option value="BA" <?php if($local_uf=="BA"){echo "selected";} ?>>Bahia</option>
                                    <option value="CE" <?php if($local_uf=="CE"){echo "selected";} ?>>Ceará</option>
                                    <option value="DF" <?php if($local_uf=="DF"){echo "selected";} ?>>Distrito Federal</option>
                                    <option value="ES" <?php if($local_uf=="ES"){echo "selected";} ?>>Espírito Santo</option>
                                    <option value="GO" <?php if($local_uf=="GO"){echo "selected";} ?>>Goiás</option>
                                    <option value="MA" <?php if($local_uf=="MA"){echo "selected";} ?>>Maranhão</option>
                                    <option value="MT" <?php if($local_uf=="MT"){echo "selected";} ?>>Mato Grosso</option>
                                    <option value="MS" <?php if($local_uf=="MS"){echo "selected";} ?>>Mato Grosso do Sul</option>
                                    <option value="MG" <?php if($local_uf=="MG"){echo "selected";} ?>>Minas Gerais</option>
                                    <option value="PA" <?php if($local_uf=="PA"){echo "selected";} ?>>Pará</option>
                                    <option value="PB" <?php if($local_uf=="PB"){echo "selected";} ?>>Paraíba</option>
                                    <option value="PR" <?php if($local_uf=="PR"){echo "selected";} ?>>Paraná</option>
                                    <option value="PE" <?php if($local_uf=="PE"){echo "selected";} ?>>Pernambuco</option>
                                    <option value="PI" <?php if($local_uf=="PI"){echo "selected";} ?>>Piauí</option>
                                    <option value="RJ" <?php if($local_uf=="RJ"){echo "selected";} ?>>Rio de Janeiro</option>
                                    <option value="RN" <?php if($local_uf=="RN"){echo "selected";} ?>>Rio Grande do Norte</option>
                                    <option value="RS" <?php if($local_uf=="RS"){echo "selected";} ?>>Rio Grande do Sul</option>
                                    <option value="RO" <?php if($local_uf=="RO"){echo "selected";} ?>>Rondônia</option>
                                    <option value="RR" <?php if($local_uf=="RR"){echo "selected";} ?>>Roraima</option>
                                    <option value="SC" <?php if($local_uf=="SC"){echo "selected";} ?>>Santa Catarina</option>
                                    <option value="SP" <?php if($local_uf=="SP"){echo "selected";} ?>>São Paulo</option>
                                    <option value="SE" <?php if($local_uf=="SE"){echo "selected";} ?>>Sergipe</option>
                                    <option value="TO" <?php if($local_uf=="TO"){echo "selected";} ?>>Tocantins</option>                                    </select>
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
                                    <select name="local_sts" required="required" class="form-control">
                                      <option value="1" <?php if($local_sts==1){echo "selected";} ?>>Ativo</option>
                                      <option value="0" <?php if($local_sts==0){echo "selected";} ?>>Inativo</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="modal-footer">
                          <input type="hidden" name="local_id" value="<?php echo h($local_id); ?>">
                          <input type="hidden" name="action" value="edt_local">
                          <input type="hidden" name="token" value="<?php echo h($token);?>">
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
                        Cliente sem local de atendimento cadastrado.
                      </td>
                    </tr>
<?php } ?>
                  </tbody>
                </table>
          </div>
        </div>
      </div>
<?php if($m2_03==3){?>      
      <div class="col-md-5 p-1">
        <div class="card">
          <h6 class="card-header py-2">
            <i class="far fa-plus-square"></i> Novo Local
          </h6>
          <form method="POST" action="#">
            <div class="card-body">
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right px-0">Nome:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-tag"></i></div>
                    </div> 
                    <input name="local_nom" placeholder="Nome do local" type="text" class="form-control" required="required">
                  </div>
                </div>
              </div>

              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right">Endereço:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-route"></i></div>
                    </div> 
                    <input name="local_end" type="text" placeholder="Rua, Número, Bairro" class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right">Cidade:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-map-marked-alt"></i></div>
                    </div> 
                    <input name="local_city" type="text" placeholder="Município" class="form-control" required="required">
                  </div>
                </div>
              </div>
              
              <div class="form-group row my-1">
                <label class="col-3 col-form-label text-right">Estado:</label> 
                <div class="col-9">
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <div class="input-group-text"><i class="fas fa-globe-americas"></i></div>
                    </div> 
                    <select name="local_uf" required="required" class="form-control">
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
              
            </div>
            <div class="modal-footer">
              <input type="hidden" name="local_clt" value="<?php echo h($id);?>">
              <input type="hidden" name="action" value="new_local">
              <input type="hidden" name="token" value="<?php echo h($token);?>">
              <button type="submit" class="btn btn-outline-danger btn-sm">Cadastrar</button>
            </div>
          </form>
        </div>
      </div>
<?php } ?>     
    </div>
<?php } ?>
