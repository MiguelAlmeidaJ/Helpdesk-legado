'use client';

import Link from 'next/link';
import type { CurrentUserResponse } from '@helpdesk/contracts';

export function ReportSections({ active, user }: { active: 'tickets' | 'projects' | 'timing' | 'pdf'; user: CurrentUserResponse }) {
  const can = (permission: string) => user.grants.some(grant => grant.permission === 'system.admin' || grant.permission === permission);
  const sections = [
    { key: 'tickets', label: 'Relatórios Atendimentos', href: '/relatorios/atendimentos', permission: 'reports.read' },
    { key: 'projects', label: 'Relatórios Tarefas/Projetos', href: '/relatorios/tarefas-projetos', permission: 'reports.read' },
    { key: 'timing', label: 'Tempo de Atendimento', href: '/relatorios/atendimentos/tempo-aceite-conclusao', permission: 'reports.read' },
    { key: 'pdf', label: 'Gerar PDF', href: '/relatorios/arquivos', permission: 'reports.pdf' },
  ];
  return <nav aria-label="Grupos de relatórios" className="mb-5 flex flex-wrap gap-2 rounded-xl border border-app-border bg-app-surface p-2 print:hidden">
    {sections.filter(section => can(section.permission)).map(section => <Link key={section.key} href={section.href} aria-current={active === section.key ? 'page' : undefined} className={`min-w-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-app-brand ${active === section.key ? 'bg-app-brand text-white' : 'text-app-muted hover:bg-app-surface-hover hover:text-app-text'}`}>{section.label}</Link>)}
  </nav>;
}
