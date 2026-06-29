# Checklist de produção e portabilidade

## Objetivo

Reduzir risco de o sistema funcionar no XAMPP local e falhar no servidor por caminhos absolutos, host fixo, permissões de escrita ou dependências externas.

## Ajustes aplicados

- `rel/gerar_pdf.php`
  - removido `C:\xampp\htdocs\N3TI` hardcoded;
  - removido `http://localhost/N3TI` hardcoded;
  - removido `exit` de debug que impedia a geração;
  - PDF temporário agora usa `sys_get_temp_dir()`;
  - URL do relatório é montada por `HTTP_HOST` + `SCRIPT_NAME`.

- `rel/auxPDF.php`
  - `wkhtmltopdf` agora procura `wkhtmltopdf.exe` no Windows e `wkhtmltopdf` no Linux/PATH.

- `rel/gerar_relatorio_pdf.php`
  - mesma compatibilidade Windows/Linux para `wkhtmltopdf`.

- `atd/add_arquivos.php`
  - upload usa caminho físico baseado em `__DIR__`;
  - mantém caminho salvo compatível (`../uploads/arquivo.ext`);
  - inclui `all/seguranca.php`;
  - sanitiza extensão e nome original;
  - remove arquivo físico se o insert no banco falhar.

- `atd/delete_document.php`
  - exclusão resolve caminho físico com base no projeto;
  - impede apagar arquivo fora de `uploads/`;
  - inclui `all/seguranca.php`.

- `atd/busca_img_docs.php`
  - inclui `all/seguranca.php`;
  - normaliza caminho web do anexo.

- `logistica/recebe_upload.php`
  - removida URL fixa `https://allterus.nivel3ti.com.br/n3ti/`;
  - URL pública agora é montada dinamicamente pelo host atual.

- `logistica/recebe_upload_financeiro.php`
  - removida URL fixa do domínio antigo;
  - URL pública agora é montada dinamicamente pelo host atual.

## Diretórios com escrita obrigatória

Essas pastas precisam existir e estar graváveis pelo usuário do servidor web:

- `uploads/`
  - anexos de atendimentos em `atd/add_arquivos.php`.

- `uploads_rd/`
  - notas de serviço e comprovantes diversos da logística;
  - subpastas criadas automaticamente por mês/ano.

- `uploads_financeiro/`
  - comprovantes de contas a pagar/receber;
  - pode não existir no ambiente local, mas será criada se a permissão da raiz permitir.

- `documentos/`
  - arquivos GED/contratos em `cont/contrato.php`.

- `rel/relatorios/`
  - PDFs gerados em lote por `rel/auxPDF.php` e listados em `rel/relatoriosPDF.php`.

- `sys_get_temp_dir()` do PHP
  - cache/temporários de PDF em `rel/gerar_pdf.php` e `rel/gerar_relatorio_pdf.php`.

## Dependências obrigatórias

- PHP com extensões usadas pelo sistema:
  - `pdo_mysql` ou driver usado em `all/conect.php`;
  - `json`;
  - `mbstring` recomendado;
  - `zip` para download em massa de relatórios;
  - `fileinfo` recomendado para validação futura de uploads;
  - `gd` se módulos de imagem/relatórios precisarem.

- `wkhtmltopdf`
  - Windows: pode usar `wkhtmltopdf/bin/wkhtmltopdf.exe` dentro do projeto.
  - Linux: instalar `wkhtmltopdf` no sistema e garantir que esteja no `PATH`, ou manter binário compatível em `wkhtmltopdf/bin/wkhtmltopdf`.

## Pontos que ainda exigem decisão antes do deploy

### Uploads dentro do código

Hoje arquivos de usuário ficam dentro da pasta do projeto:

- `uploads/`
- `uploads_rd/`
- `uploads_financeiro/`
- `documentos/`
- `rel/relatorios/`

Para produção, o ideal é mover esses diretórios para fora do diretório versionado e servir por configuração de storage/symlink. Se mantiver dentro do projeto, não sobrescrever essas pastas no deploy.

### URLs já salvas no banco

Alguns fluxos antigos podem ter salvo URLs absolutas no banco, principalmente logística/financeiro. Os novos uploads passam a usar host dinâmico, mas registros antigos podem continuar apontando para o domínio antigo.

### CDNs externos

Há páginas que carregam jQuery/Bootstrap/DataTables/Select2 por CDN. Se o servidor/cliente não tiver internet externa ou tiver CSP restritiva, essas telas podem falhar. Recomenda-se baixar assets e apontar para `css/` e `js/` locais aos poucos.

### Firebird/RDF

`conexao_RDF.php` ainda possui caminho local `C:/DBSOFT/KM2.FDB` e host `localhost`. Se esse módulo for usado em produção, precisa de configuração própria no servidor.

## Comandos de validação pós-deploy

Rodar no servidor:

```bat
php -v
php -m
php atd/jobs/run_home_jobs.php
```

Testar também:

- login/logout;
- abrir `atd/home.php`;
- abrir um atendimento e anexar/excluir arquivo;
- gerar relatório PDF individual e em massa;
- upload de nota/comprovante em logística;
- recorrência via agendador.

## Agendador obrigatório

Para recorrência e jobs automáticos, configurar a cada 1 minuto:

```bat
C:\xampp\php\php.exe C:\xampp\htdocs\N3TI\atd\jobs\run_home_jobs.php
```

Em Linux, adaptar para algo como:

```bash
* * * * * /usr/bin/php /var/www/N3TI/atd/jobs/run_home_jobs.php >> /var/log/n3ti_jobs.log 2>&1
```
