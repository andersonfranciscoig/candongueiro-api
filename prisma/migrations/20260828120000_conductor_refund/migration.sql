-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'REFUND';

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'CONDUCTOR_APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "conductor_invites" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conductor_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conductor_links" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conductor_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "conductorDecision" TEXT,
    "conductorDecidedAt" TIMESTAMP(3),
    "driverDecision" TEXT,
    "driverDecidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conductor_withdraw_requests" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "driverDecision" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conductor_withdraw_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conductor_invites_token_key" ON "conductor_invites"("token");
CREATE INDEX "conductor_invites_phone_status_idx" ON "conductor_invites"("phone", "status");
CREATE INDEX "conductor_invites_email_status_idx" ON "conductor_invites"("email", "status");

CREATE UNIQUE INDEX "conductor_links_conductorId_key" ON "conductor_links"("conductorId");
CREATE INDEX "conductor_links_driverId_idx" ON "conductor_links"("driverId");

CREATE INDEX "refund_requests_passengerId_createdAt_idx" ON "refund_requests"("passengerId", "createdAt");
CREATE INDEX "refund_requests_paymentReference_idx" ON "refund_requests"("paymentReference");

CREATE INDEX "conductor_withdraw_requests_driverId_status_idx" ON "conductor_withdraw_requests"("driverId", "status");

-- AddForeignKey
ALTER TABLE "conductor_invites" ADD CONSTRAINT "conductor_invites_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conductor_links" ADD CONSTRAINT "conductor_links_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conductor_links" ADD CONSTRAINT "conductor_links_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conductor_withdraw_requests" ADD CONSTRAINT "conductor_withdraw_requests_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conductor_withdraw_requests" ADD CONSTRAINT "conductor_withdraw_requests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
