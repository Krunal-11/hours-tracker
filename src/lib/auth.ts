import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getServiceSupabase } from '@/lib/supabase';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const supabase = getServiceSupabase();
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', credentials.username as string)
          .single();

        if (error || !user) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.full_name,
          email: user.email || user.username,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log('[AUTH-JWT] called — trigger:', trigger, '| user:', !!user, '| token.id:', token.id);
      if (user?.id) {
        token.id = user.id as string;
      }
      // Fetch/refresh user data from DB on login and on session update
      if (user || trigger === 'update') {
        console.log('[AUTH-JWT] fetching DB flags for id:', token.id || user?.id);
        const supabase = getServiceSupabase();
        const { data, error: dbErr } = await supabase
          .from('users')
          .select('role, username, full_name, email, must_change_password, email_setup_complete')
          .eq('id', token.id || user?.id)
          .single();
        console.log('[AUTH-JWT] DB result:', JSON.stringify(data), '| error:', dbErr?.message);
        if (data) {
          token.role = data.role;
          token.username = data.username;
          token.fullName = data.full_name;
          token.userEmail = data.email;
          token.mustChangePassword = data.must_change_password ?? true;
          token.emailSetupComplete = data.email_setup_complete ?? false;
        }
      } else {
        console.log('[AUTH-JWT] skipping DB fetch (no user, trigger:', trigger, ')');
      }
      console.log('[AUTH-JWT] returning token — mustChangePassword:', token.mustChangePassword, ', emailSetupComplete:', token.emailSetupComplete);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = session.user as any;
        user.role = token.role;
        user.username = token.username;
        user.fullName = token.fullName;
        user.userEmail = token.userEmail;
        user.mustChangePassword = token.mustChangePassword;
        user.emailSetupComplete = token.emailSetupComplete;
      }
      console.log('[AUTH-SESSION] returning session — mustChangePassword:', token.mustChangePassword, ', emailSetupComplete:', token.emailSetupComplete);
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
