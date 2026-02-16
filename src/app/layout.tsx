import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Hours Tracker',
  description: 'Track and verify work hours',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <Providers>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
