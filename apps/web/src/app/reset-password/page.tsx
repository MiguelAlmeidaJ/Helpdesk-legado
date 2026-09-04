import type { Metadata } from 'next';
import { ResetPasswordForm } from '../../modules/access/components/reset-password-form';

export const metadata: Metadata = { title: 'Redefinir senha · Helpdesk' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const value = (await searchParams).token;
  const token = Array.isArray(value) ? value[0] ?? '' : value ?? '';
  return <ResetPasswordForm token={token} />;
}
