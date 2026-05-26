<?php
$user_id = $_SESSION['allterusN3Id'];
$user_nome = $_SESSION['allterusN3Nome'];
$user_login = $_SESSION['allterusN3Login'];
$user_funcao = $_SESSION['allterusN3func'];
$user_modulo_01 = $_SESSION['allterusN3Modulo1']; 
$user_modulo_02 = $_SESSION['allterusN3Modulo2'];
$user_modulo_03 = $_SESSION['allterusN3Modulo3'];
$user_modulo_04 = $_SESSION['allterusN3Modulo4'];
$user_modulo_05 = $_SESSION['allterusN3Modulo5'];
$user_modulo_06 = $_SESSION['allterusN3Modulo6'];
$user_modulo_07 = $_SESSION['allterusN3Modulo7'];
$user_modulo_08 = $_SESSION['allterusN3Modulo8'];
$user_modulo_09 = $_SESSION['allterusN3Modulo9'];
     

if(!isset($user_id)){
    session_start();
}
if(!isset($user_id)){
    header("Location: ../index.php");
    die();
}

//GESTÃO DE USUÁRIO
$m1_00 = $user_modulo_01[0]; //ACESSAR MÓDULO USUÁRIOS (0: Desabilitado; 1:Habilitado)
$m1_01 = $user_modulo_01[1]; //VISUALIZAR USUÁRIOS (0: Desabilitado; 1:Habilitado)
$m1_02 = $user_modulo_01[2]; //CADASTRRA NOVO USUÁRIO (0: Desabilitado; 1:Habilitado)
$m1_03 = $user_modulo_01[3]; //EDITAR INFORMAÇÕES CADASTRAIS (0: Desabilitado; 1:Habilitado)
$m1_04 = $user_modulo_01[4]; //EDITAR NIVEL DE ACESSO (0: Desabilitado; 1:Habilitado)

//CADASTROS
$m2_00 = $user_modulo_02[0]; //ACESSAR MÓDULO CADASTROS (0: Desabilitado; 1:Habilitado)
$m2_01 = $user_modulo_02[1]; //CADASTRO DE CLIENTES (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_02 = $user_modulo_02[2]; //CADASTRO DE PESSOAS DE CONTATOS DO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_03 = $user_modulo_02[3]; //CADASTRO DE LOCAIS DE ATENDIMENTO AO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_04 = $user_modulo_02[4]; //CADASTRO DE CATEGORIA (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_05 = $user_modulo_02[5]; //CADASTRO DE SUBCATEGORIA (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_06 = $user_modulo_02[6]; //CADASTRO DE ITEM (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)

//ATENDIMENTOS
$m3_00 = $user_modulo_03[0]; //ACESSAR MÓDULO ATENDIMENTO (0: Desabilitado; 1:Habilitado)
$m3_01 = $user_modulo_03[1]; //CADASTRO DE ATENDIMENTOS (0: Desabilitado; 2:Cadastro; 3:cadastro, edição e edição da classificação da tarefa)
$m3_02 = $user_modulo_03[2]; //EXECUTAR ATENDIMENTOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m3_03 = $user_modulo_03[3]; //COLOCAR ATENDIMENTO EM ESPERA (0:Sem acesso; 2:Permitido)
$m3_04 = $user_modulo_03[4]; //RECUSRAR ATENDIMENTO (0:Sem acesso; 2:Permitido)
$m3_05 = $user_modulo_03[5]; //EDITAR ATENDIMENTOS DE TERCEIROS (0:Sem acesso; 2:Permitido)
$m3_06 = $user_modulo_03[6]; //ACESSAR MÓDULO radio

//CONFIGURAÇÃO
$m4_00 = $user_modulo_04[0]; //ACESSAR MÓDULO CONFIGURAÇÃO (0: Desabilitado; 1:Habilitado)
$m4_01 = $user_modulo_04[1]; //EDIÇÃO TEMPO DE ALERTA (0: Desabilitado; 3:Edição)
$m4_02 = $user_modulo_04[2]; //EDIÇÃO TEMPO DE SLA DE ATENDIMENTO (0: Desabilitado; 3:Edição)

//Projetos
$m5_00 = $user_modulo_05[0]; //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m5_01 = $user_modulo_05[1]; //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m5_02 = $user_modulo_05[2]; //EXECUTAR PROJETOS(0:Sem acesso; 2:Aceitar + Finalizar)
$m5_03 = $user_modulo_05[3]; //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m5_04 = $user_modulo_05[4]; //RECUSRAR PROJETOS (0:Sem acesso; 2:Permitido)
$m5_05 = $user_modulo_05[5]; //EDITAR PROJETOS DE TERCEIROS (0:Sem acesso; 2:Permitido)

//Facility
$m6_00 = $user_modulo_06[0]; //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m6_01 = $user_modulo_06[1]; //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m6_02 = $user_modulo_06[2]; //EXECUTAR PROJETOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m6_03 = $user_modulo_06[3]; //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m6_04 = $user_modulo_06[4]; //RECUSRAR PROJETOS (0:Sem acesso; 2:Permitido)
$m6_05 = $user_modulo_06[5]; //EDITAR PROJETOSATENDIMENTOS DE TERCEIROS (0:Sem acesso; 2:Permitido)

//CADASTROS
$m7_00 = $user_modulo_07[0]; //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m7_01 = $user_modulo_07[1]; //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m7_02 = $user_modulo_07[2]; //EXECUTAR PROJETOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m7_03 = $user_modulo_07[3]; //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m7_04 = $user_modulo_07[4]; //RECUSRAR PROJETOS (0:Sem acesso; 2:Permitido)
$m7_05 = $user_modulo_07[5]; //EDITAR PROJETOSATENDIMENTOS DE TERCEIROS (0:Sem acesso; 2:Permitido)

//Marketing
$m8_00 = $user_modulo_08[0]; //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m8_01 = $user_modulo_08[1]; //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m8_02 = $user_modulo_08[2]; //EXECUTAR PROJETOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m8_03 = $user_modulo_08[3]; //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m8_04 = $user_modulo_08[4]; //TER ACESSO AOS CATALOGOS (0:Sem acesso; 1:TI - Apenas visualizar; 2:TI - visualizar e editar, 3:DevOps - Apenas visualizar, 4:DevOps - visualizar e editar, 5:Todos - Apenas visualizar, 6:Todos - visualizar e editar)
$m8_05 = $user_modulo_08[5]; //


//VEICULOS
$m9_00 = $user_modulo_09[0]; //ACESSAR MÓDULO AGENDA (0: Desabilitado; 1:Habilitado)
$m9_01 = $user_modulo_09[1]; //CADASTRO DE AGENDA (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m9_02 = $user_modulo_09[2]; //EXECUTAR AGENDA (0:Sem acesso; 2:Aceitar + Finalizar)
$m9_03 = $user_modulo_09[3]; //COLOCAR AGENDA EM ESPERA (0:Sem acesso; 2:Permitido)
$m9_04 = $user_modulo_09[4]; 
$m9_05 = $user_modulo_09[5]; 
$m9_06 = $user_modulo_09[6]; 
$m9_07 = $user_modulo_09[7]; 
$m9_08 = $user_modulo_09[8]; 
$m9_09 = $user_modulo_09[9]; //Contabilidade




?>