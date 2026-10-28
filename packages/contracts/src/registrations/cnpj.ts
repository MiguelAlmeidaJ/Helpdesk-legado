/** Receita Federal: 12 alphanumeric positions and two numeric check digits (ASCII - 48). */
export function normalizeCnpj(value: string): string {
  return value.toUpperCase().replace(/[.\/\-\s]/g, '');
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  function digit(base: string): string {
    let sum = 0;
    for (let i = base.length - 1, weight = 2; i >= 0; i--, weight = weight === 9 ? 2 : weight + 1) {
      sum += (base.charCodeAt(i) - 48) * weight;
    }
    const remainder = sum % 11;
    return String(remainder < 2 ? 0 : 11 - remainder);
  }
  const first = digit(cnpj.slice(0, 12));
  return cnpj.slice(12) === first + digit(cnpj.slice(0, 12) + first);
}

/** Incremental mask for typing/paste; never converts the identifier to a number. */
export function formatCnpj(value: string): string {
  const raw = normalizeCnpj(value).replace(/[^A-Z0-9]/g, '').slice(0, 14);
  const parts = [raw.slice(0, 2), raw.slice(2, 5), raw.slice(5, 8), raw.slice(8, 12), raw.slice(12).replace(/\D/g, '')];
  return parts.reduce((result, part, index) => part ? result + ['', '.', '.', '/', '-'][index] + part : result, '');
}
