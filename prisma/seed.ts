import "dotenv/config";

import type { AmenityKey } from "@/lib/domain/amenities";
import { SpaceType, UserRole } from "@/lib/domain/enums";
import { AppConfig } from "@/server/config";
import { prisma } from "@/server/db/client";
import { PasswordHasher } from "@/server/security/password-hasher";

interface SpaceSeed {
  code: string;
  name: string;
  description: string;
  type: SpaceType;
  capacity: number;
  pricePerHour: number;
  imageUrl: string;
  amenities: AmenityKey[];
}

const SPACE_SEEDS: SpaceSeed[] = [
  {
    code: "DK-01",
    name: "Escritorio ventanal",
    description:
      "Escritorio individual junto al ventanal sur, con luz natural durante toda la manana y acceso directo a la terraza. Incluye silla ergonomica y base regulable en altura.",
    type: SpaceType.DESK,
    capacity: 1,
    pricePerHour: 25000,
    imageUrl: "/spaces/desk-a.svg",
    amenities: ["wifi", "powerOutlets", "standingDesk", "naturalLight"],
  },
  {
    code: "DK-02",
    name: "Escritorio biblioteca",
    description:
      "Puesto individual en la zona silenciosa de la biblioteca, pensado para trabajo de concentracion. Monitor de 27 pulgadas incluido y enchufes en el propio escritorio.",
    type: SpaceType.DESK,
    capacity: 1,
    pricePerHour: 22000,
    imageUrl: "/spaces/desk-b.svg",
    amenities: ["wifi", "powerOutlets", "monitor", "lockers"],
  },
  {
    code: "DK-03",
    name: "Escritorio patio",
    description:
      "Puesto individual frente al patio interior, rodeado de vegetacion y con ventilacion natural. La opcion mas fresca del edificio para las horas centrales del dia.",
    type: SpaceType.DESK,
    capacity: 1,
    pricePerHour: 20000,
    imageUrl: "/spaces/desk-c.svg",
    amenities: ["wifi", "powerOutlets", "naturalLight", "coffee"],
  },
  {
    code: "DK-04",
    name: "Escritorio taller",
    description:
      "Puesto individual dentro del taller, con superficie amplia y herramientas de prototipado a mano. Recomendado para sesiones de trabajo tecnico de varias horas.",
    type: SpaceType.DESK,
    capacity: 1,
    pricePerHour: 28000,
    imageUrl: "/spaces/desk-a.svg",
    amenities: ["wifi", "powerOutlets", "standingDesk", "printer"],
  },
  {
    code: "MR-01",
    name: "Sala Norte",
    description:
      "Sala de reuniones para ocho personas en el ala norte, equipada para videollamadas con camara central y microfonos de techo. Mesa modular y pizarra de pared completa.",
    type: SpaceType.MEETING_ROOM,
    capacity: 8,
    pricePerHour: 65000,
    imageUrl: "/spaces/meeting-a.svg",
    amenities: ["wifi", "videoConference", "whiteboard", "airConditioning"],
  },
  {
    code: "MR-02",
    name: "Sala Mirador",
    description:
      "Sala de reuniones para seis personas con vista panoramica sobre la ciudad. Ideal para presentaciones a clientes y sesiones de trabajo con equipo externo.",
    type: SpaceType.MEETING_ROOM,
    capacity: 6,
    pricePerHour: 55000,
    imageUrl: "/spaces/meeting-b.svg",
    amenities: ["wifi", "videoConference", "whiteboard", "naturalLight"],
  },
  {
    code: "CB-01",
    name: "Cabina Bosque",
    description:
      "Cabina insonorizada para dos personas, pensada para llamadas y entrevistas. Aislamiento acustico completo y aire acondicionado propio.",
    type: SpaceType.CABIN,
    capacity: 2,
    pricePerHour: 35000,
    imageUrl: "/spaces/cabin-a.svg",
    amenities: ["wifi", "soundproofBooth", "airConditioning", "powerOutlets"],
  },
  {
    code: "CB-02",
    name: "Cabina Roble",
    description:
      "Cabina insonorizada para tres personas con mobiliario de madera y mesa redonda. Funciona tambien como sala de lectura para sesiones cortas.",
    type: SpaceType.CABIN,
    capacity: 3,
    pricePerHour: 38000,
    imageUrl: "/spaces/cabin-b.svg",
    amenities: ["wifi", "soundproofBooth", "powerOutlets", "coffee"],
  },
];

/**
 * Creates the administrator defined by the environment and the example catalog.
 * The script is idempotent, so it can be re-run safely.
 *
 * @returns A promise resolved once every record has been written.
 */
async function main(): Promise<void> {
  const config = AppConfig.current;
  const hasher = new PasswordHasher();
  const passwordHash = await hasher.hash(config.seedAdminPassword);

  const administrator = await prisma.user.upsert({
    where: { email: config.seedAdminEmail },
    update: { role: UserRole.ADMIN, fullName: config.seedAdminName, passwordHash },
    create: {
      email: config.seedAdminEmail,
      fullName: config.seedAdminName,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  for (const seed of SPACE_SEEDS) {
    await prisma.space.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        description: seed.description,
        type: seed.type,
        capacity: seed.capacity,
        pricePerHour: seed.pricePerHour,
        imageUrl: seed.imageUrl,
        amenities: [...seed.amenities],
      },
      create: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        type: seed.type,
        capacity: seed.capacity,
        pricePerHour: seed.pricePerHour,
        imageUrl: seed.imageUrl,
        amenities: [...seed.amenities],
      },
    });
  }

  console.log(
    JSON.stringify({
      level: "INFO",
      tag: "SEED",
      message: "Seed completed",
      administratorEmail: administrator.email,
      spaces: SPACE_SEEDS.length,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        level: "ERROR",
        tag: "SEED",
        message: "Seed failed",
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
