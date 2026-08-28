-- CreateEnum
CREATE TYPE "VehicleOwnership" AS ENUM ('OWNER', 'FLEET');
CREATE TYPE "WorkSessionStatus" AS ENUM ('DRAFT', 'AWAITING_CONDUCTOR', 'ACTIVE', 'ENDED', 'CANCELLED');
CREATE TYPE "FinancialAccess" AS ENUM ('NONE', 'DAILY', 'FULL');
CREATE TYPE "PayoutSchedule" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "ConductorRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PayoutStatus" AS ENUM ('AWAITING_DRIVER', 'PENDING_CONDUCTOR', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CONDUCTOR_PAYOUT';

-- CreateTable fleets
CREATE TABLE "fleets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fleets_pkey" PRIMARY KEY ("id")
);

-- AlterTable vehicles
ALTER TABLE "vehicles" ADD COLUMN "ownershipType" "VehicleOwnership" NOT NULL DEFAULT 'OWNER';
ALTER TABLE "vehicles" ADD COLUMN "fleetId" TEXT;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "fleets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "vehicles_ownerId_idx" ON "vehicles"("ownerId");

-- CreateTable conductor_profiles
CREATE TABLE "conductor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT NOT NULL DEFAULT 'Luanda',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conductor_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conductor_profiles_userId_key" ON "conductor_profiles"("userId");
ALTER TABLE "conductor_profiles" ADD CONSTRAINT "conductor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable driver_conductor_relations
CREATE TABLE "driver_conductor_relations" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "financialAccess" "FinancialAccess" NOT NULL DEFAULT 'DAILY',
    "payoutSchedule" "PayoutSchedule" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    CONSTRAINT "driver_conductor_relations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "driver_conductor_relations_driverId_conductorId_key" ON "driver_conductor_relations"("driverId", "conductorId");
CREATE INDEX "driver_conductor_relations_conductorId_active_idx" ON "driver_conductor_relations"("conductorId", "active");
CREATE INDEX "driver_conductor_relations_driverId_active_idx" ON "driver_conductor_relations"("driverId", "active");
ALTER TABLE "driver_conductor_relations" ADD CONSTRAINT "driver_conductor_relations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "driver_conductor_relations" ADD CONSTRAINT "driver_conductor_relations_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy conductor_links
INSERT INTO "driver_conductor_relations" ("id", "driverId", "conductorId", "active", "financialAccess", "payoutSchedule", "createdAt")
SELECT "id", "driverId", "conductorId", true, 'DAILY', 'MANUAL', "createdAt" FROM "conductor_links"
ON CONFLICT DO NOTHING;

-- CreateTable daily_work_sessions
CREATE TABLE "daily_work_sessions" (
    "id" TEXT NOT NULL,
    "ownerDriverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "effectiveDriverId" TEXT NOT NULL,
    "conductorId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "financialAccess" "FinancialAccess" NOT NULL DEFAULT 'DAILY',
    "workDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "daily_work_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "daily_work_sessions_ownerDriverId_workDate_idx" ON "daily_work_sessions"("ownerDriverId", "workDate");
CREATE INDEX "daily_work_sessions_effectiveDriverId_status_idx" ON "daily_work_sessions"("effectiveDriverId", "status");
CREATE INDEX "daily_work_sessions_conductorId_status_idx" ON "daily_work_sessions"("conductorId", "status");
ALTER TABLE "daily_work_sessions" ADD CONSTRAINT "daily_work_sessions_ownerDriverId_fkey" FOREIGN KEY ("ownerDriverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_work_sessions" ADD CONSTRAINT "daily_work_sessions_effectiveDriverId_fkey" FOREIGN KEY ("effectiveDriverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_work_sessions" ADD CONSTRAINT "daily_work_sessions_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_work_sessions" ADD CONSTRAINT "daily_work_sessions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable session_conductor_requests
CREATE TABLE "session_conductor_requests" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "status" "ConductorRequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_conductor_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "session_conductor_requests_sessionId_key" ON "session_conductor_requests"("sessionId");
CREATE INDEX "session_conductor_requests_conductorId_status_idx" ON "session_conductor_requests"("conductorId", "status");
ALTER TABLE "session_conductor_requests" ADD CONSTRAINT "session_conductor_requests_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "daily_work_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_conductor_requests" ADD CONSTRAINT "session_conductor_requests_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable conductor_payouts
CREATE TABLE "conductor_payouts" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "amount" INTEGER NOT NULL,
    "scheduleType" "PayoutSchedule" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'AWAITING_DRIVER',
    "reference" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "driverConfirmedAt" TIMESTAMP(3),
    "conductorConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conductor_payouts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conductor_payouts_reference_key" ON "conductor_payouts"("reference");
CREATE INDEX "conductor_payouts_conductorId_status_idx" ON "conductor_payouts"("conductorId", "status");
CREATE INDEX "conductor_payouts_driverId_status_idx" ON "conductor_payouts"("driverId", "status");
ALTER TABLE "conductor_payouts" ADD CONSTRAINT "conductor_payouts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conductor_payouts" ADD CONSTRAINT "conductor_payouts_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conductor_payouts" ADD CONSTRAINT "conductor_payouts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "daily_work_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill conductor profiles for existing conductors
INSERT INTO "conductor_profiles" ("id", "userId", "isAvailable", "city", "createdAt", "updatedAt")
SELECT 'cprof_' || u."id", u."id", false, 'Luanda', NOW(), NOW()
FROM "users" u
WHERE u."role" = 'CONDUCTOR'
AND NOT EXISTS (SELECT 1 FROM "conductor_profiles" cp WHERE cp."userId" = u."id");
