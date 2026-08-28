import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../../shared/infrastructure/persistence/prisma/prisma.service";
import type { OtpChallengeRepository } from "../../../domain/repositories/otp-challenge.repository";

@Injectable()
export class PrismaOtpChallengeRepository implements OtpChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    email: string;
    userId?: string;
    codeHash: string;
    purpose: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.otpChallenge.create({
      data: {
        email: input.email,
        userId: input.userId,
        codeHash: input.codeHash,
        purpose: input.purpose,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findValid(input: {
    email: string;
    purpose: string;
    codeHash: string;
  }): Promise<{ id: string } | null> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email: input.email,
        purpose: input.purpose,
        codeHash: input.codeHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return challenge;
  }

  async consume(id: string): Promise<void> {
    await this.prisma.otpChallenge.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }
}
