// lib/auth.js
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma.js";
import bcrypt from "bcryptjs";

const ensureNextAuthUrl = () => {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;

  const deployedHost = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  const fallback = deployedHost
    ? deployedHost.startsWith("http")
      ? deployedHost
      : `https://${deployedHost}`
    : process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "http://localhost:3000";

  process.env.NEXTAUTH_URL = fallback;
  return fallback;
};

ensureNextAuthUrl();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.info('[auth] Credentials authorize called', {
          email: credentials?.email || null,
          hasPassword: Boolean(credentials?.password),
        });
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.warn('[auth] No user found for email', credentials.email);
          throw new Error("No user found with this email");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          console.warn('[auth] Invalid password for email', credentials.email);
          throw new Error("Invalid password");
        }

        console.info('[auth] Credentials authorize succeeded', {
          email: credentials.email,
          userId: user.id,
          userType: user.userType,
        });

        // include userType and name so callbacks can place them in the session
        return {
          id: user.id.toString(),
          email: user.email,
          userType: user.userType,
          name: user.name || null,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/", // your custom login page
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.userType = user.userType || token.userType;
        token.name = user.name || token.name;
        token.clientId = user.clientId || token.clientId;
        return token;
      }

      // If token exists but lacks userType (existing session), try to load from DB
      try {
        if (token && token.email && !token.userType) {
          const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
          if (dbUser) {
            token.userType = dbUser.userType || token.userType;
            token.name = dbUser.name || token.name;
            token.clientId = dbUser.clientId || token.clientId;
          }
        }
      } catch (e) {
        console.warn('NextAuth JWT callback error:', e.message);
        // ignore DB errors and return token as-is
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          userType: token.userType || null,
          name: token.name || null,
          clientId: token.clientId || null,
        };
      }
      return session;
    },
  },
};