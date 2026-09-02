import type { Metadata } from 'next';
import { ForgotPasswordForm } from '../../modules/access/components/forgot-password-form';

export const metadata: Metadata = { title: 'Recuperar senha · Helpdesk' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
