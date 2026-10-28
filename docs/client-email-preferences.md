# E-mails automáticos de chamados por cliente

O cadastro de clientes começa pelo CNPJ e contém a opção **Receber e-mails**, desmarcada por padrão. Quando habilitada, autoriza notificações automáticas de chamados para os e-mails da empresa e do solicitante/contato. Desabilitada, ambos ficam fora dos destinatários. Os avisos internos ao técnico continuam; um endereço de técnico que coincida com um destinatário externo bloqueado também é excluído.

A preferência é lida novamente ao processar cada evento da fila. Eventos pendentes, inclusive anteriores à alteração da opção, usam o valor atual. Sem destinatários internos ou externos autorizados, o evento é concluído sem envio. A lista também é filtrada novamente no mailer para impedir que uma lista fornecida pelo chamador contorne a preferência. Não se altera o envio de recuperação de senha ou avisos financeiros internos.

## Implantação

1. Executar `pnpm build`.
2. Executar `pnpm clients:bootstrap` antes de reiniciar os serviços novos.
3. Reiniciar `helpdesk-api`, `helpdesk-web` e `helpdesk-ticket-worker` com o `ecosystem.config.cjs`.

O provisionamento SQL Server é aditivo e idempotente: cria `clientes.clt_receber_email` como `bit NOT NULL DEFAULT(0) WITH VALUES`. Na primeira execução, clientes existentes ficam com a opção desmarcada, assim como novos clientes. Reexecuções preservam opções já configuradas. Não há exclusão de dados nem mudança nos endereços de e-mail. A opção não é ativada pelo preenchimento automático do CNPJ.

Teste: `pnpm test:client-emails`, `pnpm test:cnpj` e `pnpm test:cnpj:ui`. Os testes de entrega usam destinatários fictícios e não enviam e-mail real.

Validação local em 28/10/2026: build completo e 12 testes aprovados; navegador confirmou CNPJ em primeiro, frase removida, opção inicialmente desmarcada e envio da preferência marcada no formulário. O provisionamento foi executado duas vezes para conferir idempotência, mantendo os 197 clientes existentes desmarcados. A leitura da preferência no contexto de um chamado também foi validada sem chamar SMTP.
