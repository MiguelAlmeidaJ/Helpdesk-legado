import type { AuthenticatedUser } from '../../domain/authenticated-user';

export interface AuthenticatedRequest {
  headers: {
    cookie?: string;
  };
  user?: AuthenticatedUser;
}
