import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { authenticateWithCognito, CognitoAuthError } from "@/server/services/cognito";

const VALID_ROLES: Record<string, Role> = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  VIEWER: "VIEWER",
  CLIENT: "CLIENT",
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        // Guard: reject if this is a Cognito user
        if (user.authProvider === "COGNITO") {
          throw new Error("This account uses Cognito login. Please use the Cognito tab.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId,
        };
      },
    }),
    CredentialsProvider({
      id: "cognito",
      name: "cognito",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let cognitoResult;
        try {
          cognitoResult = await authenticateWithCognito(
            credentials.email,
            credentials.password
          );
        } catch (err) {
          if (err instanceof CognitoAuthError) {
            throw new Error(err.message);
          }
          throw new Error("Cognito authentication failed");
        }

        const role: Role = VALID_ROLES[cognitoResult.role.toUpperCase()] || "VIEWER";

        // Check for email collision with a LOCAL user
        const existingUser = await db.user.findUnique({
          where: { email: cognitoResult.email },
        });

        if (existingUser && existingUser.authProvider === "LOCAL") {
          throw new Error(
            "This email is registered with a local account. Contact your admin to migrate."
          );
        }

        // Upsert user — create on first login, sync role/name on subsequent logins
        const user = await db.user.upsert({
          where: { cognitoSub: cognitoResult.sub },
          create: {
            email: cognitoResult.email,
            name: cognitoResult.name,
            passwordHash: "COGNITO_AUTH",
            role,
            authProvider: "COGNITO",
            cognitoSub: cognitoResult.sub,
          },
          update: {
            name: cognitoResult.name,
            role,
            email: cognitoResult.email,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.clientId = (user as any).clientId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).clientId = token.clientId ?? null;
      }
      return session;
    },
  },
};
