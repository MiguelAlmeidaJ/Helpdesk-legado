import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type {
  N3rdDatabaseClient,
  Nivel3DatabaseClient,
} from '@helpdesk/database';
import {
  N3RD_DATABASE,
  NIVEL3_DATABASE,
} from '../database/database.constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
    @Inject(N3RD_DATABASE)
    private readonly n3rd: N3rdDatabaseClient,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar saúde da API',
    description:
      'Valida a disponibilidade da API e das conexões com nivel3 e n3rd.',
  })
  @ApiResponse({
    status: 200,
    description: 'API e bancos de dados disponíveis.',
  })
  @ApiResponse({
    status: 503,
    description: 'Um ou mais bancos de dados estão indisponíveis.',
  })
  async check() {
    const [nivel3, n3rd] = await Promise.all([
      this.checkNivel3(),
      this.checkN3rd(),
    ]);

    const healthy = nivel3 === 'up' && n3rd === 'up';
    const response = {
      status: healthy ? 'ok' : 'degraded',
      service: 'helpdesk-api',
      databases: {
        nivel3,
        n3rd,
      },
    };

    if (!healthy) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private async checkNivel3(): Promise<'up' | 'down'> {
    try {
      await this.nivel3.$queryRawUnsafe('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkN3rd(): Promise<'up' | 'down'> {
    try {
      await this.n3rd.$queryRawUnsafe('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }
}
