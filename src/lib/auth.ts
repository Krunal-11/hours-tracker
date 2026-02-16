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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch role from DB
        const supabase = getServiceSupabase();
        const { data } = await supabase
          .from('users')
          .select('role, username, full_name, email')
          .eq('id', user.id)
          .single();
        if (data) {
          token.role = data.role;
          token.username = data.username;
          token.fullName = data.full_name;
          token.userEmail = data.email;
        }
      }
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
