import { Injectable } from "@nestjs/common";
import { Role as PrismaRole } from "@prisma/client";
import { Role } from "../../../../../shared/domain/types/enums";
import { PrismaService } from "../../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { UserEntity } from "../../../domain/entities/user.entity";
import type { UserRepository } from "../../../domain/repositories/user.repository";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: PrismaRole;
    homeRole: PrismaRole;
    balance: number;
    createdAt: Date;
  }) {
    return UserEntity.create({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role as Role,
      homeRole: row.homeRole as Role,
      balance: row.balance,
      createdAt: row.createdAt,
    });
  }

  async findById(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.map(row) : null;
  }

  async findByPhone(phone: string) {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    return row ? this.map(row) : null;
  }

  async findAuthByPhone(phone: string) {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    if (!row) return null;
    return { user: this.map(row), pinHash: row.pinHash };
  }

  async findAuthById(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return { user: this.map(row), pinHash: row.pinHash };
  }

  async setPinHash(userId: string, pinHash: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });
  }

  async save(user: UserEntity) {
    const row = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        email: user.email.value,
        phone: user.phone.value,
        balance: user.balance,
        role: user.role as PrismaRole,
        homeRole: user.homeRole as PrismaRole,
      },
    });
    return this.map(row);
  }

  async create(input: {
    name: string;
    email: string;
    phone: string;
    role: Role;
    balance?: number;
    pinHash?: string;
  }) {
    const row = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role as PrismaRole,
        homeRole: input.role as PrismaRole,
        balance: input.balance ?? 0,
        pinHash: input.pinHash,
        wallet: { create: {} },
      },
    });
    return this.map(row);
  }
}
