import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

const photoData = [
  {
    s3Key: "1000045551.jpg",
    title: "Жёлтый двор-колодец",
    metro: "Василеостровская",
    lat: 59.936435,
    lng: 30.270504,
    spaceType: "Дворы",
    mood: "Надежда",
    atmosphere: "Пасмурно",
  },
  {
    s3Key: "1000045552.jpg",
    title: "Тихий переулок",
    metro: "Сенная площадь",
    lat: 59.931120,
    lng: 30.360210,
    spaceType: "Улицы",
    mood: "Спокойствие",
    atmosphere: "Солнечно",
  },
  {
    s3Key: "1000045590.jpg",
    title: "Солнечная арка",
    metro: "Чернышевская",
    lat: 59.944010,
    lng: 30.312800,
    spaceType: "Дворы",
    mood: "Радость",
    atmosphere: "Солнечно",
  },
  {
    s3Key: "1000046456.jpg",
    title: "Кирпичный двор",
    metro: "Удельная",
    lat: 59.999020,
    lng: 30.300100,
    spaceType: "Брандмауэры",
    mood: "Тоска",
    atmosphere: "Дождь",
  },
  {
    s3Key: "1000047462.jpg",
    title: "Жёлтый двор-колодец",
    metro: "Горный институт",
    lat: 59.927300,
    lng: 30.342500,
    spaceType: "Дворы",
    mood: "Тревога",
    atmosphere: "Туман",
  },
  {
    s3Key: "1000047463.jpg",
    title: "Кирпичный двор",
    metro: "Адмиралтейская",
    lat: 59.938200,
    lng: 30.315600,
    spaceType: "Улицы",
    mood: "Надежда",
    atmosphere: "Снег",
  },
];

async function main() {
  const adminEmail =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() || "leonidusachev04@yandex.ru";
  const adminHash = await hash("leonusik", 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      username: "leonid",
      email: adminEmail,
      passwordHash: adminHash,
    },
  });
  console.log(`Admin created: ${admin.username} (${admin.id})`);

  for (const p of photoData) {
    const photo = await prisma.photo.create({
      data: { ...p, uploadedById: admin.id },
    });
    console.log(`Photo created: ${photo.title} (${photo.s3Key})`);
  }

  console.log("Seed complete — 6 photos, 0 routes");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
