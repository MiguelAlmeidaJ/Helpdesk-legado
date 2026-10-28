# CNPJ no cadastro de clientes

O campo aceita CNPJ numérico e alfanumérico, converte letras para maiúsculas e aplica a máscara `AA.AAA.AAA/AAAA-00`. As 12 primeiras posições aceitam A–Z e 0–9; as duas últimas são numéricas. A consulta e a gravação conferem os dígitos verificadores pelo módulo 11, usando o valor ASCII menos 48. O CNPJ continua sendo texto, preservando zeros à esquerda.

O botão **Buscar CNPJ** consulta a API pública Minha Receita pelo backend autenticado (`GET /api/registrations/clients/cnpj-lookup?cnpj=...`). Requer permissão de criar ou editar clientes. Não utiliza chave nem nova variável de ambiente; o servidor precisa de saída HTTPS para `minhareceita.org`. As consultas têm limite de oito segundos e cache de sucesso de cinco minutos, limitado a 100 entradas por processo. Não há gravação de cliente durante a consulta.

São preenchidos razão social, nome comercial, endereço, cidade, UF, e-mail e telefone disponíveis. Sem nome fantasia, usa-se a razão social. Dados vazios não apagam campos já preenchidos, e alterações manuais feitas enquanto a busca está em andamento são preservadas. Os dados respeitam os tamanhos existentes das colunas. Serviços contratados e situação interna não são alterados. O usuário revisa e salva o cadastro explicitamente.

Uma busca cancelada ou cujo CNPJ foi alterado não preenche outro cadastro. Empresa não encontrada, indisponibilidade, limite do provedor, tempo esgotado ou resposta incompatível produzem aviso e permitem preenchimento manual. Disponibilidade e atualização cadastral dependem da base pública consultada.

A busca na lista de clientes também considera CNPJ sem pontuação e letras maiúsculas/minúsculas. Nenhum cadastro existente é migrado ou modificado automaticamente. Novas gravações com CNPJ preenchido exigem formato e dígitos válidos; vazio continua permitido.

Validação: `pnpm build`, `pnpm test:cnpj` e `pnpm test:cnpj:ui`. Os testes de gravação e de navegador usam apenas dados simulados.

Em 28/10/2026, o build e os quatro testes de CNPJ passaram. O navegador validou máscara numérica/alfanumérica, preenchimento, preservação de e-mail e serviços, edição manual durante consulta, falha do provedor e envio do formulário. A consulta pública real retornou os dados esperados para o CNPJ numérico de exemplo, e a busca foi executada no SQL Server sem gravações reais.

Referências: [manual oficial dos dígitos verificadores da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf) e [documentação da API Minha Receita](https://docs.minhareceita.org/).
