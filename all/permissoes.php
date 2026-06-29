<?php

if (!function_exists('n3_session_value')) {
    function n3_session_value(string $key, $default = '')
    {
        return $_SESSION[$key] ?? $default;
    }
}

if (!function_exists('n3_perm_char')) {
    function n3_perm_char($module, int $index, int $default = 0): int
    {
        $module = (string)$module;
        if ($index < 0 || $index >= strlen($module)) {
            return $default;
        }
        return (int)$module[$index];
    }
}

if (!function_exists('n3_forbidden')) {
    function n3_forbidden(string $message = 'Você não tem permissão para acessar este recurso.', int $statusCode = 403): void
    {
        http_response_code($statusCode);
        $isAjax = strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'xmlhttprequest'
            || stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

        if ($isAjax) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
        } else {
            $_SESSION['alert_message'] = ['type' => 'danger', 'text' => $message];
            $target = defined('N3_FORBIDDEN_REDIRECT') ? N3_FORBIDDEN_REDIRECT : '../home.php';
            header('Location: ' . $target);
        }
        exit;
    }
}

if (!function_exists('n3_require_min')) {
    function n3_require_min($value, int $min, string $message = 'Você não tem permissão para executar esta ação.'): void
    {
        if ((int)$value < $min) {
            n3_forbidden($message);
        }
    }
}

if (!function_exists('n3_can_atd_execute_owner_or_manager')) {
    function n3_can_atd_execute_owner_or_manager($tecnicoId = null): bool
    {
        global $m3_02, $m3_05, $user_id;
        if ((int)($m3_05 ?? 0) >= 2) {
            return true;
        }
        return (int)($m3_02 ?? 0) >= 2 && (int)$tecnicoId === (int)$user_id;
    }
}

if (!function_exists('n3_can_project_execute_owner_or_manager')) {
    function n3_can_project_execute_owner_or_manager($tecnicoId = null): bool
    {
        global $m5_02, $m5_05, $user_id;
        if ((int)($m5_05 ?? 0) >= 2) {
            return true;
        }
        return (int)($m5_02 ?? 0) >= 2 && (int)$tecnicoId === (int)$user_id;
    }
}

$user_id = n3_session_value('allterusN3Id');
$user_nome = n3_session_value('allterusN3Nome');
$user_login = n3_session_value('allterusN3Login');
$user_funcao = n3_session_value('allterusN3func');
$user_modulo_01 = n3_session_value('allterusN3Modulo1');
$user_modulo_02 = n3_session_value('allterusN3Modulo2');
$user_modulo_03 = n3_session_value('allterusN3Modulo3');
$user_modulo_04 = n3_session_value('allterusN3Modulo4');
$user_modulo_05 = n3_session_value('allterusN3Modulo5');
$user_modulo_06 = n3_session_value('allterusN3Modulo6');
$user_modulo_07 = n3_session_value('allterusN3Modulo7');
$user_modulo_08 = n3_session_value('allterusN3Modulo8');
$user_modulo_09 = n3_session_value('allterusN3Modulo9');
     

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
if ($user_id === '' || $user_id === null) {
    header("Location: ../index.php");
    die();
}

//GESTÃO DE USUÁRIO
$m1_00 = n3_perm_char($user_modulo_01, 0); //ACESSAR MÓDULO USUÁRIOS (0: Desabilitado; 1:Habilitado)
$m1_01 = n3_perm_char($user_modulo_01, 1); //VISUALIZAR USUÁRIOS (0: Desabilitado; 1:Habilitado)
$m1_02 = n3_perm_char($user_modulo_01, 2); //CADASTRRA NOVO USUÁRIO (0: Desabilitado; 1:Habilitado)
$m1_03 = n3_perm_char($user_modulo_01, 3); //EDITAR INFORMAÇÕES CADASTRAIS (0: Desabilitado; 1:Habilitado)
$m1_04 = n3_perm_char($user_modulo_01, 4); //EDITAR NIVEL DE ACESSO (0: Desabilitado; 1:Habilitado)

//CADASTROS
$m2_00 = n3_perm_char($user_modulo_02, 0); //ACESSAR MÓDULO CADASTROS (0: Desabilitado; 1:Habilitado)
$m2_01 = n3_perm_char($user_modulo_02, 1); //CADASTRO DE CLIENTES (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_02 = n3_perm_char($user_modulo_02, 2); //CADASTRO DE PESSOAS DE CONTATOS DO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_03 = n3_perm_char($user_modulo_02, 3); //CADASTRO DE LOCAIS DE ATENDIMENTO AO CLIENTE  (1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_04 = n3_perm_char($user_modulo_02, 4); //CADASTRO DE CATEGORIA (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_05 = n3_perm_char($user_modulo_02, 5); //CADASTRO DE SUBCATEGORIA (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)
$m2_06 = n3_perm_char($user_modulo_02, 6); //CADASTRO DE ITEM (0: Desabilitado; 1:leitura; 2:Leitura e Cadastro; 3:Leitura, cadastro e edição)

//ATENDIMENTOS
$m3_00 = n3_perm_char($user_modulo_03, 0); //ACESSAR MÓDULO ATENDIMENTO (0: Desabilitado; 1:Habilitado)
$m3_01 = n3_perm_char($user_modulo_03, 1); //CADASTRO DE ATENDIMENTOS (0: Desabilitado; 2:Cadastro; 3:cadastro, edição e edição da classificação da tarefa)
$m3_02 = n3_perm_char($user_modulo_03, 2); //EXECUTAR ATENDIMENTOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m3_03 = n3_perm_char($user_modulo_03, 3); //COLOCAR ATENDIMENTO EM ESPERA (0:Sem acesso; 2:Permitido)
$m3_04 = n3_perm_char($user_modulo_03, 4); //RECUSRAR ATENDIMENTO (0:Sem acesso; 2:Permitido)
$m3_05 = n3_perm_char($user_modulo_03, 5); //EDITAR ATENDIMENTOS DE TERCEIROS (0:Sem acesso; 2:Permitido)
$m3_06 = n3_perm_char($user_modulo_03, 6); //ACESSAR MÓDULO radio

//CONFIGURAÇÃO
$m4_00 = n3_perm_char($user_modulo_04, 0); //ACESSAR MÓDULO CONFIGURAÇÃO (0: Desabilitado; 1:Habilitado)
$m4_01 = n3_perm_char($user_modulo_04, 1); //EDIÇÃO TEMPO DE ALERTA (0: Desabilitado; 3:Edição)
$m4_02 = n3_perm_char($user_modulo_04, 2); //EDIÇÃO TEMPO DE SLA DE ATENDIMENTO (0: Desabilitado; 3:Edição)

//Projetos
$m5_00 = n3_perm_char($user_modulo_05, 0); //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m5_01 = n3_perm_char($user_modulo_05, 1); //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m5_02 = n3_perm_char($user_modulo_05, 2); //EXECUTAR PROJETOS(0:Sem acesso; 2:Aceitar + Finalizar)
$m5_03 = n3_perm_char($user_modulo_05, 3); //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m5_04 = n3_perm_char($user_modulo_05, 4); //RECUSRAR PROJETOS (0:Sem acesso; 2:Permitido)
$m5_05 = n3_perm_char($user_modulo_05, 5); //EDITAR PROJETOS DE TERCEIROS (0:Sem acesso; 2:Permitido)

//Facility
$m6_00 = n3_perm_char($user_modulo_06, 0); //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m6_01 = n3_perm_char($user_modulo_06, 1); //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m6_02 = n3_perm_char($user_modulo_06, 2); //EXECUTAR PROJETOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m6_03 = n3_perm_char($user_modulo_06, 3); //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m6_04 = n3_perm_char($user_modulo_06, 4); //RECUSRAR PROJETOS (0:Sem acesso; 2:Permitido)
$m6_05 = n3_perm_char($user_modulo_06, 5); //EDITAR PROJETOSATENDIMENTOS DE TERCEIROS (0:Sem acesso; 2:Permitido)

//CADASTROS
$m7_00 = n3_perm_char($user_modulo_07, 0); //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m7_01 = n3_perm_char($user_modulo_07, 1); //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m7_02 = n3_perm_char($user_modulo_07, 2); //EXECUTAR PROJETOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m7_03 = n3_perm_char($user_modulo_07, 3); //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m7_04 = n3_perm_char($user_modulo_07, 4); //RECUSRAR PROJETOS (0:Sem acesso; 2:Permitido)
$m7_05 = n3_perm_char($user_modulo_07, 5); //EDITAR PROJETOSATENDIMENTOS DE TERCEIROS (0:Sem acesso; 2:Permitido)

//Marketing
$m8_00 = n3_perm_char($user_modulo_08, 0); //ACESSAR MÓDULO PROJETOS (0: Desabilitado; 1:Habilitado)
$m8_01 = n3_perm_char($user_modulo_08, 1); //CADASTRO DE PROJETOS (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m8_02 = n3_perm_char($user_modulo_08, 2); //EXECUTAR PROJETOS (0:Sem acesso; 2:Aceitar + Finalizar)
$m8_03 = n3_perm_char($user_modulo_08, 3); //COLOCAR PROJETOS EM ESPERA (0:Sem acesso; 2:Permitido)
$m8_04 = n3_perm_char($user_modulo_08, 4); //TER ACESSO AOS CATALOGOS (0:Sem acesso; 1:TI - Apenas visualizar; 2:TI - visualizar e editar, 3:DevOps - Apenas visualizar, 4:DevOps - visualizar e editar, 5:Todos - Apenas visualizar, 6:Todos - visualizar e editar)
$m8_05 = n3_perm_char($user_modulo_08, 5); //


//VEICULOS
$m9_00 = n3_perm_char($user_modulo_09, 0); //ACESSAR MÓDULO AGENDA (0: Desabilitado; 1:Habilitado)
$m9_01 = n3_perm_char($user_modulo_09, 1); //CADASTRO DE AGENDA (0: Desabilitado; 2:Cadastro; 3:cadastro e edição)
$m9_02 = n3_perm_char($user_modulo_09, 2); //EXECUTAR AGENDA (0:Sem acesso; 2:Aceitar + Finalizar)
$m9_03 = n3_perm_char($user_modulo_09, 3); //COLOCAR AGENDA EM ESPERA (0:Sem acesso; 2:Permitido)
$m9_04 = n3_perm_char($user_modulo_09, 4); 
$m9_05 = n3_perm_char($user_modulo_09, 5); 
$m9_06 = n3_perm_char($user_modulo_09, 6); 
$m9_07 = n3_perm_char($user_modulo_09, 7); 
$m9_08 = n3_perm_char($user_modulo_09, 8); 
$m9_09 = n3_perm_char($user_modulo_09, 9); //Contabilidade




?>
