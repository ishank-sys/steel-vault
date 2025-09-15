import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Find user in the unified User table
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) throw new Error("No user found with this email");

        if (!user.password) throw new Error("No password set for this user");

        const validPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!validPassword) throw new Error("Invalid password");

        // You can return userType and clientId if needed for session
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          clientId: user.clientId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
