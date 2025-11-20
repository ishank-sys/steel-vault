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
    // Normalize provider import to support both CJS and ESM shapes
    (CredentialsProvider && CredentialsProvider.default ? CredentialsProvider.default : CredentialsProvider)({
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

        // Built-in admin bypass (no DB required)
        // Override via env: BUILTIN_ADMIN_EMAIL, BUILTIN_ADMIN_PASSWORD, BUILTIN_ADMIN_NAME
        const builtinEmail = (process.env.BUILTIN_ADMIN_EMAIL || 'admin@local').toLowerCase();
        const builtinPassword = process.env.BUILTIN_ADMIN_PASSWORD || 'admin';
        const builtinName = process.env.BUILTIN_ADMIN_NAME || 'Admin';

        if (credentials.email.toLowerCase() === builtinEmail && credentials.password === builtinPassword) {
          console.info('[auth] Built-in admin login used');
          return {
            id: 'admin-local',
            email: builtinEmail,
            userType: 'admin',
            name: builtinName,
            isBuiltInAdmin: true,
          };
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.warn('[auth] No user found for email', credentials.email);
          throw new Error("No user found with this email");
        }

        // Accept both bcrypt-hashed and legacy plain-text passwords.
        const stored = user.password || '';
        const looksHashed = /^\$2[aby]\$/.test(stored) && stored.length >= 55;
        let isValid = false;
        try {
          if (looksHashed) {
            isValid = await bcrypt.compare(credentials.password, stored);
          } else {
            // Legacy plain-text match
            isValid = credentials.password === stored;
          }
        } catch (e) {
          console.warn('[auth] Password validation error', e?.message || e);
          isValid = false;
        }

        if (!isValid) {
          console.warn('[auth] Invalid password for email', credentials.email);
          throw new Error("Invalid password");
        }

        // Auto-upgrade legacy plain-text password to bcrypt on successful login (best-effort)
        if (!looksHashed) {
          try {
            const hashed = await bcrypt.hash(credentials.password, 10);
            await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
            console.info('[auth] Upgraded legacy plain-text password to bcrypt for user', user.id);
          } catch (e) {
            console.warn('[auth] Failed to upgrade password hash for user', user.id, e?.message || e);
          }
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
          isBuiltInAdmin: false,
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
        // mark built-in admin so we don't attempt DB lookups later
        token.isBuiltInAdmin = user.isBuiltInAdmin || false;
        return token;
      }

      // If token exists but lacks userType (existing session), try to load from DB
      try {
        if (token && token.email && !token.userType && !token.isBuiltInAdmin) {
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
          isBuiltInAdmin: Boolean(token.isBuiltInAdmin),
        };
      }
      return session;
    },
  },
};