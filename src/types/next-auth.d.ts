import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      username: string;
      fullName: string;
      userEmail: string | null;
      mustChangePassword: boolean;
      emailSetupComplete: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    username: string;
    fullName: string;
    userEmail: string | null;
    mustChangePassword: boolean;
    emailSetupComplete: boolean;
  }
}
