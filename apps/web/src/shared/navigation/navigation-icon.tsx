import type { NavigationIconName } from '@helpdesk/contracts';

export function NavigationIcon({
  name,
  className = 'size-4',
}: {
  name: NavigationIconName | null | undefined;
  className?: string;
}) {
  const p = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    'aria-hidden': true,
  };

  switch (name) {
    case 'home': return <svg {...p}><path d="M3.5 10.5 12 3.8l8.5 6.7v9.2H3.5z"/><path d="M9 20.5v-6h6v6"/></svg>;
    case 'headset': return <svg {...p}><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13h3v6H5.5A1.5 1.5 0 0 1 4 17.5zm16 0h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>;
    case 'code': return <svg {...p}><path d="m8.5 8-4 4 4 4m7-8 4 4-4 4m-2.5-10-2 12"/></svg>;
    case 'megaphone': return <svg {...p}><path d="M4 11v2a2 2 0 0 0 2 2h2l8 4V5L8 9H6a2 2 0 0 0-2 2z"/><path d="m8 15 1.5 5h3"/></svg>;
    case 'truck': return <svg {...p}><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
    case 'chart': return <svg {...p}><path d="M4 20V10m5 10V4m6 16v-7m5 7V7"/></svg>;
    case 'database': return <svg {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
    case 'radio': return <svg {...p}><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="9" cy="13" r="3"/><path d="M15 11h3m-3 4h3M8 7l7-4"/></svg>;
    case 'wallet': return <svg {...p}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v16H6a2 2 0 0 1-2-2z"/><path d="M4 8h14m0 4h3v4h-3a2 2 0 0 1 0-4z"/></svg>;
    case 'settings': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>;
    case 'shield': return <svg {...p}><path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'users': return <svg {...p}><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5m1 2a5 5 0 0 1 3.5 4.8"/></svg>;
    case 'menu': return <svg {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'wrench': return <svg {...p}><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-3z"/></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'file': return <svg {...p}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/></svg>;
    case 'folder': return <svg {...p}><path d="M3 6h7l2 2h9v11H3z"/></svg>;
    case 'building': return <svg {...p}><path d="M5 21V4h10v17M15 9h4v12M8 8h4m-4 4h4m-4 4h4M3 21h18"/></svg>;
    case 'list': return <svg {...p}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>;
    case 'grid': return <svg {...p}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="8"/><path d="M9 12h6"/></svg>;
  }
}
