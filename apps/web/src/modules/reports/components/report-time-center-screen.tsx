'use client';

import { useState } from 'react';
import type { CurrentUserResponse } from '@helpdesk/contracts';
import { AppPageHeader } from '../../../shared/navigation/app-page-header';
import { ReportSections } from './report-sections';
import { TicketTechnicianTimingReportScreen } from './ticket-technician-timing-report-screen';
import { TicketAnalyticsScreen } from './ticket-analytics-screen';

export function ReportTimeCenterScreen({ currentUser }: { currentUser: CurrentUserResponse }) {
  const [view, setView] = useState<'timing' | 'elapsed' | 'workload'>('timing');
  return <main className="min-h-screen bg-app-bg text-app-text max-sm:[&>header]:flex-wrap max-sm:[&>header>div:last-child]:w-full">
    <AppPageHeader title="Tempo de Atendimento" subtitle="Aceite, conclusão, tempo decorrido e carga atual dos técnicos." user={currentUser} />
    <div className="mx-auto w-full max-w-[1600px] px-5 pt-6 max-sm:px-3 print:hidden">
      <ReportSections active="timing" user={currentUser} />
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Visões de tempo">
        {([['timing', 'Aceite e conclusão'], ['elapsed', 'Tempo decorrido'], ['workload', 'Carga atual']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`rounded-lg border border-app-border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-app-brand ${view === value ? 'bg-app-brand text-white' : 'bg-app-surface text-app-muted'}`}>{label}</button>)}
      </div>
    </div>
    {view === 'timing' ? <TicketTechnicianTimingReportScreen currentUser={currentUser} embedded /> : <TicketAnalyticsScreen key={view} currentUser={currentUser} mode={view === 'elapsed' ? 'time' : 'workload'} embedded />}
  </main>;
}
