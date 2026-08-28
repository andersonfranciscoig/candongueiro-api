import { Role } from "../../../../shared/domain/types/enums";
import { Email } from "../../../../shared/domain/value-objects/email.vo";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";

export class UserEntity {
  private constructor(
    readonly id: string,
    public name: string,
    public email: Email,
    public phone: Phone,
    readonly role: Role,
    public balance: number,
    readonly createdAt: Date,
  ) {}

  static create(input: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    balance?: number;
    createdAt?: Date;
  }) {
    return new UserEntity(
      input.id,
      input.name.trim(),
      new Email(input.email),
      new Phone(input.phone),
      input.role,
      input.balance ?? 0,
      input.createdAt ?? new Date(),
    );
  }

  credit(amount: number) {
    if (amount <= 0) throw new Error("Valor inválido.");
    this.balance += amount;
  }

  debit(amount: number) {
    if (amount <= 0) throw new Error("Valor inválido.");
    if (amount > this.balance) throw new Error("Saldo insuficiente.");
    this.balance -= amount;
  }

  updateName(name: string) {
    this.name = name.trim();
  }

  updatePhone(phone: string) {
    this.phone = new Phone(phone);
  }
}
