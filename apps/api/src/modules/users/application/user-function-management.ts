import { Injectable } from '@nestjs/common';
import type {
  AccessPermissionItem,
  UserFunctionInput,
  UserFunctionMutationResponse,
  UserFunctionSummary,
} from '@helpdesk/contracts';
import { UserFunctionsRepository } from '../infrastructure/user-functions.repository';

@Injectable()
export class UserFunctionManagement {
  constructor(private readonly functions: UserFunctionsRepository) {}

  list(): Promise<UserFunctionSummary[]> {
    return this.functions.list();
  }

  permissions(): Promise<AccessPermissionItem[]> {
    return this.functions.permissions();
  }

  create(input: UserFunctionInput): Promise<UserFunctionMutationResponse> {
    return this.functions.create(input);
  }

  update(id: number, input: UserFunctionInput): Promise<UserFunctionMutationResponse> {
    return this.functions.update(id, input);
  }

  remove(id: number): Promise<void> {
    return this.functions.remove(id);
  }
}
