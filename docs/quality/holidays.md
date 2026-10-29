# Feriados anuais por localidade

O cadastro recebe `DD/MM`, nome, abrangência estadual/municipal, UF e, para feriados municipais, o código IBGE do município. Não recebe ano. A API valida a data (inclusive 29/02), a abrangência e a correspondência município/UF, e obtém o nome do município no catálogo interno. Nome e localidade são enviados como parâmetros SQL.

Cada feriado regional é armazenado uma única vez em `business_regional_holidays`, com dia e mês separados. O índice único de dia/mês/abrangência/UF/município impede duplicatas simultâneas. Uma tentativa repetida retorna 409, preservando o primeiro cadastro. Feriados na mesma data podem coexistir em localidades diferentes. A exclusão regional usa um endereço próprio para evitar confundir IDs com os feriados legados.

O calendário projeta as datas para o ano consultado, sem copiar registros. 29/02 aparece apenas em anos bissextos. O seletor permite consultar os próximos dez anos; `GET /api/quality/commemorative-dates?year=2036` também permite outros anos (1900–9998). Os feriados nacionais das projeções futuras são calculados, incluindo a Sexta-feira Santa; registros nacionais existentes são preservados. Datas legadas sem abrangência continuam identificadas como datas adicionais anuais.

O Plantão e suas permissões reconhecem os feriados regionais pela recorrência dia/mês. Foi preservada a regra corporativa existente: toda data cadastrada ativa o Plantão por 24 horas, independentemente da localidade. A abrangência identifica a data; não foi introduzida atribuição geográfica de escalas, usuários ou clientes.

## Localidades

Catálogo obtido em 29/10/2026 da [API de Localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades): 27 UFs e 5.571 municípios. A API serve apenas os municípios da UF selecionada. O frontend limpa o município ao trocar UF ou abrangência, cancela consultas antigas e oferece nova tentativa se o carregamento falhar. O uso normal não depende da disponibilidade do IBGE.

Atualização manual do catálogo: `node scripts/update-brazil-localities.cjs`; revisar a alteração e executar novo build antes da implantação.

## Implantação

1. Executar `pnpm build`.
2. Executar `pnpm holidays:bootstrap` antes de reiniciar a API. Também faz parte de `pnpm prod:bootstrap`.
3. Reiniciar API e web com o processo habitual do PM2.

O provisionamento cria apenas a tabela nova. Nenhuma data existente é inserida, renomeada ou removida. O erro 500 observado era uma colisão de chave primária causada pelo contador IDENTITY legado após a migração; o provisionamento compara o contador com o maior ID e só o avança se estiver atrasado, sob bloqueio transacional. Não reduz o contador nem altera IDs. O script pode ser executado novamente.

## Validação

- `pnpm test:holidays`: validações de entrada, vínculo município/UF, gravação no SQL Server, concorrência, datas futuras, ano bissexto, preservação de dados legados, exclusão regional e ativação do Plantão. Usa tabelas temporárias descartáveis, sem escrever em feriados reais.
- `pnpm test:holidays:ui`: cadastro estadual/municipal, máscara, payload sem ano, troca de UF, repetição no ano seguinte, exclusão, acesso somente leitura e celular. API simulada e navegador isolado.
- `pnpm build`: contratos, Prisma, NestJS e Next.js.

Validação concluída em 29/10/2026: build completo, testes SQL Server e navegador aprovados, além dos 6 testes de acesso e 4 de segurança. O teste do Plantão cobre também a concessão e a retirada de permissões em dia útil, com horário e escalas simulados. A consulta de RBAC usa conversão nativa `CAST(... AS time)` no SQL Server, corrigindo o uso legado de `TIME(...)`. A conferência somente leitura do banco real confirmou 20 feriados legados, contador IDENTITY consistente e zero cadastros regionais de teste. O provisionamento foi executado novamente com sucesso.

Capturas de teste: [computador](holidays-desktop.png) e [celular](holidays-mobile.png).
