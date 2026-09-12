import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../modules/access/components/login-form';
import { getCurrentUser } from '../../modules/access/server/current-user';

export const metadata: Metadata = {
  title: 'Login · Helpdesk',
  description: 'Entrar no Helpdesk',
};

function safeNext(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/tickets';
  }

  return candidate;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(nextPath);
  }

  return <LoginForm nextPath={nextPath} />;
}
