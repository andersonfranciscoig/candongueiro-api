import { WelcomeBonusService } from "./welcome-bonus.service";
import { PrismaService } from "../../shared/infrastructure/persistence/prisma/prisma.service";
import {
  WELCOME_BONUS_AMOUNT,
  WELCOME_BONUS_PASSENGER_LIMIT,
} from "./welcome-bonus.constants";

describe("WelcomeBonusService", () => {
  const tx = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ledgerTransaction: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  const service = new WelcomeBonusService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it("concede bónus ao passageiro elegível", async () => {
    tx.user.findUnique.mockResolvedValue({ id: "usr_1", role: "PASSENGER", balance: 0 });
    tx.ledgerTransaction.findFirst.mockResolvedValue(null);
    tx.ledgerTransaction.count.mockResolvedValue(4);
    tx.user.update.mockResolvedValue({ id: "usr_1", balance: WELCOME_BONUS_AMOUNT });
    tx.ledgerTransaction.create.mockResolvedValue({});
    tx.notification.create.mockResolvedValue({ id: "ntf_1" });

    const result = await service.tryGrantPassengerBonus("usr_1");

    expect(result).toEqual(
      expect.objectContaining({
        granted: true,
        amount: WELCOME_BONUS_AMOUNT,
        rank: 5,
        balanceAfter: WELCOME_BONUS_AMOUNT,
        notificationId: "ntf_1",
      }),
    );
  });

  it("não concede após limite", async () => {
    tx.user.findUnique.mockResolvedValue({ id: "usr_2", role: "PASSENGER", balance: 0 });
    tx.ledgerTransaction.findFirst.mockResolvedValue(null);
    tx.ledgerTransaction.count.mockResolvedValue(WELCOME_BONUS_PASSENGER_LIMIT);

    const result = await service.tryGrantPassengerBonus("usr_2");

    expect(result).toEqual({ granted: false });
  });
});
