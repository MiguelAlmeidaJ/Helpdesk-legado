import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  LegacyModuleNumber,
  LegacyUserSession,
} from '../domain/legacy-user-session';

type PhpScalar = string | number | boolean | null;

const SESSION_ID_PATTERN = /^[A-Za-z0-9,-]{16,128}$/;

function parseDelimitedNumber(
  buffer: Buffer,
  offset: number,
): { value: string; next: number } | null {
  const end = buffer.indexOf(0x3b, offset);

  if (end === -1) {
    return null;
  }

  return {
    value: buffer.subarray(offset, end).toString('ascii'),
    next: end + 1,
  };
}

function parsePhpScalar(buffer: Buffer, offset: number): PhpScalar | undefined {
  const type = String.fromCharCode(buffer[offset] ?? 0);

  if (type === 'N' && buffer[offset + 1] === 0x3b) {
    return null;
  }

  if (buffer[offset + 1] !== 0x3a) {
    return undefined;
  }

  if (type === 'i' || type === 'b' || type === 'd') {
    const parsed = parseDelimitedNumber(buffer, offset + 2);

    if (!parsed) {
      return undefined;
    }

    if (type === 'i') {
      const value = Number.parseInt(parsed.value, 10);
      return Number.isFinite(value) ? value : undefined;
    }

    if (type === 'd') {
      const value = Number.parseFloat(parsed.value);
      return Number.isFinite(value) ? value : undefined;
    }

    return parsed.value === '1';
  }

  if (type !== 's') {
    return undefined;
  }

  const lengthEnd = buffer.indexOf(0x3a, offset + 2);

  if (lengthEnd === -1) {
    return undefined;
  }

  const byteLength = Number.parseInt(
    buffer.subarray(offset + 2, lengthEnd).toString('ascii'),
    10,
  );

  if (!Number.isInteger(byteLength) || byteLength < 0) {
    return undefined;
  }

  const quoteOffset = lengthEnd + 1;

  if (buffer[quoteOffset] !== 0x22) {
    return undefined;
  }

  const valueOffset = quoteOffset + 1;
  const valueEnd = valueOffset + byteLength;

  if (
    valueEnd + 1 >= buffer.length ||
    buffer[valueEnd] !== 0x22 ||
    buffer[valueEnd + 1] !== 0x3b
  ) {
    return undefined;
  }

  return buffer.subarray(valueOffset, valueEnd).toString('utf8');
}

function readSessionValue(
  buffer: Buffer,
  key: string,
): PhpScalar | undefined {
  const marker = Buffer.from(`${key}|`, 'ascii');
  let searchOffset = 0;

  while (searchOffset < buffer.length) {
    const markerOffset = buffer.indexOf(marker, searchOffset);

    if (markerOffset === -1) {
      return undefined;
    }

    const previous = markerOffset === 0 ? null : buffer[markerOffset - 1];

    if (previous === null || previous === 0x3b || previous === 0x7d) {
      return parsePhpScalar(buffer, markerOffset + marker.length);
    }

    searchOffset = markerOffset + marker.length;
  }

  return undefined;
}

function integerValue(value: PhpScalar | undefined): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  return null;
}

function stringValue(value: PhpScalar | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return null;
}

@Injectable()
export class LegacyPhpSessionRepository {
  constructor(private readonly config: ConfigService) {}

  async findBySessionId(sessionId: string): Promise<LegacyUserSession | null> {
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      return null;
    }

    const sessionPath = this.resolveSessionPath();
    const filePath = path.join(sessionPath, `sess_${sessionId}`);

    let buffer: Buffer;

    try {
      buffer = await readFile(filePath);
    } catch {
      return null;
    }

    const id = integerValue(readSessionValue(buffer, 'allterusN3Id'));
    const name = stringValue(readSessionValue(buffer, 'allterusN3Nome'));
    const login = stringValue(readSessionValue(buffer, 'allterusN3Login'));

    if (id === null || !name || !login) {
      return null;
    }

    const modules = {} as Record<LegacyModuleNumber, string>;

    for (let moduleNumber = 1; moduleNumber <= 9; moduleNumber += 1) {
      const typedModuleNumber = moduleNumber as LegacyModuleNumber;
      const moduleValue = stringValue(
        readSessionValue(buffer, `allterusN3Modulo${moduleNumber}`),
      );

      if (!moduleValue) {
        return null;
      }

      modules[typedModuleNumber] = moduleValue;
    }

    return {
      id,
      name,
      login,
      functionId: integerValue(readSessionValue(buffer, 'allterusN3func')),
      modules,
    };
  }

  private resolveSessionPath(): string {
    const configured =
      this.config.get<string>('LEGACY_SESSION_PATH')?.trim() ||
      './storage/sessions';

    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
}
