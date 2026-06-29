# Auditoria de permissionamento

## Escopo ajustado

- `all/permissoes.php` agora centraliza helpers seguros para leitura de permissao e bloqueio 403.
- Actions de atendimento foram protegidas no backend em `atd/atd.php` e `atd/atd_detalhe.php`.
- Upload/exclusao de anexos e imagens de atendimento exigem sessao valida, modulo de atendimento e permissao de executor responsavel ou gestor.
- Actions de projeto e tarefa foram protegidas no backend em `atd_projeto/projeto.php` e `atd_projeto/tarefa.php`.
- Edicao de usuario em `user/home.php` exige permissao cadastral; alteracao de matriz de acesso so e aplicada por quem tem permissao de nivel de acesso.

## Matriz aplicada

### Atendimento (`m3`)

- `m3_00`: acesso basico ao modulo e interacoes.
- `m3_01 >= 2`: cadastrar atendimento.
- `m3_01 >= 3` ou `m3_05 >= 2`: editar atendimento.
- `m3_02 >= 2` sendo tecnico responsavel, ou `m3_05 >= 2`: aceitar, retomar, concluir, finalizar, feedback, anexar e excluir anexos/imagens.
- `m3_03 >= 2` junto da regra de executor: colocar em espera.
- `m3_04 >= 2` ou `m3_05 >= 2`: recusar/redirecionar.

### Projetos e tarefas (`m5`)

- `m5_00`: acesso basico e interacoes.
- `m5_01 >= 2`: cadastrar projeto/tarefa.
- `m5_01 >= 3` ou `m5_05 >= 2`: editar projeto/tarefa e relacionar tarefas.
- `m5_02 >= 2` sendo tecnico responsavel, ou `m5_05 >= 2`: aceitar, retomar e finalizar.
- `m5_03 >= 2` junto da regra de executor: colocar em espera.
- `m5_04 >= 2` ou `m5_05 >= 2`: recusar/redirecionar.

### Usuarios (`m1`)

- `m1_02`: cadastrar usuario.
- `m1_03`: editar dados cadastrais e desativar usuario.
- `m1_04`: alterar matriz de permissao. Sem essa permissao, os modulos existentes sao preservados mesmo que venham campos adulterados no POST.

## Como testar

1. Entrar com usuario sem permissao de cadastro de atendimento e tentar POST direto com `action=atd_adc`.
2. Entrar com tecnico que nao e responsavel por um atendimento e tentar aceitar/finalizar/anexar/excluir anexo.
3. Entrar com gestor de atendimento (`m3_05 >= 2`) e confirmar que consegue executar as mesmas acoes.
4. Repetir o fluxo em projetos/tarefas com `m5_02`, `m5_03`, `m5_04` e `m5_05`.
5. Entrar com usuario que tem `m1_03`, mas nao `m1_04`, editar um usuario e confirmar que os dados cadastrais mudam sem alterar a matriz de permissoes.
