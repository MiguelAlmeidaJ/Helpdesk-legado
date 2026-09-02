import type { CurrentUserResponse } from '@helpdesk/contracts';
import Link from 'next/link';
import { SessionUserMenu } from '../../access/components/session-user-menu';
import { AppSidebar } from '../../../shared/navigation/app-sidebar';
import {
  APP_NAVIGATION_SECTIONS,
  APP_NAVIGATION_STANDALONE,
  navigationTotals,
} from '../../../shared/navigation/navigation';
import styles from './dashboard-screen.module.css';

export function DashboardScreen({
  currentUser,
}: {
  currentUser: CurrentUserResponse;
}) {
  const totals = navigationTotals();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <AppSidebar />
          <Link className={styles.brand} href="/dashboard">
            <strong>Helpdesk</strong>
            <span>Nova plataforma</span>
          </Link>
        </div>
        <SessionUserMenu user={currentUser} />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Visão geral</span>
          <h1>Dashboard</h1>
          <p>
            Este painel acompanha a organização da navegação enquanto os módulos
            do Helpdesk são migrados do PHP para NestJS e Next.js.
          </p>

          <div className={styles.metrics}>
            <div>
              <strong>{totals.available}</strong>
              <span>Rotas disponíveis</span>
            </div>
            <div>
              <strong>{totals.planned}</strong>
              <span>Itens em migração</span>
            </div>
            <div>
              <strong>{totals.total}</strong>
              <span>Itens mapeados</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>Mapa funcional</span>
              <h2>Navegação planejada</h2>
            </div>
            <Link className={styles.primaryLink} href="/tickets">
              Abrir Atendimentos
            </Link>
          </div>

          <div className={styles.grid}>
            {APP_NAVIGATION_SECTIONS.map((section) => (
              <article className={styles.card} key={section.id}>
                <div className={styles.cardTitle}>
                  <span>{section.shortLabel}</span>
                  <h3>{section.label}</h3>
                </div>
                <ul>
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.label}</span>
                      <small data-status={item.status}>
                        {item.status === 'available' ? 'Disponível' : 'Em migração'}
                      </small>
                    </li>
                  ))}
                </ul>
              </article>
            ))}

            <article className={styles.card}>
              <div className={styles.cardTitle}>
                <span>+</span>
                <h3>Outros</h3>
              </div>
              <ul>
                {APP_NAVIGATION_STANDALONE.map((item) => (
                  <li key={item.id}>
                    <span>{item.label}</span>
                    <small data-status={item.status}>Em migração</small>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
