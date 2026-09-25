import type { Metadata } from 'next';
import './globals.css';

const THEME_BOOTSTRAP_SCRIPT = `
(() => {
  const root = document.documentElement;
  let preference = 'system';

  try {
    const stored = localStorage.getItem('helpdesk-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      preference = stored;
    }
  } catch {}

  const dark = preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.dataset.theme = preference;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
})();
`;

export const metadata: Metadata = {
  title: 'Helpdesk',
  description: 'Nova interface do Helpdesk',
  applicationName: 'Helpdesk',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/branding/favicon.png', sizes: '500x500', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/branding/favicon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
          id="helpdesk-theme-bootstrap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
