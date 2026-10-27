import { BadRequestException, Body, Controller, Get, Param, Post, Query, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { LegacySessionGuard } from '../../access/presentation/http/legacy-session.guard';
import { CurrentUser } from '../../access/presentation/http/current-user.decorator';
import { MediaSyncService } from '../application/media-sync.service';
import { requireMediaAdmin } from '../application/media-access.service';
function actor(user:AuthenticatedUser|undefined) { if(!user)throw new UnauthorizedException();return user; }

@Controller('media/sync')
@UseGuards(LegacySessionGuard)
export class MediaSyncController {
  constructor(private readonly sync:MediaSyncService) {}
  @Get() history(@CurrentUser() user:AuthenticatedUser|undefined,@Query('offset') offset?:string) { return this.sync.history(actor(user),Number(offset??0)); }
  @Post('compare')
  @UseInterceptors(FileInterceptor('manifest',{limits:{fileSize:20*1048576,files:1,fields:0}}))
  compare(@CurrentUser() user:AuthenticatedUser|undefined,@UploadedFile() file?:{buffer:Buffer}) {
    const current=actor(user);
    requireMediaAdmin(current);
    let manifest:unknown;
    try { if(!file)throw new Error();manifest=JSON.parse(file.buffer.toString('utf8')); } catch { throw new BadRequestException('Envie um manifesto JSON válido.'); }
    return this.sync.compare(current,manifest);
  }
  @Get(':id') report(@CurrentUser() user:AuthenticatedUser|undefined,@Param('id') id:string,@Query('offset') offset?:string) { return this.sync.report(actor(user),id,Number(offset??0)); }
  @Get(':id/batches') batches(@CurrentUser() user:AuthenticatedUser|undefined,@Param('id') id:string,@Query('offset') offset?:string) { return this.sync.batches(actor(user),id,Number(offset??0)); }
  @Post(':id/approve') approve(@CurrentUser() user:AuthenticatedUser|undefined,@Param('id') id:string,@Body() body?:{confirmation?:unknown;receipt?:unknown}) { return this.sync.approve(actor(user),id,body?.confirmation,body?.receipt); }
  @Post(':id/cancel') cancel(@CurrentUser() user:AuthenticatedUser|undefined,@Param('id') id:string) { return this.sync.cancel(actor(user),id); }
  @Post(':id/retry') retry(@CurrentUser() user:AuthenticatedUser|undefined,@Param('id') id:string) { return this.sync.retry(actor(user),id); }
}
