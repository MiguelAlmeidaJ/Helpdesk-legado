# 0044c6 — comandos nativos do atendimento Facility

> **Status após 0044c7:** Facility foi desativado como tipo de ticket. O
> `TicketFacilityController` e seus providers deixaram de ser registrados no
> `TicketsModule`, portanto as rotas abaixo não ficam expostas em runtime. Os
> arquivos do 0044c6 permanecem temporariamente no repositório apenas para uma
> remoção rastreável no corte de aposentadoria de Facility.

Este subcorte migra para a API Nest as escritas concentradas em
`atd_facility/atd.php`. A tabela legada `facility` continua sendo usada como
persistência durante a migração, mas a autoridade de autorização e de transição
passa a ser a API.

## Ações cobertas

| Ação PHP | API nativa |
| --- | --- |
| `atd_adc` | `POST /tickets/facilities` |
| `atd_edt` | `PATCH /tickets/facilities/:facilityId/classification` |
| `atd_new_inter` | `POST /tickets/facilities/:facilityId/interactions` |
| `atd_aceitar` | `PATCH /tickets/facilities/:facilityId/assignment` |
| `atd_espera` | `POST /tickets/facilities/:facilityId/hold` |
| `atd_retomar` | `POST /tickets/facilities/:facilityId/resume` |
| `atd_recusar` | `POST /tickets/facilities/:facilityId/reject` |
| `atd_finalizar` | `POST /tickets/facilities/:facilityId/finalize` |

## Regras preservadas

- abertura futura cria `facility.status = 0`; abertura atual/passada cria
  `status = 1`;
- reincidência usa o mesmo critério de cliente/categoria/subcategoria nos 30
  dias anteriores;
- abertura registra `inter_facility.inter_tipo = 1`;
- direcionamento inicial para outro técnico registra `inter_tipo = 4`;
- edição cobre os campos realmente alterados pelo `atd_edt`: tipo, categoria,
  subcategoria e nível;
- nova interação usa `inter_tipo = 7`;
- iniciar para o próprio usuário muda `1 -> 2` e registra `inter_tipo = 2`;
- direcionar mantém `status = 1` e registra `inter_tipo = 4`;
- espera exige status `2`, grava em `espera` e muda para `3`;
- retomada exige status `3`, encerra a espera ativa e muda para `2`;
- recusa/redirecionamento parte de status `2` e retorna para `1`;
- finalização grava descrição/data de fechamento e `status = 4`.

## Segurança e concorrência

As ações usam os grants nativos de Tickets:

- criação: `TicketsCreate`;
- classificação: `TicketsClassify`;
- iniciar/direcionar: `TicketsExecute`;
- espera/retomada: `TicketsHold`;
- recusa: `TicketsReject`;
- finalização: `TicketsClose`.

Escopo de cliente de usuários parceiros e escopo `Own` são conferidos novamente
no repositório antes da escrita. Transições de estado bloqueiam a linha de
`facility` com `FOR UPDATE`.

O `user_id` das interações vem sempre da sessão autenticada da API; nenhum
identificador de usuário enviado pela UI é aceito como ator.

Os catálogos já disponíveis em `/tickets/create/*` podem ser reutilizados pela
futura UI Facility; este patch não duplica endpoints `busca_*`.

## Fora deste subcorte

Ainda permanecem pendentes no bloco Facility:

- ativação automática de `facility.status = 0` em `atd_facility/home.php`;
- read model/lista/detalhe necessários ao cutover da UI Facility;
- `atd_facility/agenda.php`, que representa agenda de veículos e deve convergir
  para o domínio nativo `logistics`, não para um novo agregado Facility;
- cutover/redirect e remoção dos PHPs.

## Invariantes

1. Nenhum código novo chama PHP.
2. Nenhum código novo depende de `legacy/bridge/`.
3. Não existe datasource novo para Facility.
4. Toda escrita deste corte acontece no `nivel3` pela API Nest.
5. A futura UI Next não é boundary de autorização.
6. Os PHPs continuam executáveis até os gates de parity/cutover.

## Validação

```bash
git apply --check 0044c6-ticket-facility-commands.patch
git apply 0044c6-ticket-facility-commands.patch

git diff --check
pnpm typecheck
pnpm build

bash scripts/audit-ticket-family-legacy.sh --check
```
