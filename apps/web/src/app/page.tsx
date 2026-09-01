import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-card">
        <span className="eyebrow">Helpdesk</span>
        <h1>Nova plataforma</h1>
        <p>
          A migração está acontecendo módulo por módulo. A primeira experiência
          operacional disponível no Next.js é a consulta de atendimentos.
        </p>
        <div className="landing-actions">
          <Link className="button button-primary" href="/tickets">
            Abrir atendimentos
          </Link>
        </div>
      </section>
    </main>
  );
}
