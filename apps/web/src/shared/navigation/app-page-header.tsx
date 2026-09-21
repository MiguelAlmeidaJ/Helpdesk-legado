"use client";

import type { CurrentUserResponse } from '@helpdesk/contracts';
import type { ReactNode } from 'react';
import { SessionUserMenu } from '../../modules/access/components/session-user-menu';
import { AppSidebar } from './app-sidebar';

export function AppPageHeader({
  user,
  title,
  subtitle,
  actions,
  meta,
}: {
  user: CurrentUserResponse;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-4 border-b border-app-border bg-[var(--app-header-bg)] px-6 py-2.5 backdrop-blur-xl max-sm:px-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <AppSidebar />
        <div className="min-w-0">
          <h1 className="m-0 truncate text-[18px] font-bold leading-tight text-app-text">
            {title}
          </h1>
          <p className="m-0 mt-0.5 truncate text-[12px] text-app-subtle max-sm:hidden">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2.5">
        {meta}
        {actions}
        <SessionUserMenu user={user} />
      </div>
    </header>
  );
}
