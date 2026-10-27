import { Injectable, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import { createMediaClient, type Nivel3DatabaseClient } from '@helpdesk/database';

@Injectable()
export class MediaDatabase implements OnModuleDestroy {
  private connection: Nivel3DatabaseClient | null = null;
  get enabled() { return process.env.MEDIA_ENABLED === 'true'; }
  get client(): Nivel3DatabaseClient {
    if (!this.enabled) throw new ServiceUnavailableException('A Central de Mídias está desabilitada.');
    if (!this.connection) {
      try { this.connection = createMediaClient(); }
      catch { throw new ServiceUnavailableException('Configure a conexão independente da Central de Mídias.'); }
    }
    return this.connection;
  }
  async onModuleDestroy() { await this.connection?.$disconnect(); }
}
