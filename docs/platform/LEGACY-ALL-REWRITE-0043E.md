# 0043e — rewrite dos consumidores de `all/`

## Motivo

O gate adicionado em `0043d` encontrou 703 referências externas para os 14
shims históricos de `all/`, distribuídas em 168 arquivos de runtime. A cobertura
canônica em `legacy/bridge/` está completa.

Fazer essa troca como centenas de hunks manuais tornaria o corte sensível a
pequenas diferenças de contexto em módulos PHP ainda legados. `0043e` usa um
codemod versionado e determinístico para trocar apenas referências que o mesmo
resolvedor do audit reconhece como apontando para `all/*.php`.

## Comandos

Prévia, sem escrita:

```bash
pnpm legacy:all-rewrite
```

Aplicação explícita:

```bash
pnpm legacy:all-rewrite -- --write
```

Gate após a escrita:

```bash
pnpm legacy:all-audit -- --strict
```

## Regras do codemod

O writer:

- varre apenas arquivos de runtime rastreados pelo Git;
- ignora `all/` e `legacy/bridge/`;
- reconhece somente os 14 nomes históricos conhecidos;
- resolve cada literal em relação ao arquivo de origem antes de alterá-lo;
- preserva prefixos relativos como `../`, `../../`, `./` e `/../`;
- recusa a escrita se o bridge canônico correspondente estiver ausente;
- preserva o restante do conteúdo e os line endings do arquivo;
- reescaneia o repositório depois da escrita e falha se sobrar referência
  resolvível para `all/`.

## Encerramento

O codemod foi um utilitário de migração de uso único. Depois que a reescrita, o
strict audit, typecheck e build ficaram verdes, `0043f` aposentou fisicamente
`all/` e removeu o comando de rewrite. Este documento permanece apenas como
registro do corte mecânico.
