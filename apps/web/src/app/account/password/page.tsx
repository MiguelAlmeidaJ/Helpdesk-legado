import type { Metadata } from 'next';
import Link from 'next/link';
import { ChangePasswordForm } from '../../../modules/access/components/change-password-form';
import styles from '../../../modules/access/components/login-form.module.css';
import { requireAuthenticatedUser } from '../../../modules/access/server/current-user';

export const metadata: Metadata = { title: 'Alterar senha · Helpdesk' };

export default async function ChangePasswordPage() {
  await requireAuthenticatedUser('/account/password');
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <span>Minha conta</span>
          <strong>Alterar senha</strong>
          <p>A alteração encerra todas as sessões abertas por segurança.</p>
        </div>
        <ChangePasswordForm />
        <Link className={styles.backLink} href="/dashboard">Voltar ao dashboard</Link>
      </section>
    </main>
  );
}
