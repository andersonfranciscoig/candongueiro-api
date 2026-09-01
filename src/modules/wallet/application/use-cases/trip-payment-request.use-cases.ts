import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role, TransactionStatus } from "@prisma/client";
import { formatPlate } from "../../../../shared/domain/utils/reference";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { NotificationPublisherService } from "../../../notifications/application/services/notification-publisher.service";
import { NotificationType } from "../../../notifications/domain/notification-types";
import { PayTripUseCase } from "./pay-trip.use-case";
import type {
  CreateTripPaymentRequestDto,
  LookupTripPaymentRequestsDto,
  PayTripPaymentRequestDto,
} from "../dto/wallet.dto";

function normalizeEmail(email?: string): string | undefined {
  const value = email?.trim().toLowerCase();
  return value || undefined;
}

@Injectable()
export class CreateTripPaymentRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationPublisherService,
  ) {}

  async execute(actorId: string, dto: CreateTripPaymentRequestDto) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) throw new NotFoundException("Utilizador");
    if (actor.role !== Role.DRIVER && actor.role !== Role.CONDUCTOR) {
      throw new ForbiddenException("Apenas motoristas ou cobradores podem enviar pedidos.");
    }

    const passengerPhone = dto.passengerPhone
      ? new Phone(dto.passengerPhone).value
      : undefined;
    const passengerEmail = normalizeEmail(dto.passengerEmail);
    if (!passengerPhone && !passengerEmail) {
      throw new BadRequestException("Informe o telefone ou email do passageiro.");
    }

    let driverId = actorId;
    let conductorId: string | undefined;
    let vehiclePlate = dto.vehiclePlate ? formatPlate(dto.vehiclePlate) : undefined;

    if (actor.role === Role.CONDUCTOR) {
      conductorId = actorId;
      const session = await this.prisma.dailyWorkSession.findFirst({
        where: { conductorId: actorId, status: "ACTIVE" },
        include: { vehicle: true, effectiveDriver: true },
        orderBy: { createdAt: "desc" },
      });
      if (!session) {
        throw new BadRequestException("Não há turno activo para este cobrador.");
      }
      driverId = session.effectiveDriverId;
      vehiclePlate = vehiclePlate ?? session.vehicle.plate;
    }

    if (!vehiclePlate) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { ownerId: driverId },
        orderBy: { createdAt: "desc" },
      });
      if (!vehicle) throw new BadRequestException("Registe um veículo antes de cobrar.");
      vehiclePlate = vehicle.plate;
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { plate: vehiclePlate } });
    if (!vehicle) throw new NotFoundException("Veículo");

    const count = await this.prisma.tripPaymentRequest.count();
    const reference = `TR-${String(1000 + count).padStart(6, "0")}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const request = await this.prisma.tripPaymentRequest.create({
      data: {
        reference,
        driverId,
        conductorId,
        passengerPhone,
        passengerEmail,
        vehiclePlate: vehicle.plate,
        amount: dto.amount,
        expiresAt,
      },
      include: { driver: true },
    });

    const passenger = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(passengerPhone ? [{ phone: passengerPhone }] : []),
          ...(passengerEmail ? [{ email: passengerEmail }] : []),
        ],
      },
    });

    if (passenger) {
      await this.notifications.publish({
        userId: passenger.id,
        type: NotificationType.TRIP_PAYMENT_REQUEST,
        title: "Pedido de pagamento",
        body: `${request.driver.name} pediu ${dto.amount.toLocaleString("pt-AO")} Kz (${vehicle.plate}).`,
        meta: {
          reference: request.reference,
          amount: dto.amount,
          vehiclePlate: vehicle.plate,
          driverName: request.driver.name,
        },
      });
    }

    return {
      id: request.id,
      reference: request.reference,
      amount: request.amount,
      vehiclePlate: request.vehiclePlate,
      passengerPhone: request.passengerPhone ?? undefined,
      passengerEmail: request.passengerEmail ?? undefined,
      expiresAt: request.expiresAt.toISOString(),
    };
  }
}

@Injectable()
export class LookupTripPaymentRequestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(passengerId: string, dto: LookupTripPaymentRequestsDto) {
    const passenger = await this.prisma.user.findUnique({ where: { id: passengerId } });
    if (!passenger) throw new NotFoundException("Utilizador");

    const phone = dto.phone ? new Phone(dto.phone).value : passenger.phone;
    const email = normalizeEmail(dto.email) ?? passenger.email.toLowerCase();

    const requests = await this.prisma.tripPaymentRequest.findMany({
      where: {
        status: TransactionStatus.PENDING,
        expiresAt: { gt: new Date() },
        OR: [{ passengerPhone: phone }, { passengerEmail: email }],
      },
      include: { driver: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      items: requests.map((item) => ({
        id: item.id,
        reference: item.reference,
        amount: item.amount,
        vehiclePlate: item.vehiclePlate,
        driverName: item.driver.name,
        expiresAt: item.expiresAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}

@Injectable()
export class PayTripPaymentRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payTrip: PayTripUseCase,
  ) {}

  async execute(passengerId: string, requestId: string, dto: PayTripPaymentRequestDto) {
    const passenger = await this.prisma.user.findUnique({ where: { id: passengerId } });
    if (!passenger) throw new NotFoundException("Utilizador");

    const request = await this.prisma.tripPaymentRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.status !== TransactionStatus.PENDING) {
      throw new NotFoundException("Pedido de pagamento");
    }
    if (request.expiresAt <= new Date()) {
      throw new BadRequestException("Este pedido expirou. Peça um novo ao motorista.");
    }

    const phoneMatch = request.passengerPhone && request.passengerPhone === passenger.phone;
    const emailMatch =
      request.passengerEmail &&
      request.passengerEmail === passenger.email.toLowerCase();
    if (!phoneMatch && !emailMatch) {
      throw new ForbiddenException("Este pedido não está associado à sua conta.");
    }

    const result = await this.payTrip.execute(passengerId, {
      amount: request.amount,
      vehiclePlate: request.vehiclePlate,
      pin: dto.pin,
    });

    await this.prisma.tripPaymentRequest.update({
      where: { id: request.id },
      data: {
        status: TransactionStatus.COMPLETED,
        paidAt: new Date(),
        paymentRef: result.transaction.reference,
      },
    });

    return result;
  }
}
