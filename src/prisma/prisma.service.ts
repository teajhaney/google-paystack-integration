import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service
 *
 * This service extends PrismaClient and provides database access throughout the application.
 * Prisma 6 reads the connection URL from the DATABASE_URL environment variable (configured in schema.prisma).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Prisma 6 reads DATABASE_URL from environment automatically
    // No need to pass it explicitly or use adapters
    super();
  }

  async onModuleInit() {
    // Connect to the database when the module initializes
    await this.$connect();
  }

  async onModuleDestroy() {
    // Disconnect from the database when the module is destroyed

    await this.$disconnect();
  }
}
