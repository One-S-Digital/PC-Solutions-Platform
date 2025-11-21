import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTranslations() {
  const count = await prisma.staticTranslation.count();
  console.log(`Total translations in database: ${count}`);
  
  const samples = await prisma.staticTranslation.findMany({
    take: 5,
    select: {
      namespace: true,
      key: true,
      lang: true,
      value: true,
    },
  });
  
  console.log('\nSample translations:');
  console.log(JSON.stringify(samples, null, 2));
  
  const namespaces = await prisma.staticTranslation.findMany({
    select: { namespace: true },
    distinct: ['namespace'],
  });
  
  console.log(`\nNamespaces: ${namespaces.map(n => n.namespace).join(', ')}`);
  
  await prisma.$disconnect();
}

checkTranslations().catch(console.error);

