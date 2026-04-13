import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma, type PrismaClient } from '@corpusai/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  get client(): PrismaClient {
    return prisma;
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }
}
