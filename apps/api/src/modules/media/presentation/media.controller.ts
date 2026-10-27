import { BadRequestException, Body, Controller, Delete, Get, Header, HttpCode, HttpException, Param, Patch, Post, Query, StreamableFile, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { CurrentUser } from '../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../access/presentation/http/legacy-session.guard';
import { MediaService, validMediaProvider } from '../application/media.service';
import { mediaContext } from '../application/media-validation';
import { mediaMaxBytes } from '../infrastructure/media-providers';

function actor(user: AuthenticatedUser | undefined) { if (!user) throw new UnauthorizedException(); return user; }
function bodyRecord(value: unknown): Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Corpo inválido.');
  return value as Record<string,unknown>;
}
@ApiTags('media')
@Controller('media')
@UseGuards(LegacySessionGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Get('status') status(@CurrentUser() user: AuthenticatedUser | undefined) { return this.media.status(actor(user)); }
  @Patch('settings') settings(@CurrentUser() user: AuthenticatedUser | undefined,@Body() body: unknown) {
    return this.media.configure(actor(user),bodyRecord(body).defaultProvider);
  }
  @Get() list(@CurrentUser() user: AuthenticatedUser | undefined,@Query() query: Record<string,string>) {
    const context = query.contextType !== undefined || query.contextId !== undefined ? mediaContext(query.contextType,query.contextId) : undefined;
    return this.media.list(actor(user),context,Number(query.offset ?? 0),Number(query.limit ?? 30),query.search ?? '');
  }
  @Post()
  @UseInterceptors(FileInterceptor('file',{ limits:{ fileSize:mediaMaxBytes(),files:1,fields:4 } }))
  upload(@CurrentUser() user: AuthenticatedUser | undefined,@Body() body: unknown,@UploadedFile() file: { buffer: Buffer; originalname:string; mimetype:string } | undefined) {
    if (!file?.buffer) throw new BadRequestException('Arquivo obrigatório.');
    const input=bodyRecord(body);
    return this.media.upload(actor(user),mediaContext(input.contextType,input.contextId),{ data:file.buffer,originalName:file.originalname,mimeType:file.mimetype,provider:input.provider ? validMediaProvider(input.provider) : undefined });
  }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser | undefined,@Param('id') id:string) { return this.media.get(actor(user),id); }
  @Get(':id/content')
  @Header('Cache-Control','private, no-store')
  @Header('X-Content-Type-Options','nosniff')
  @Header('Content-Security-Policy',"default-src 'none'; sandbox")
  @Header('Cross-Origin-Resource-Policy','same-origin')
  async content(@CurrentUser() user: AuthenticatedUser | undefined,@Param('id') id:string,@Query('inline') inline:string) {
    const file=await this.media.content(actor(user),id);
    const disposition=inline === 'true' && file.mimeType.startsWith('image/') ? 'inline' : 'attachment';
    return new StreamableFile(file.data,{ type:file.mimeType,disposition:`${disposition}; filename="media"; filename*=UTF-8''${encodeURIComponent(file.originalName).replace(/['()*]/g,char=>'%'+char.charCodeAt(0).toString(16))}` });
  }
  @Post(':id/verify') verify(@CurrentUser() user: AuthenticatedUser | undefined,@Param('id') id:string) { return this.media.verify(actor(user),id); }
  @Post(':id/links') link(@CurrentUser() user: AuthenticatedUser | undefined,@Param('id') id:string,@Body() body: unknown) {
    const input=bodyRecord(body);return this.media.associate(actor(user),id,mediaContext(input.contextType,input.contextId));
  }
  @Delete(':id/links') @HttpCode(204)
  unlink(@CurrentUser() user: AuthenticatedUser | undefined,@Param('id') id:string,@Query() query:Record<string,string>) {
    return this.media.unlink(actor(user),id,mediaContext(query.contextType,query.contextId));
  }
  @Delete(':id') @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser | undefined,@Param('id') id:string) { return this.media.softDelete(actor(user),id); }
}
