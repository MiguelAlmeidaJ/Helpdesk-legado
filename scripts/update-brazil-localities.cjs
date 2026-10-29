// Manual update of the local IBGE reference catalog. No database changes.
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const base = 'https://servicodados.ibge.gov.br/api/v1/localidades';
  const get = async endpoint => {
    const response = await fetch(base + endpoint, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error('IBGE HTTP ' + response.status);
    return response.json();
  };
  const [states, municipalities] = await Promise.all([get('/estados?orderBy=nome'), get('/municipios?orderBy=nome')]);
  if (states.length !== 27 || municipalities.length < 5500) throw Error('Incomplete IBGE reference data');
  const data = states.map(state => ({ id: state.id, code: state.sigla, name: state.nome,
    municipalities: municipalities.filter(city => String(city.id).startsWith(String(state.id))).map(city => ({ id: city.id, name: city.nome })),
  }));
  if (data.some(state => !state.municipalities.length)) throw Error('Empty state catalog');
  await fs.writeFile(path.join(__dirname, '../apps/api/src/modules/quality/infrastructure/brazil-localities.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(JSON.stringify({ states: states.length, municipalities: municipalities.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
