# Limpeza arquitetural conservadora

## Removido com segurança

Foram removidos arquivos sem referência no código e com padrão claro de cópia, teste, backup local ou metadata de desenvolvimento:

- páginas soltas antigas/teste na raiz (`home_anterior.php`, `teste_*.php`, `reset_senha copy.php`);
- cópias antigas em `logistica/` com sufixos `copy`, `copy 2` e `old`;
- backup legado `atd_projeto/backup/projeto.php`;
- imagem antiga `img/logo_allterus_002-old.png`;
- metadata local `nbproject/`;
- repositório Git embutido de dependência `tcpdf/.git/`.

## Mantido propositalmente

Não foram removidos arquivos de upload, relatórios gerados, PDFs, APKs, bibliotecas (`tcpdf`, `vendor`, `wkhtmltopdf`) ou páginas legadas ainda referenciadas, para evitar quebra de fluxo em produção.

## Pendências recomendadas

- Auditar módulos legados inteiros (`atd_facility`, `atd_mkt`, `melhorias`) com usuários-chave antes de remover.
- Separar uploads e relatórios gerados para área fora do repositório/versionamento.
- Padronizar páginas duplicadas de usuário (`home1.php`, `home2.php`) depois de confirmar se ainda são acessadas.
- Criar política para não versionar cópias com sufixos `copy`, `old`, `backup`.
