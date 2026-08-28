import { PrismaClient, Role, VehicleStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passenger = await prisma.user.upsert({
    where: { email: "anderson@email.com" },
    update: {},
    create: {
      name: "Anderson Francisco",
      email: "anderson@email.com",
      phone: "+244 923 000 000",
      role: Role.PASSENGER,
      balance: 12_500,
      wallet: { create: {} },
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: "joao.motorista@email.com" },
    update: {},
    create: {
      name: "João Manuel",
      email: "joao.motorista@email.com",
      phone: "+244 912 000 000",
      role: Role.DRIVER,
      balance: 18_500,
      wallet: { create: {} },
      vehicles: {
        create: {
          plate: "LD-45-23-AB",
          model: "Toyota Hiace",
          driverName: "João Manuel",
          status: VehicleStatus.ACTIVE,
          qrCode: "CPAY:VEH:LD-45-23-AB",
        },
      },
    },
  });

  console.log("Seed OK", { passenger: passenger.id, driver: driver.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
