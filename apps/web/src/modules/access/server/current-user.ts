import type { CurrentUserResponse } from '@helpdesk/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:4004/api';

function internalApiUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_INTERNAL_API_URL
  ).replace(/\/$/, '');
}

function cookieHeader(
  values: Awaited<ReturnType<typeof cookies>>,
): string {
  return values
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${internalApiUrl()}/auth/me`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Cookie: cookieHeader(cookieStore),
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Não foi possível validar a sessão na API (${response.status}).`,
    );
  }

  return response.json() as Promise<CurrentUserResponse>;
}

export async function requireAuthenticatedUser(
  returnTo: string,
): Promise<CurrentUserResponse> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  return user;
}
