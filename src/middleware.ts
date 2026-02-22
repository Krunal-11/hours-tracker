import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes — allow through
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/login')) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Admin-only routes
  if (pathname.startsWith('/admin')) {
    const role = req.auth?.user?.role;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
