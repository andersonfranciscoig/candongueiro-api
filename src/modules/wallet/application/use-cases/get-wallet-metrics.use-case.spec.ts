import { TransactionStatus, TransactionType } from "@prisma/client";
import { GetWalletMetricsUseCase } from "./get-wallet-metrics.use-case";

describe("GetWalletMetricsUseCase", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    ledgerTransaction: { findMany: jest.fn() },
  };

  const useCase = new GetWalletMetricsUseCase(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("agrega pagamentos do passageiro por hora", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "PASSENGER" });
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      { amount: -500, createdAt: new Date("2026-08-28T10:30:00") },
      { amount: -300, createdAt: new Date("2026-08-28T10:45:00") },
    ]);

    const result = await useCase.execute("u1", { period: "day" });

    expect(prisma.ledgerTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          type: { in: [TransactionType.PAYMENT] },
          status: TransactionStatus.COMPLETED,
        }),
      }),
    );
    expect(result.points.find((p) => p.day === "09h")?.value).toBe(800);
    expect(result.points.find((p) => p.day === "09h")?.secondary).toBe(2);
  });

  it("agrega recebimentos do motorista", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "d1", role: "DRIVER" });
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      { amount: 600, createdAt: new Date("2026-08-28T18:10:00") },
    ]);

    const result = await useCase.execute("d1", { period: "day" });

    expect(result.points.find((p) => p.day === "18h")?.value).toBe(600);
    expect(result.subtitle).toContain("Recebimentos");
  });
});
