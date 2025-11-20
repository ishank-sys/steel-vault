export const runtime = 'nodejs'; // force Node runtime (not edge) for Prisma
import _nextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";

const NextAuth = (_nextAuth && _nextAuth.default) ? _nextAuth.default : _nextAuth;
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
