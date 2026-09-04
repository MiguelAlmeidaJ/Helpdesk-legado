import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

async function bootstrap() {
  const application = await NestFactory.createApplicationContext(WorkerModule);

  application.enableShutdownHooks();
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('TicketWorker');
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);

  logger.error(`Falha ao iniciar worker: ${message}`);
  process.exitCode = 1;
});
