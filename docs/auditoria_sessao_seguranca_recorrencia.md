# Auditoria de sessão, segurança e recorrência

## Sessão

- A sessão é iniciada individualmente nas páginas com `session_start()`.
- A autenticação depende das chaves `allterusN3Id`, `allterusN3Nome`, `allterusN3Login` e módulos `allterusN3Modulo1..9`.
- `all/seguranca.php` redireciona usuários sem sessão válida para `index.php`.
- `index.php` destrói a sessão ao abrir a tela de login e cria uma sessão nova.

### Pontos de atenção

- Não foi encontrado `session_regenerate_id(true)` após login; isso deixa risco de fixation de sessão.
- Não há política central de timeout por inatividade.
- Não há configuração central de cookie `HttpOnly`, `SameSite` e `Secure` no código; pode depender do `php.ini`.
- `all/seguranca.php` acessa índices de `$_SESSION` diretamente, o que pode gerar notices em PHP mais estrito.

## Token/CSRF

- `all/token.php` usa tabela `token` no banco e marca token como usado.
- O token atual é gerado com `md5(uniqid(''))`, que não é criptograficamente forte.
- Se o token não existir no banco, o código pode acessar `$exibe['valor']` sem validar retorno.
- Algumas APIs/AJAX usam apenas sessão/permissão e não token CSRF.

## Recorrência de atendimentos

- A recorrência é processada em `atd/lib/home_jobs.php`.
- Antes desta auditoria, o processamento dependia de alguém abrir/atualizar `atd/home.php` ou a API `atd/api/home_list.php`.
- O update usa condição `id`, `recorrente`, `vezes > 0` e `data_recorrencia`, o que já reduz duplicidade.
- Foi adicionado lock MySQL `GET_LOCK('n3ti_atd_recorrencias', 5)` para impedir execução simultânea.
- Foi adicionada validação com `try/catch` em `DateTime` para datas inválidas não derrubarem o job inteiro.
- Foi criado executor CLI `atd/jobs/run_home_jobs.php` para rodar via agendador do Windows/Linux.

## Comando recomendado em produção

Executar a cada 1 minuto no Agendador de Tarefas do Windows:

```bat
C:\xampp\php\php.exe C:\xampp\htdocs\N3TI\atd\jobs\run_home_jobs.php
```

Esse runner executa:

- ativação de atendimentos agendados vencidos;
- retorno automático de atendimentos em espera;
- abertura de atendimentos recorrentes vencidos.

## Próximas correções recomendadas

1. Adicionar `session_regenerate_id(true)` imediatamente após login válido.
2. Centralizar bootstrap de sessão com cookies `httponly`, `samesite=Lax/Strict` e `secure` quando HTTPS.
3. Criar timeout por inatividade, por exemplo 8 horas ou conforme política interna.
4. Migrar CSRF para `random_bytes()` em sessão, sem tabela global reaproveitável.
5. Revisar endpoints AJAX críticos para exigir método POST, token e autorização granular.
6. Criar índice no banco para recorrência, se ainda não existir: `(recorrente, data_recorrencia, vezes)`.
7. Monitorar logs de `Erro ao processar recorrencia` e saída do runner CLI.
