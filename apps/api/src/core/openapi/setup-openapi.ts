import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { LEGACY_SESSION_SECURITY } from './openapi.constants';

const SWAGGER_PATH = 'api/docs';
const SWAGGER_JSON_PATH = 'api/docs-json';

function swaggerEnabled(): boolean {
  return (process.env.SWAGGER_ENABLED ?? 'true').trim().toLowerCase() !== 'false';
}

export function setupOpenApi(app: INestApplication): void {
  if (!swaggerEnabled()) {
    return;
  }

  const sessionCookie =
    process.env.LEGACY_SESSION_COOKIE?.trim() || 'PHPSESSID';

  const config = new DocumentBuilder()
    .setTitle('Helpdesk API')
    .setDescription(
      'API do Helpdesk em migração incremental do PHP legado para NestJS/Next.js.',
    )
    .setVersion('0.1.0')
    .addTag('health', 'Saúde da aplicação e bancos de dados.')
    .addTag('auth', 'Identidade e autorização durante a transição.')
    .addTag('tickets', 'Atendimentos / chamados.')
    .addSecurity(LEGACY_SESSION_SECURITY, {
      type: 'apiKey',
      in: 'cookie',
      name: sessionCookie,
      description:
        'Cookie da sessão PHP compartilhada durante a migração. O RBAC é resolvido no servidor.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    customSiteTitle: 'Helpdesk API · Swagger',
    swaggerOptions: {
      displayRequestDuration: true,
      filter: true,
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
    },
  });
}
