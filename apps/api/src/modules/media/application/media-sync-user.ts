import { ForbiddenException } from '@nestjs/common';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { RbacAccessRepository } from '../../access/infrastructure/rbac-access.repository';
import { translateRbacAccess } from '../../access/application/rbac-permission-translator';
import { requireMediaAdmin } from './media-access.service';

export async function resolveUserGrants(database:Nivel3DatabaseClient,id:number) {
  const snapshot=await new RbacAccessRepository(database).findByUserId(id);
  if(!snapshot?.active)throw new ForbiddenException('Administrador indisponível.');
  const user=translateRbacAccess({id,name:'Media synchronization',login:'media-sync',functionId:null},snapshot);
  requireMediaAdmin(user);
  return user;
}
