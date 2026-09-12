const encoder = new TextEncoder();

function field(id: string, value: string): string {
  const length = encoder.encode(value).length;
  if (length > 99) {
    throw new Error(`Campo PIX ${id} excede 99 bytes.`);
  }
  return `${id}${String(length).padStart(2, '0')}${value}`;
}

function ascii(value: string, maxLength: number, fallback: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
  return normalized || fallback;
}

function legacyCompatibleCrc16(payload: string): string {
  let result = 0xffff;
  const bytes = encoder.encode(`${payload}6304`);

  for (const byte of bytes) {
    result ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      const overflow = (result & 0x8000) !== 0;
      result = (result << 1) & 0xffff;
      if (overflow) result ^= 0x1021;
    }
  }

  return `6304${result.toString(16).toUpperCase().padStart(4, '0')}`;
}

export interface PixPayloadInput {
  pixKey: string;
  amount: number;
  beneficiaryName: string;
  transactionId?: string;
}

export function buildPixPayload(input: PixPayloadInput): string {
  const pixKey = input.pixKey.trim();
  if (!pixKey) throw new Error('Chave PIX não informada.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Valor PIX inválido.');
  }

  const beneficiary = ascii(input.beneficiaryName, 25, 'PAGAMENTO');
  const city = ascii('NIVEL3 TI', 15, 'NIVEL3 TI');
  const transactionId = ascii(input.transactionId ?? '***', 25, '***');
  const amount = input.amount.toFixed(2);

  let payload = field('00', '01');
  payload += field(
    '26',
    field('00', 'br.gov.bcb.pix') + field('01', pixKey),
  );
  payload += field('52', '0000');
  payload += field('53', '986');
  payload += field('54', amount);
  payload += field('58', 'BR');
  payload += field('59', beneficiary);
  payload += field('60', city);
  payload += field('62', field('05', transactionId));

  return payload + legacyCompatibleCrc16(payload);
}

export function createPixTransactionId(seed: number): string {
  return `RD${seed}${Date.now()}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
}
