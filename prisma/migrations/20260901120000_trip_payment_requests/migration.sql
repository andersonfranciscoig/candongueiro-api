-- CreateTable
CREATE TABLE "trip_payment_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "conductorId" TEXT,
    "passengerPhone" TEXT,
    "passengerEmail" TEXT,
    "vehiclePlate" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_payment_requests_reference_key" ON "trip_payment_requests"("reference");

-- CreateIndex
CREATE INDEX "trip_payment_requests_passengerPhone_status_idx" ON "trip_payment_requests"("passengerPhone", "status");

-- CreateIndex
CREATE INDEX "trip_payment_requests_passengerEmail_status_idx" ON "trip_payment_requests"("passengerEmail", "status");

-- CreateIndex
CREATE INDEX "trip_payment_requests_driverId_status_idx" ON "trip_payment_requests"("driverId", "status");

-- AddForeignKey
ALTER TABLE "trip_payment_requests" ADD CONSTRAINT "trip_payment_requests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_payment_requests" ADD CONSTRAINT "trip_payment_requests_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
