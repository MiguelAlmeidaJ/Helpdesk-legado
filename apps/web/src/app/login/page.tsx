import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../modules/access/components/login-form';
import { getCurrentUser } from '../../modules/access/server/current-user';

export const metadata: Metadata = {
  title: 'Login · Helpdesk',
  description: 'Entrar no Helpdesk',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  const nextPath = '/';
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(nextPath);
  }

  return <LoginForm nextPath={nextPath} />;
}
