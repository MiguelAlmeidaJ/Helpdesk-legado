import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MARKER_HEADER = 'x-helpdesk-request';
const MARKER_VALUE = 'browser';

type HeaderValue = string | string[] | undefined;

interface HttpRequestLike {
  method?: string;
  protocol?: string;
  headers: Record<string, HeaderValue>;
}

function header(value: HeaderValue): string | null {
  return Array.isArray(value)
    ? value[0]?.trim() || null
    : value?.trim() || null;
}

function originOf(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

@Injectable()
export class BrowserWriteGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const method = (request.method ?? 'GET').toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const originHeader = header(request.headers.origin);
    const refererHeader = header(request.headers.referer);
    const origin = originHeader
      ? originOf(originHeader)
      : refererHeader
        ? originOf(refererHeader)
        : null;
    const fetchSite = header(request.headers['sec-fetch-site']);
    const marker = header(request.headers[MARKER_HEADER]);

    if (originHeader && !origin) {
      throw new ForbiddenException('Origin inválida para escrita.');
    }

    if (origin && this.isSameOrigin(origin, request)) {
      return true;
    }

    if (!origin && fetchSite === 'same-origin') {
      return true;
    }

    const configured = origin
      ? this.allowedOrigins().has(origin)
      : false;

    if (fetchSite === 'cross-site' && !configured) {
      throw new ForbiddenException('Escrita bloqueada por origem cross-site.');
    }

    if (marker !== MARKER_VALUE) {
      throw new ForbiddenException('Cabeçalho anti-CSRF ausente.');
    }

    if (!origin) {
      return true;
    }

    if (!configured) {
      throw new ForbiddenException('Origin não autorizada para escrita.');
    }

    return true;
  }

  private allowedOrigins(): Set<string> {
    const raw = this.config.get<string>('WEB_ORIGIN') ?? '';

    return new Set(
      raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(originOf)
        .filter((value): value is string => Boolean(value)),
    );
  }

  private isSameOrigin(
    origin: string,
    request: HttpRequestLike,
  ): boolean {
    const proto =
      header(request.headers['x-forwarded-proto'])?.split(',')[0]?.trim() ??
      request.protocol ??
      'http';
    const host =
      header(request.headers['x-forwarded-host'])?.split(',')[0]?.trim() ??
      header(request.headers.host);

    if (!host) {
      return false;
    }

    return originOf(`${proto}://${host}`) === origin;
  }
}
