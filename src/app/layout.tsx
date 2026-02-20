import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import OnboardingGuard from '@/components/OnboardingGuard';
import { auth } from '@/lib/auth';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Hours Tracker',
  description: 'Track and verify work hours',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <Providers session={session}>
          <Header />
          <OnboardingGuard>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
          </OnboardingGuard>
        </Providers>
      </body>
    </html>
  );
}
