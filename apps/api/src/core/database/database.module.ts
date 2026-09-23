import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  createNivel3Client,
  type Nivel3DatabaseClient,
} from '@helpdesk/database';
import { NIVEL3_DATABASE } from './database.constants';

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
  ) {}

  async onApplicationShutdown() {
    await this.nivel3.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: NIVEL3_DATABASE,
      useFactory: () => createNivel3Client(),
    },
    DatabaseLifecycle,
  ],
  exports: [NIVEL3_DATABASE],
})
export class DatabaseModule {}
