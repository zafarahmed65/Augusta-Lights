import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Augusta Lights — Visualizer',
  description: 'Christmas and permanent lighting visualizations from a single photo.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Augusta Lights' },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0b0d12',
  width: 'device-width',
  initialScale: 1,
  // Lets the GM pinch into a render to check detail during a consultation.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
