# Limpeza arquitetural conservadora

## Removido com segurança

Foram removidos arquivos sem referência no código e com padrão claro de cópia, teste, backup local ou metadata de desenvolvimento:

- páginas soltas antigas/teste na raiz (`home_anterior.php`, `teste_*.php`, `reset_senha copy.php`);
- backup legado `atd_projeto/backup/projeto.php`;
- imagem antiga `img/logo_allterus_002-old.png`;
- metadata local `nbproject/`;
- repositório Git embutido de dependência `tcpdf/.git/`.

A antiga árvore PHP de logística também foi removida depois da migração dos
fluxos de despesas e agenda de veículos. A implementação mantida agora fica em:

- `apps/api/src/modules/logistics` para API, domínio e integrações;
- `apps/web/src/app/logistics` para as interfaces Next.

## Mantido propositalmente

Não foram removidos arquivos de upload, PDFs, APKs, bibliotecas ou páginas de
outros módulos legados ainda referenciadas. Cada raiz restante deve ser
aposentada somente depois de sua migração ou comprovação de que não possui
consumidores ativos.

## Pendências recomendadas

- Auditar módulos legados inteiros (`atd_facility`, `atd_mkt`, `melhorias`) antes de remover.
- Separar uploads e artefatos gerados para área fora do repositório/versionamento.
- Padronizar páginas duplicadas de usuário (`home1.php`, `home2.php`) depois de confirmar se ainda são acessadas.
- Manter a política de não versionar cópias com sufixos `copy`, `old` ou `backup`.
