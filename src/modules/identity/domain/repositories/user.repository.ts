import { Role } from "../../../../shared/domain/types/enums";
import { UserEntity } from "../entities/user.entity";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  findAuthByPhone(phone: string): Promise<{ user: UserEntity; pinHash: string | null } | null>;
  findAuthById(id: string): Promise<{ user: UserEntity; pinHash: string | null } | null>;
  save(user: UserEntity): Promise<UserEntity>;
  setPinHash(userId: string, pinHash: string): Promise<void>;
  create(input: {
    name: string;
    email: string;
    phone: string;
    role: Role;
    balance?: number;
    pinHash?: string;
  }): Promise<UserEntity>;
}
