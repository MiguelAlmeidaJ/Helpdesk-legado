import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  createN3rdClient,
  createNivel3Client,
  type N3rdDatabaseClient,
  type Nivel3DatabaseClient,
} from '@helpdesk/database';
import {
  N3RD_DATABASE,
  NIVEL3_DATABASE,
} from './database.constants';

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
    @Inject(N3RD_DATABASE)
    private readonly n3rd: N3rdDatabaseClient,
  ) {}

  async onApplicationShutdown() {
    await Promise.allSettled([
      this.nivel3.$disconnect(),
      this.n3rd.$disconnect(),
    ]);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: NIVEL3_DATABASE,
      useFactory: () => createNivel3Client(),
    },
    {
      provide: N3RD_DATABASE,
      useFactory: () => createN3rdClient(),
    },
    DatabaseLifecycle,
  ],
  exports: [NIVEL3_DATABASE, N3RD_DATABASE],
})
export class DatabaseModule {}
