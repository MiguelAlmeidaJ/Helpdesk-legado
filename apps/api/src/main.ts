import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupOpenApi } from './core/openapi/setup-openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:4204',
    credentials: true,
  });

  setupOpenApi(app);

  const port = Number(process.env.PORT ?? 4004);
  await app.listen(port);
}

void bootstrap();
