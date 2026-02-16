import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" }
  });
}

main()
  .then(() => console.log("Seed complete"))
  .finally(() => prisma.$disconnect());