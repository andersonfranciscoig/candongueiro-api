import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Role, VehicleStatus } from "../../../../shared/domain/types/enums";
import type { UserRepository } from "../../../identity/domain/repositories/user.repository";
import type { VehicleRepository } from "../../domain/repositories/vehicle.repository";
import { RegisterVehicleUseCase } from "./register-vehicle.use-case";
import { makeUser } from "../../../../test/fixtures/user.fixture";
import type { MailService } from "../../../mail/application/mail.service";

describe("RegisterVehicleUseCase", () => {
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findAuthByPhone: jest.fn(),
    findAuthById: jest.fn(),
    save: jest.fn(),
    setPinHash: jest.fn(),
    create: jest.fn(),
  };

  const vehicles: jest.Mocked<VehicleRepository> = {
    findByOwner: jest.fn(),
    findByQrCode: jest.fn(),
    findByPlate: jest.fn(),
    create: jest.fn(),
  };

  const mail = {
    sendVehicleRegistered: jest.fn(),
  } as unknown as MailService;

  const useCase = new RegisterVehicleUseCase(users, vehicles, mail);

  beforeEach(() => jest.clearAllMocks());

  it("só permite motoristas", async () => {
    users.findById.mockResolvedValue(makeUser({ role: Role.PASSENGER }));

    await expect(
      useCase.execute("usr_1", { plate: "LD-45-23-AB" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("valida matrícula", async () => {
    users.findById.mockResolvedValue(makeUser({ role: Role.DRIVER }));

    await expect(
      useCase.execute("usr_1", { plate: "XX" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejeita matrícula duplicada", async () => {
    users.findById.mockResolvedValue(makeUser({ role: Role.DRIVER }));
    vehicles.findByPlate.mockResolvedValue({
      id: "veh_1",
      ownerId: "other",
      plate: "LD-45-23-AB",
      model: null,
      driverName: "João",
      status: VehicleStatus.ACTIVE,
      qrCode: "CPAY:VEH:LD-45-23-AB",
      createdAt: new Date(),
    });

    await expect(
      useCase.execute("usr_1", { plate: "LD-45-23-AB" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("regista veículo com sucesso", async () => {
    users.findById.mockResolvedValue(makeUser({ role: Role.DRIVER, name: "João Manuel" }));
    vehicles.findByPlate.mockResolvedValue(null);
    vehicles.create.mockResolvedValue({
      id: "veh_new",
      ownerId: "usr_test",
      plate: "LD-45-23-AB",
      model: "Toyota Hiace",
      driverName: "João Manuel",
      status: VehicleStatus.ACTIVE,
      qrCode: "CPAY:VEH:LD-45-23-AB:Toyota Hiace",
      createdAt: new Date("2026-01-04T00:00:00.000Z"),
    });

    const result = await useCase.execute("usr_test", {
      plate: "ld4523ab",
      model: "Toyota Hiace",
    });

    expect(vehicles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plate: "LD-45-23-AB",
        driverName: "João Manuel",
      }),
    );
    expect(result.plate).toBe("LD-45-23-AB");
  });
});
