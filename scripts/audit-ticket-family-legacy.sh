#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "erro: execute dentro do repositorio da aplicacao" >&2
  exit 2
fi
cd "$ROOT"

MODE="${1:---check}"
case "$MODE" in
  --write|--check|--stdout) ;;
  *)
    echo "uso: $0 [--write|--check|--stdout]" >&2
    exit 2
    ;;
esac

DOC="docs/tickets/LEGACY-TICKET-FAMILY-INVENTORY.md"
OVERRIDES="docs/tickets/LEGACY-TICKET-FAMILY-OVERRIDES.tsv"
BEGIN_MARKER='<!-- BEGIN GENERATED 0044A -->'
END_MARKER='<!-- END GENERATED 0044A -->'
MODULE_DIRS=(atd_3andar atd_facility atd_projeto atd_mkt melhorias)

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
FILES_TXT="$TMP_DIR/files.txt"
ROWS_TXT="$TMP_DIR/rows.txt"
GENERATED="$TMP_DIR/generated.md"
CALLER_INDEX="$TMP_DIR/callers.tsv"
: > "$FILES_TXT"
: > "$ROWS_TXT"
: > "$CALLER_INDEX"

for dir in "${MODULE_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    find "$dir" -type f -name '*.php' -print
  fi
done >> "$FILES_TXT"

# rel/ so entra quando o proprio arquivo demonstra acoplamento com atendimento.
if [[ -d rel ]]; then
  while IFS= read -r file; do
    if grep -Eiq \
      'tarefas(_terc_andar)?|inter_(tarefa|terc_andar)|atendiment|chamado|ticket|solicitante|atd_' \
      "$file"; then
      printf '%s\n' "$file" >> "$FILES_TXT"
    fi
  done < <(find rel -type f -name '*.php' -print)
fi

if [[ ! -f "$OVERRIDES" ]]; then
  echo "erro: arquivo de overrides ausente: $OVERRIDES" >&2
  exit 2
fi

valid_classification() {
  case "$1" in
    MIGRATE_READ|MIGRATE_WRITE|MIGRATE_UI|REPORT|BRIDGE_ONLY|REDIRECT|DEAD|UNKNOWN) return 0 ;;
    *) return 1 ;;
  esac
}

# Overrides tambem podem incluir um relatorio que a heuristica de rel/ nao capturou.
while IFS=$'\t' read -r override_path override_class _rest; do
  override_path="${override_path%$'\r'}"
  override_class="${override_class%$'\r'}"
  
  [[ -n "${override_path:-}" ]] || continue
  [[ "$override_path" == \#* ]] && continue
  if [[ "$override_path" != *.php ]]; then
    echo "erro: override 0044a deve apontar para PHP: $override_path" >&2
    exit 2
  fi
  if [[ ! -f "$override_path" ]]; then
    echo "erro: override 0044a aponta para arquivo ausente: $override_path" >&2
    exit 2
  fi
  if ! valid_classification "${override_class:-}"; then
    echo "erro: classificacao invalida em $OVERRIDES para $override_path: ${override_class:-<vazia>}" >&2
    exit 2
  fi
  printf '%s\n' "$override_path" >> "$FILES_TXT"
done < "$OVERRIDES"

LC_ALL=C sort -u "$FILES_TXT" -o "$FILES_TXT"

# Indexa referencias a PHP em uma unica passagem pelo Git. Fazer git grep para
# cada arquivo torna o inventario quadraticamente caro em repositorios legados.
{
  git grep -nE '[A-Za-z0-9_./-]+\.php' -- . 2>/dev/null || true
} | awk '
  {
    source=$0
    sub(/:[0-9]+:.*/, "", source)
    if (source ~ /^(docs|scripts|node_modules|vendor)\//) next

    text=$0
    sub(/^[^:]+:[0-9]+:/, "", text)
    while (match(text, /[A-Za-z0-9_.\/-]+\.php/)) {
      ref=substr(text, RSTART, RLENGTH)
      print ref "\t" source
      n=split(ref, parts, "/")
      print parts[n] "\t" source
      text=substr(text, RSTART + RLENGTH)
    }
  }
' | LC_ALL=C sort -u > "$CALLER_INDEX"

has_re() {
  local file="$1"
  local pattern="$2"
  grep -Eiq "$pattern" "$file"
}

join_unique() {
  awk 'NF && !seen[$0]++ { if (count++) printf ", "; printf "%s", $0 } END { if (count) printf "\n" }'
}

override_field() {
  local file="$1"
  local field="$2"
  awk -F '\t' -v path="$file" -v field="$field" '
    $0 !~ /^#/ && $1 == path { print $field; exit }
  ' "$OVERRIDES"
}

md_escape() {
  local value="${1:-}"
  value="${value//$'\r'/ }"
  value="${value//$'\n'/ }"
  value="${value//|/\\|}"
  printf '%s' "$value"
}

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    git hash-object "$file"
  fi
}

short_hash() {
  hash_file "$1" | cut -c1-12
}

sql_tables() {
  local file="$1"
  grep -Eio \
    '(from|join|update|into|delete[[:space:]]+from)[[:space:]]+[`"[]?[A-Za-z0-9_.]+' \
    "$file" 2>/dev/null \
    | sed -E 's/^(from|join|update|into|delete[[:space:]]+from)[[:space:]]+//I; s/[`"[]//g' \
    | head -20 \
    | join_unique \
    || true
}

connections() {
  local file="$1"
  grep -Eo 'Connection[A-Za-z0-9_]*[[:space:]]*\(' "$file" 2>/dev/null \
    | sed -E 's/[[:space:]]*\($//' \
    | head -20 \
    | join_unique \
    || true
}

php_refs() {
  local file="$1"
  local base
  base="$(basename "$file")"
  grep -Eo '[A-Za-z0-9_./-]+\.php' "$file" 2>/dev/null \
    | grep -Fvx "$base" \
    | head -12 \
    | join_unique \
    || true
}

known_callers() {
  local file="$1"
  local base
  base="$(basename "$file")"
  awk -F '\t' -v full="$file" -v base="$base" -v self="$file" '
    ($1 == full || $1 == base) && $2 != self { print $2 }
  ' "$CALLER_INDEX" \
    | LC_ALL=C sort -u \
    | head -8 \
    | join_unique \
    || true
}

classification_for() {
  local file="$1"
  local read="$2"
  local write="$3"
  local ui="$4"
  local bridge="$5"

  if [[ "$file" == rel/* ]] || [[ "$(basename "$file")" =~ ^rel_ ]]; then
    printf 'REPORT'
  elif [[ "$write" == yes ]]; then
    printf 'MIGRATE_WRITE'
  elif [[ "$ui" == yes ]]; then
    printf 'MIGRATE_UI'
  elif [[ "$read" == yes ]]; then
    printf 'MIGRATE_READ'
  elif [[ "$bridge" == yes ]]; then
    printf 'BRIDGE_ONLY'
  else
    printf 'UNKNOWN'
  fi
}

owner_for() {
  local file="$1"
  case "$file" in
    rel/*) printf 'tickets/reporting' ;;
    atd_mkt/*) printf 'tickets (nivel3)' ;;
    *) printf 'tickets' ;;
  esac
}

retirement_for() {
  local classification="$1"
  local ui="$2"
  case "$classification" in
    MIGRATE_WRITE)
      if [[ "$ui" == yes ]]; then
        printf 'native command + read parity + Next UI + cutover'
      else
        printf 'native command + parity + remove callers'
      fi
      ;;
    MIGRATE_UI) printf 'read/API parity + Next UI + cutover' ;;
    MIGRATE_READ) printf 'native read contract + caller cutover' ;;
    REPORT) printf 'domain report ownership + parity + cutover' ;;
    BRIDGE_ONLY) printf 'zero consumers, then remove bridge dependency' ;;
    REDIRECT) printf 'redirect/tombstone deployed + zero legacy callers' ;;
    DEAD) printf 'reachability evidence retained; safe to delete' ;;
    UNKNOWN) printf 'manual triage before retirement decision' ;;
    *) printf 'manual triage' ;;
  esac
}

count_total=0
count_read=0
count_write=0
count_ui=0
count_report=0
count_bridge_only=0
count_redirect=0
count_dead=0
count_unknown=0
count_overrides=0
count_bridge_refs=0
count_mkt=0
fingerprint_input="$TMP_DIR/fingerprint.txt"
: > "$fingerprint_input"

while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  ((count_total += 1))

  read_flag=no
  write_flag=no
  ui_flag=no
  session_flag=no
  bridge_flag=no
  mkt_flag=no

  has_re "$file" '\bSELECT\b' && read_flag=yes || true
  has_re "$file" '\b(INSERT|UPDATE|DELETE|REPLACE|CALL)[[:space:]]' && write_flag=yes || true
  has_re "$file" '<!doctype|<html|<form|<table|<script|<body' && ui_flag=yes || true
  has_re "$file" 'session_start[[:space:]]*\(|\$_SESSION' && session_flag=yes || true
  has_re "$file" 'legacy/bridge|Connection[A-Za-z0-9_]*[[:space:]]*\(' && bridge_flag=yes || true
  has_re "$file" 'ConnectionMkt[[:space:]]*\(' && mkt_flag=yes || true

  methods=()
  has_re "$file" '\$_GET|filter_input[[:space:]]*\([[:space:]]*INPUT_GET' && methods+=(GET) || true
  has_re "$file" '\$_POST|filter_input[[:space:]]*\([[:space:]]*INPUT_POST|php://input' && methods+=(POST) || true
  has_re "$file" '\$_FILES' && methods+=(FILES) || true
  if ((${#methods[@]} == 0)); then
    method_text='-'
  else
    method_text="$(printf '%s\n' "${methods[@]}" | join_unique)"
  fi

  request_surface=no
  if [[ "$method_text" != '-' ]] || [[ "$ui_flag" == yes ]] || has_re "$file" 'header[[:space:]]*\('; then
    request_surface=yes
  fi

  tables="$(sql_tables "$file")"
  conns="$(connections "$file")"
  refs="$(php_refs "$file")"
  callers="$(known_callers "$file")"
  class="$(classification_for "$file" "$read_flag" "$write_flag" "$ui_flag" "$bridge_flag")"
  owner="$(owner_for "$file")"
  prereq="$(retirement_for "$class" "$ui_flag")"
  decision_source=auto
  manual_note=-

  override_class="$(override_field "$file" 2)"
  if [[ -n "$override_class" ]]; then
    valid_classification "$override_class" || {
      echo "erro: classificacao override invalida para $file: $override_class" >&2
      exit 2
    }
    class="$override_class"
    override_owner="$(override_field "$file" 3)"
    override_prereq="$(override_field "$file" 4)"
    override_note="$(override_field "$file" 5)"
    [[ -n "$override_owner" ]] && owner="$override_owner"
    [[ -n "$override_prereq" ]] && prereq="$override_prereq" || prereq="$(retirement_for "$class" "$ui_flag")"
    [[ -n "$override_note" ]] && manual_note="$override_note"
    decision_source=override
    ((count_overrides += 1))
  fi

  digest="$(short_hash "$file")"

  case "$class" in
    MIGRATE_READ) ((count_read += 1)) ;;
    MIGRATE_WRITE) ((count_write += 1)) ;;
    MIGRATE_UI) ((count_ui += 1)) ;;
    REPORT) ((count_report += 1)) ;;
    BRIDGE_ONLY) ((count_bridge_only += 1)) ;;
    REDIRECT) ((count_redirect += 1)) ;;
    DEAD) ((count_dead += 1)) ;;
    UNKNOWN) ((count_unknown += 1)) ;;
  esac
  [[ "$bridge_flag" == yes ]] && ((count_bridge_refs += 1)) || true
  [[ "$mkt_flag" == yes ]] && ((count_mkt += 1)) || true

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$file" "$digest" "$class" "$owner" "$prereq" "$manual_note" >> "$fingerprint_input"

  printf '| `%s` | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | `%s` |\n' \
    "$(md_escape "$file")" \
    "$request_surface" \
    "$(md_escape "$method_text")" \
    "$read_flag" \
    "$write_flag" \
    "$session_flag" \
    "$(md_escape "${conns:--}")" \
    "$(md_escape "${tables:--}")" \
    "$(md_escape "${refs:--}")" \
    "$(md_escape "${callers:--}")" \
    "$class / $(md_escape "$owner") / $(md_escape "$prereq")" \
    "$(md_escape "$decision_source: $manual_note")" \
    "$digest" \
    >> "$ROWS_TXT"
done < "$FILES_TXT"

if command -v sha256sum >/dev/null 2>&1; then
  inventory_fingerprint="$(sha256sum "$fingerprint_input" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  inventory_fingerprint="$(shasum -a 256 "$fingerprint_input" | awk '{print $1}')"
else
  inventory_fingerprint="$(git hash-object "$fingerprint_input")"
fi

cat > "$GENERATED" <<EOF_GENERATED
$BEGIN_MARKER

## Snapshot gerado

Fingerprint do inventario: \`$inventory_fingerprint\`.

| Metrica | Quantidade |
| --- | ---: |
| PHP no escopo | $count_total |
| MIGRATE_READ | $count_read |
| MIGRATE_WRITE | $count_write |
| MIGRATE_UI | $count_ui |
| REPORT | $count_report |
| BRIDGE_ONLY | $count_bridge_only |
| REDIRECT | $count_redirect |
| DEAD | $count_dead |
| UNKNOWN | $count_unknown |
| classificacoes com override manual | $count_overrides |
| arquivos com dependencia de bridge/conexao legada | $count_bridge_refs |
| arquivos com \`ConnectionMkt()\` | $count_mkt |

### Inventario por arquivo

| Caminho | superficie HTTP? | metodos | SELECT | escrita SQL | sessao | conexoes | tabelas detectadas | referencias PHP | callers conhecidos | classificacao / owner / pre-requisito | decisao | hash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
EOF_GENERATED
cat "$ROWS_TXT" >> "$GENERATED"
cat >> "$GENERATED" <<EOF_GENERATED

### Invariantes observaveis

- \`ConnectionMkt()\` e apenas um sinal de legado; nao autoriza criar datasource ou banco \`mkt\` no nativo.
- Arquivos em \`rel/\` entram neste snapshot apenas quando o conteudo demonstra acoplamento com Tickets/atendimento.
- \`DEAD\` e \`REDIRECT\` nunca sao inferidos automaticamente. Essas classes exigem prova de reachability/callers e decisao humana.
- \`UNKNOWN\` e gate de triagem: nenhum arquivo nessa classe pode ser removido sem classificacao manual.
- Este auditor nao altera PHP, nao cria regra no bridge e nao adiciona escrita legada.

$END_MARKER
EOF_GENERATED

if [[ "$MODE" == --stdout ]]; then
  cat "$GENERATED"
  exit 0
fi

if [[ ! -f "$DOC" ]]; then
  echo "erro: documento base ausente: $DOC" >&2
  exit 2
fi

replace_generated_block() {
  local source="$1"
  local replacement="$2"
  local output="$3"
  awk -v begin="$BEGIN_MARKER" -v end="$END_MARKER" -v repl="$replacement" '
    $0 == begin {
      while ((getline line < repl) > 0) print line
      close(repl)
      skipping=1
      next
    }
    skipping && $0 == end { skipping=0; next }
    !skipping { print }
  ' "$source" > "$output"
}

EXPECTED_DOC="$TMP_DIR/expected-doc.md"
replace_generated_block "$DOC" "$GENERATED" "$EXPECTED_DOC"

if [[ "$MODE" == --write ]]; then
  cp "$EXPECTED_DOC" "$DOC"
  echo "0044a: snapshot atualizado em $DOC"
  echo "0044a: PHP no escopo=$count_total; UNKNOWN=$count_unknown; ConnectionMkt=$count_mkt"
  exit 0
fi

if ! cmp -s "$DOC" "$EXPECTED_DOC"; then
  echo "0044a: inventario desatualizado" >&2
  echo "execute: bash scripts/audit-ticket-family-legacy.sh --write" >&2
  diff -u "$DOC" "$EXPECTED_DOC" || true
  exit 1
fi

if (( count_unknown > 0 )); then
  echo "0044a: snapshot esta atual, mas existem $count_unknown arquivo(s) UNKNOWN para triagem manual" >&2
  exit 1
fi

echo "0044a: inventario consistente ($count_total PHP; 0 UNKNOWN; $count_mkt ConnectionMkt)"
