import { Injectable, UnauthorizedException } from "@nestjs/common";
import { auth } from "../../lib/auth";
import { prisma } from "@corpusai/database";
import type { Request } from "express";

@Injectable()
export class AuthService {
  async validateSession(request: Request) {
    const session = await auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (!session) {
      throw new UnauthorizedException("Invalid or expired session");
    }

    return session;
  }

  async getSessionFromHeaders(headers: Headers) {
    return auth.api.getSession({ headers });
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });
  }

  async getUserWithAIs(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        ais: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            documentCount: true,
            conversationCount: true,
          },
        },
      },
    });
  }
}
