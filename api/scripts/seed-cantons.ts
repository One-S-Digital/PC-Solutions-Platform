import { PrismaClient } from '@prisma/client';
import { CANTON_CODES, CANTON_DEFAULT_LANGUAGES, CantonCode } from '@workspace/types';

const prisma = new PrismaClient();

/**
 * Seed Swiss cantons and federal entity
 * This is idempotent - will upsert existing cantons
 */
export async function seedCantons() {
  console.log('🇨🇭 Seeding Swiss cantons...');

  const cantonData: Array<{
    code: CantonCode;
    name: string;
    nameDe?: string;
    nameFr?: string;
    nameIt?: string;
    defaultLang: 'fr' | 'de' | 'it';
  }> = [
    // German-speaking cantons
    { code: 'AG', name: 'Aargau', nameDe: 'Aargau', defaultLang: 'de' },
    { code: 'AR', name: 'Appenzell Ausserrhoden', nameDe: 'Appenzell Ausserrhoden', defaultLang: 'de' },
    { code: 'AI', name: 'Appenzell Innerrhoden', nameDe: 'Appenzell Innerrhoden', defaultLang: 'de' },
    { code: 'BL', name: 'Basel-Landschaft', nameDe: 'Basel-Landschaft', defaultLang: 'de' },
    { code: 'BS', name: 'Basel-Stadt', nameDe: 'Basel-Stadt', defaultLang: 'de' },
    { code: 'BE', name: 'Bern', nameDe: 'Bern', nameFr: 'Berne', defaultLang: 'de' },
    { code: 'GL', name: 'Glarus', nameDe: 'Glarus', defaultLang: 'de' },
    { code: 'LU', name: 'Lucerne', nameDe: 'Luzern', defaultLang: 'de' },
    { code: 'NW', name: 'Nidwalden', nameDe: 'Nidwalden', defaultLang: 'de' },
    { code: 'OW', name: 'Obwalden', nameDe: 'Obwalden', defaultLang: 'de' },
    { code: 'SH', name: 'Schaffhausen', nameDe: 'Schaffhausen', defaultLang: 'de' },
    { code: 'SZ', name: 'Schwyz', nameDe: 'Schwyz', defaultLang: 'de' },
    { code: 'SO', name: 'Solothurn', nameDe: 'Solothurn', defaultLang: 'de' },
    { code: 'SG', name: 'St. Gallen', nameDe: 'St. Gallen', defaultLang: 'de' },
    { code: 'TG', name: 'Thurgau', nameDe: 'Thurgau', defaultLang: 'de' },
    { code: 'UR', name: 'Uri', nameDe: 'Uri', defaultLang: 'de' },
    { code: 'ZG', name: 'Zug', nameDe: 'Zug', defaultLang: 'de' },
    { code: 'ZH', name: 'Zurich', nameDe: 'Zürich', defaultLang: 'de' },
    { code: 'GR', name: 'Grisons', nameDe: 'Graubünden', nameIt: 'Grigioni', defaultLang: 'de' },
    
    // French-speaking cantons
    { code: 'FR', name: 'Fribourg', nameDe: 'Freiburg', nameFr: 'Fribourg', defaultLang: 'fr' },
    { code: 'GE', name: 'Geneva', nameDe: 'Genf', nameFr: 'Genève', defaultLang: 'fr' },
    { code: 'JU', name: 'Jura', nameDe: 'Jura', nameFr: 'Jura', defaultLang: 'fr' },
    { code: 'NE', name: 'Neuchâtel', nameDe: 'Neuenburg', nameFr: 'Neuchâtel', defaultLang: 'fr' },
    { code: 'VD', name: 'Vaud', nameDe: 'Waadt', nameFr: 'Vaud', defaultLang: 'fr' },
    { code: 'VS', name: 'Valais', nameDe: 'Wallis', nameFr: 'Valais', defaultLang: 'fr' },
    
    // Italian-speaking canton
    { code: 'TI', name: 'Ticino', nameDe: 'Tessin', nameIt: 'Ticino', defaultLang: 'it' },
    
    // Federal
    { code: 'CH', name: 'Federal (Switzerland)', nameDe: 'Bund (Schweiz)', nameFr: 'Fédéral (Suisse)', nameIt: 'Federale (Svizzera)', defaultLang: 'de' },
  ];

  let created = 0;
  let updated = 0;

  for (const canton of cantonData) {
    const result = await prisma.canton.upsert({
      where: { code: canton.code },
      update: {
        name: canton.name,
        nameDe: canton.nameDe || null,
        nameFr: canton.nameFr || null,
        nameIt: canton.nameIt || null,
        defaultLang: canton.defaultLang,
        isActive: true,
      },
      create: {
        code: canton.code,
        name: canton.name,
        nameDe: canton.nameDe || null,
        nameFr: canton.nameFr || null,
        nameIt: canton.nameIt || null,
        defaultLang: canton.defaultLang,
        isActive: true,
      },
    });

    if (result) {
      // Check if this was a create or update by checking if it was just created
      const existing = await prisma.canton.findUnique({ where: { code: canton.code } });
      if (existing && existing.createdAt.getTime() === existing.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }
  }

  console.log(`✅ Canton seeding complete: ${created} created, ${updated} updated`);
  return { created, updated };
}

// Run if called directly
if (require.main === module) {
  seedCantons()
    .then(() => {
      console.log('✅ Canton seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Canton seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

