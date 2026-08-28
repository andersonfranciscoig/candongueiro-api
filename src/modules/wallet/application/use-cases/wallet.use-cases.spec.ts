import {
  BadRequestException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import {
  TransactionStatus,
  TransactionType,
} from "../../../../shared/domain/types/enums";
import type { WalletRepository } from "../../domain/repositories/wallet.repository";
import type { UserRepository } from "../../../identity/domain/repositories/user.repository";
import type { MailService } from "../../../mail/application/mail.service";
import { GetWalletUseCase } from "./get-wallet.use-case";
import { PayTripUseCase } from "./pay-trip.use-case";
import { makeUser } from "../../../../test/fixtures/user.fixture";

describe("GetWalletUseCase", () => {
  const wallet: jest.Mocked<WalletRepository> = {
    getSnapshot: jest.fn(),
    countTransactions: jest.fn(),
    createTopUpRequest: jest.fn(),
    confirmTopUp: jest.fn(),
    payTrip: jest.fn(),
    withdraw: jest.fn(),
  };

  const useCase = new GetWalletUseCase(wallet);

  it("lança NotFound quando utilizador não existe", async () => {
    wallet.getSnapshot.mockResolvedValue(null);
    await expect(useCase.execute("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("devolve saldo e movimentos", async () => {
    wallet.getSnapshot.mockResolvedValue({
      balance: 5000,
      transactions: [
        {
          id: "tx_1",
          type: TransactionType.TOPUP,
          amount: 5000,
          title: "Carregamento",
          status: TransactionStatus.COMPLETED,
          reference: "CP-000123",
          vehiclePlate: null,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ],
    });

    const result = await useCase.execute("usr_1");

    expect(result.balance).toBe(5000);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.createdAt).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("PayTripUseCase", () => {
  const wallet: jest.Mocked<WalletRepository> = {
    getSnapshot: jest.fn(),
    countTransactions: jest.fn(),
    createTopUpRequest: jest.fn(),
    confirmTopUp: jest.fn(),
    payTrip: jest.fn(),
    withdraw: jest.fn(),
  };

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

  const mail = {
    sendPaymentSent: jest.fn(),
    sendPaymentReceived: jest.fn(),
    sendLowBalance: jest.fn(),
  } as unknown as MailService;

  const pinVerification = {
    assertValidPin: jest.fn().mockResolvedValue(undefined),
  };

  const notifications = {
    publish: jest.fn().mockResolvedValue({ id: "ntf_1" }),
  };

  const prisma = {
    conductorLink: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  const useCase = new PayTripUseCase(
    wallet,
    users,
    mail,
    pinVerification as never,
    notifications as never,
    prisma as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it("valida valor positivo", async () => {
    await expect(
      useCase.execute("usr_1", { amount: 0, qrCode: "CPAY:VEH:LD", pin: "123456" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("exige QR ou matrícula", async () => {
    await expect(useCase.execute("usr_1", { amount: 500, pin: "123456" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("delega pagamento ao repositório", async () => {
    wallet.countTransactions.mockResolvedValue(10);
    users.findById
      .mockResolvedValueOnce(makeUser({ id: "usr_1" }))
      .mockResolvedValueOnce(makeUser({ id: "drv_1", role: "DRIVER" as never }));
    wallet.payTrip.mockResolvedValue({
      balanceAfter: 4500,
      driverId: "drv_1",
      driverBalance: 5500,
      receiptReference: "CP-000134",
      transaction: {
        id: "tx_pay",
        type: TransactionType.PAYMENT,
        amount: -500,
        title: "Viagem de candongueiro",
        status: TransactionStatus.COMPLETED,
        reference: "CP-000133",
        vehiclePlate: "LD-45-23-AB",
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    });

    const result = await useCase.execute("usr_1", {
      amount: 500,
      qrCode: "CPAY:VEH:LD-45-23-AB",
      pin: "123456",
    });

    expect(wallet.payTrip).toHaveBeenCalled();
    expect(result.balanceAfter).toBe(4500);
    expect(result.transaction.vehiclePlate).toBe("LD-45-23-AB");
  });
});
