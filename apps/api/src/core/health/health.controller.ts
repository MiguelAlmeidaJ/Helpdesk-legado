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
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../database/database.constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar saúde da API',
    description: 'Valida a disponibilidade da API e da conexão com o nivel3.',
  })
  @ApiResponse({
    status: 200,
    description: 'API e banco de dados disponíveis.',
  })
  @ApiResponse({
    status: 503,
    description: 'Banco de dados indisponível.',
  })
  async check() {
    const nivel3 = await this.checkNivel3();
    const response = {
      status: nivel3 === 'up' ? 'ok' : 'degraded',
      service: 'helpdesk-api',
      databases: { nivel3 },
    };

    if (nivel3 !== 'up') {
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
}
