import { UserEntity } from "../../modules/identity/domain/entities/user.entity";
import { Role } from "../../shared/domain/types/enums";

export function makeUser(overrides: Partial<{
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  balance: number;
  createdAt: Date;
}> = {}) {
  return UserEntity.create({
    id: "usr_test",
    name: "Anderson Francisco",
    email: "anderson@email.com",
    phone: "+244 923 000 000",
    role: Role.PASSENGER,
    balance: 12_500,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}
