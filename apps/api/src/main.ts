import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupOpenApi } from './core/openapi/setup-openapi';
import { allowedWebOrigins, normalizeOrigin } from './core/security/allowed-origins';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  const allowedOrigins = allowedWebOrigins(process.env.WEB_ORIGIN);

  app.enableCors({
    origin(origin, callback) {
      // Requests without Origin are server-to-server and are not browser CORS.
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);

      if (normalized && allowedOrigins.has(normalized)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin não autorizada pelo CORS.'), false);
    },
    credentials: true,
  });

  setupOpenApi(app);

  const port = Number(process.env.PORT ?? 4004);
  await app.listen(port);
}

void bootstrap();
