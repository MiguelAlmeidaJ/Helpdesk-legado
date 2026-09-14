import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
