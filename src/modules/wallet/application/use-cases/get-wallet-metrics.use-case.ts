import { Injectable } from "@nestjs/common";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import type { WalletMetricsQueryDto } from "../dto/wallet.dto";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const HOUR_BUCKETS = [
  { label: "06h", from: 0, to: 9 },
  { label: "09h", from: 9, to: 12 },
  { label: "12h", from: 12, to: 15 },
  { label: "15h", from: 15, to: 18 },
  { label: "18h", from: 18, to: 21 },
  { label: "21h", from: 21, to: 24 },
] as const;

export type MetricsPointDto = {
  day: string;
  value: number;
  secondary: number;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

@Injectable()
export class GetWalletMetricsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, query: WalletMetricsQueryDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Utilizador");

    const isDriver = user.role === "DRIVER";
    const types = isDriver ? [TransactionType.RECEIPT] : [TransactionType.PAYMENT];

    const anchor =
      query.period === "custom" && query.date
        ? startOfDay(new Date(`${query.date}T12:00:00`))
        : new Date();

    const { from, to, subtitle, periodLabel } = this.resolveRange(
      query.period,
      anchor,
      isDriver,
    );

    const rows = await this.prisma.ledgerTransaction.findMany({
      where: {
        userId,
        type: { in: types },
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const points = this.aggregate(query.period, anchor, rows);

    return { points, subtitle, periodLabel, role: isDriver ? "driver" : "passenger" };
  }

  private resolveRange(
    period: WalletMetricsQueryDto["period"],
    anchor: Date,
    isDriver: boolean,
  ) {
    if (period === "day" || period === "custom") {
      const day = startOfDay(anchor);
      const custom = period === "custom";
      return {
        from: day,
        to: endOfDay(day),
        subtitle: custom
          ? isDriver
            ? `Recebimentos de ${formatDayLabel(day)}`
            : `Gastos de ${formatDayLabel(day)}`
          : isDriver
            ? "Recebimentos de hoje por horário"
            : "Hoje por horário",
        periodLabel: custom ? formatDayLabel(day) : "Hoje",
      };
    }

    if (period === "month") {
      const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const to = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
      return {
        from,
        to,
        subtitle: `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`,
        periodLabel: `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`,
      };
    }

    const year = anchor.getFullYear();
    return {
      from: new Date(year, 0, 1),
      to: endOfDay(new Date(year, 11, 31)),
      subtitle: `Ano ${year}`,
      periodLabel: String(year),
    };
  }

  private aggregate(
    period: WalletMetricsQueryDto["period"],
    anchor: Date,
    rows: Array<{ amount: number; createdAt: Date }>,
  ): MetricsPointDto[] {
    if (period === "day" || period === "custom") {
      const buckets = HOUR_BUCKETS.map((b) => ({ day: b.label, value: 0, secondary: 0 }));
      for (const row of rows) {
        const hour = row.createdAt.getHours();
        const idx = HOUR_BUCKETS.findIndex((b) => hour >= b.from && hour < b.to);
        if (idx < 0) continue;
        buckets[idx]!.secondary += 1;
        buckets[idx]!.value += Math.abs(row.amount);
      }
      return buckets;
    }

    if (period === "month") {
      const year = anchor.getFullYear();
      const month = anchor.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const chunk = Math.ceil(daysInMonth / 7);
      const points: MetricsPointDto[] = [];

      for (let start = 1; start <= daysInMonth; start += chunk) {
        const end = Math.min(start + chunk - 1, daysInMonth);
        let value = 0;
        let trips = 0;
        for (const row of rows) {
          const day = row.createdAt.getDate();
          if (day >= start && day <= end) {
            trips += 1;
            value += Math.abs(row.amount);
          }
        }
        points.push({
          day: start === end ? `${start}` : `${start}–${end}`,
          value,
          secondary: trips,
        });
      }
      return points;
    }

    const year = anchor.getFullYear();
    return MONTHS.map((label, month) => {
      let value = 0;
      let trips = 0;
      for (const row of rows) {
        if (row.createdAt.getFullYear() === year && row.createdAt.getMonth() === month) {
          trips += 1;
          value += Math.abs(row.amount);
        }
      }
      return { day: label, value, secondary: trips };
    });
  }
}
