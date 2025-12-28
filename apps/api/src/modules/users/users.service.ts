import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@corpusai/database";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        createdAt: true,
        _count: {
          select: {
            ais: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        image: data.image,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        updatedAt: true,
      },
    });
  }

  async getDashboardStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ais: {
          select: {
            id: true,
            documentCount: true,
            conversationCount: true,
            questionCount: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const totalDocuments = user.ais.reduce((sum: number, ai: { documentCount: number }) => sum + ai.documentCount, 0);
    const totalConversations = user.ais.reduce((sum: number, ai: { conversationCount: number }) => sum + ai.conversationCount, 0);
    const totalQuestions = user.ais.reduce((sum: number, ai: { questionCount: number }) => sum + ai.questionCount, 0);

    return {
      aiCount: user.ais.length,
      documentCount: totalDocuments,
      conversationCount: totalConversations,
      questionCount: totalQuestions,
      subscriptionPlan: user.subscriptionPlan,
    };
  }

  async getAccounts(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        providerId: true,
        createdAt: true,
      },
    });

    return accounts;
  }
}
