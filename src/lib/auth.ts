import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getServiceSupabase } from '@/lib/supabase';

// DEBUG: logs appear in Vercel Function logs (Runtime Logs tab)
const DEBUG = true;
function dbg(...args: unknown[]) {
  if (DEBUG) console.log('[AUTH DEBUG]', ...args);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Required for Vercel / non-localhost deployments
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        dbg('authorize called, username:', credentials?.username);

        if (!credentials?.username || !credentials?.password) {
          dbg('authorize: missing credentials');
          return null;
        }

        const supabase = getServiceSupabase();
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', credentials.username as string)
          .single();

        if (error || !user) {
          dbg('authorize: user not found or DB error:', error?.message);
          return null;
        }

        dbg('authorize: user found, checking password');

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        dbg('authorize: password valid?', isValidPassword);

        if (!isValidPassword) {
          return null;
        }

        dbg('authorize: returning user id:', user.id);
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
      dbg('jwt callback — trigger:', trigger, '| has user:', !!user, '| token.id:', token.id);
      if (user?.id) {
        token.id = user.id as string;
      }
      // Fetch/refresh user data from DB on login and on session update
      if (user || trigger === 'update') {
        const supabase = getServiceSupabase();
        const { data, error } = await supabase
          .from('users')
          .select('role, username, full_name, email, must_change_password, email_setup_complete')
          .eq('id', token.id || user?.id)
          .single();
        dbg('jwt callback DB fetch — data?', !!data, '| error:', error?.message);
        if (data) {
          token.role = data.role;
          token.username = data.username;
          token.fullName = data.full_name;
          token.userEmail = data.email;
          token.mustChangePassword = data.must_change_password ?? true;
          token.emailSetupComplete = data.email_setup_complete ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      dbg('session callback — token.id:', token.id);
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
