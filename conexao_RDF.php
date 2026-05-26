<?php
function connectionDBSOFT()
{
    // CONEXÃO DBSOFT
    $host = 'SERVER2';
    $port = 3050;
    $database = 'C:/DBSOFT/KM2.FDB';
    $user = 'SYSDBA';
    $password = 'masterkey';
    $charset = 'UTF8';

    $dsn = "firebird:dbname=$host/$port:$database;charset=$charset";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    return new PDO($dsn, $user, $password, $options);
}


function connectionWINTHOR()
{
    // CONEXÃO ORACLE
    $user_oracle = 'REIDOSFRIOS';
    $password_oracle = 'REIDOSFRIOS';
    $host_oracle = 'server';
    $port_oracle = 1521;
    $service_name_oracle = 'ORCL';

    $dsn_oracle = "oci:dbname=//{$host_oracle}:{$port_oracle}/{$service_name_oracle};charset=AL32UTF8";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_CASE               => PDO::CASE_LOWER // Converte nomes de colunas para minúsculas (muito útil em Oracle)
    ];

    return new PDO($dsn_oracle, $user_oracle, $password_oracle, $options);
}


function connectionRDF()
{
    // CONEXÃO RDF LOCALHOST N3
    $host    = 'localhost';
    $dbname  = 'rdf';
    $user    = 'root';
    $pass    = '';
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    return new PDO($dsn, $user, $pass, $options);
}

?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teste de Conexão com Bancos de Dados</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            background-color: #f4f4f4;
        }

        .container {
            max-width: 800px;
            margin: auto;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h1,
        h2 {
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }

        .status {
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-weight: bold;
        }

        .success {
            background-color: #e6ffed;
            border-left: 5px solid #28a745;
            color: #155724;
        }

        .error {
            background-color: #ffebee;
            border-left: 5px solid #dc3545;
            color: #721c24;
        }

        .info {
            font-style: italic;
            color: #555;
            font-size: 0.9em;
        }

        pre {
            background-color: #eee;
            padding: 10px;
            border-radius: 5px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Diagnóstico de Conexão com Bancos de Dados</h1>
        <p>Este script tentará se conectar a cada banco de dados configurado e reportar o status. Se uma conexão falhar, o script continuará para a próxima.</p>

        <hr>

        <h2>1. Firebird (DBSOFT)</h2>
        <?php
        try {
            $dbh = connectionDBSOFT();
            echo '<div class="status success">SUCESSO: Conexão com o Firebird estabelecida.</div>';

            // Teste de consulta real para garantir que a conexão está funcional
            $stmt = $dbh->query("SELECT rdb$get_context('SYSTEM', 'ENGINE_VERSION') as version FROM rdb$database");
            $result = $stmt->fetch();
            echo '<p class="info">Versão do Firebird: <strong>' . htmlspecialchars($result['version']) . '</strong></p>';
        } catch (PDOException $e) {
            echo '<div class="status error">FALHA: Não foi possível conectar ao Firebird.</div>';
            echo '<p>Mensagem de Erro:</p><pre>' . htmlspecialchars($e->getMessage()) . '</pre>';
        } finally {
            $dbh = null; // Fecha a conexão
        }
        ?>

        <hr>

        <h2>2. Oracle (WINTHOR)</h2>
        <?php
        try {
            $dbh = connectionWINTHOR();
            echo '<div class="status success">SUCESSO: Conexão com o Oracle estabelecida.</div>';

            // Teste de consulta real para garantir que a conexão está funcional
            $stmt = $dbh->query("SELECT banner FROM v\$version WHERE banner LIKE 'Oracle%'");
            $result = $stmt->fetch();
            echo '<p class="info">Versão do Oracle: <strong>' . htmlspecialchars($result['banner']) . '</strong></p>';
        } catch (PDOException $e) {
            echo '<div class="status error">FALHA: Não foi possível conectar ao Oracle.</div>';
            echo '<p>Mensagem de Erro:</p><pre>' . htmlspecialchars($e->getMessage()) . '</pre>';
            echo '<p class="info"><strong>Possível Causa:</strong> Verifique se o <strong>Oracle Instant Client</strong> está instalado e configurado corretamente no PATH do sistema e se a extensão <code>pdo_oci</code> está habilitada no php.ini.</p>';
        } finally {
            $dbh = null;
        }
        ?>

        <hr>

        <h2>3. MySQL (RDF)</h2>
        <?php
        try {
            $dbh = connectionRDF();
            echo '<div class="status success">SUCESSO: Conexão com o MySQL estabelecida.</div>';

            // Teste de consulta real para garantir que a conexão está funcional
            $stmt = $dbh->query("SELECT VERSION() as version");
            $result = $stmt->fetch();
            echo '<p class="info">Versão do MySQL: <strong>' . htmlspecialchars($result['version']) . '</strong></p>';
        } catch (PDOException $e) {
            echo '<div class="status error">FALHA: Não foi possível conectar ao MySQL.</div>';
            echo '<p>Mensagem de Erro:</p><pre>' . htmlspecialchars($e->getMessage()) . '</pre>';
        } finally {
            $dbh = null;
        }
        ?>

        <hr>
        <p><strong>Teste concluído.</strong></p>
    </div>
</body>

</html>