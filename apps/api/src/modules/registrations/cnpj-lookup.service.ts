import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AppPermission, formatCnpj, isValidCnpj, normalizeCnpj, type CnpjLookupResponse } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../access/domain/authenticated-user';

@Injectable()
export class CnpjLookupService {
  private readonly cache = new Map<string, { expires: number; data: CnpjLookupResponse }>();

  async lookup(user: AuthenticatedUser, value: string): Promise<CnpjLookupResponse> {
    if (!user.grants.some(g => [AppPermission.SystemAdmin, AppPermission.RegistrationsClientsCreate, AppPermission.RegistrationsClientsEdit].includes(g.permission))) {
      throw new ForbiddenException('Sem permissão para consultar CNPJ no cadastro de clientes.');
    }
    if (!isValidCnpj(value)) throw new BadRequestException('CNPJ inválido. Confira as 14 posições e os dígitos verificadores.');
    const cnpj = normalizeCnpj(value);
    const cached = this.cache.get(cnpj);
    if (cached && cached.expires > Date.now()) return cached.data;
    let response: Response;
    let source: Record<string, unknown>;
    try {
      // Fixed HTTPS destination: no user-controlled host, redirects, credentials or private data.
      response = await fetch(`https://minhareceita.org/${cnpj}`, {
        signal: AbortSignal.timeout(8000), redirect: 'error', headers: { Accept: 'application/json' },
      });
      if (response.status === 404) throw new NotFoundException('CNPJ não encontrado na base de consulta. Você pode preencher o cadastro manualmente.');
      if (!response.ok) throw new ServiceUnavailableException('Consulta de CNPJ indisponível no momento. Tente novamente ou preencha os dados manualmente.');
      source = await response.json() as Record<string, unknown>;
      if (!source || typeof source !== 'object' || Array.isArray(source) || typeof source.cnpj !== 'string' || normalizeCnpj(source.cnpj) !== cnpj || typeof source.razao_social !== 'string' || !source.razao_social.trim()) throw new Error('Invalid provider response');
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Não foi possível consultar o CNPJ. Tente novamente ou preencha os dados manualmente.');
    }
    const text = (key: string, max: number) => typeof source[key] === 'string' ? source[key].trim().slice(0, max) : '';
    const street = [text('descricao_tipo_de_logradouro', 50), text('logradouro', 100)].filter(Boolean).join(' ');
    const address = [street, text('numero', 20), text('complemento', 100), text('bairro', 100), text('cep', 10)].filter(Boolean).join(', ').slice(0, 100);
    const data: CnpjLookupResponse = {
      cnpj: formatCnpj(cnpj), legalName: text('razao_social', 80), tradeName: text('nome_fantasia', 80) || text('razao_social', 80),
      address, city: text('municipio', 50), state: text('uf', 2).toUpperCase(),
      email: text('email', 60), phone: text('ddd_telefone_1', 50) || text('ddd_telefone_2', 50),
    };
    if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(cnpj, { expires: Date.now() + 300000, data });
    return data;
  }
}
