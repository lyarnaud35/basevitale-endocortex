/**
 * Seed Prisma – Données démo pour Ben (Golden State).
 * 5 patients types + factures validées pour tester l'UI.
 *
 * Usage : npx prisma db seed --schema=apps/api/prisma/schema.prisma
 * Ou : npm run prisma:seed (si configuré)
 */

import { PrismaClient } from '../src/prisma/client';

const prisma = new PrismaClient();

const CREATED_BY = 'seed-demo';

/** Patients de démo – profils types pour le Showroom. */
const DEMO_PATIENTS = [
  {
    insToken: 'DEMO-INS-001',
    insHash: 'hash-demo-001',
    firstName: 'Jean',
    lastName: 'Peuplu',
    birthDate: new Date('1964-03-15'),
    birthPlace: 'Paris',
    displayLabel: 'M. Allergique (Pénicilline)',
  },
  {
    insToken: 'DEMO-INS-002',
    insHash: 'hash-demo-002',
    firstName: 'Marie',
    lastName: 'Enceinte',
    birthDate: new Date('1992-07-22'),
    birthPlace: 'Lyon',
    displayLabel: 'Mme Enceinte',
  },
  {
    insToken: 'DEMO-INS-003',
    insHash: 'hash-demo-003',
    firstName: 'Paul',
    lastName: 'Normal',
    birthDate: new Date('1979-11-08'),
    birthPlace: 'Marseille',
    displayLabel: 'M. Standard',
  },
  {
    insToken: 'DEMO-INS-004',
    insHash: 'hash-demo-004',
    firstName: 'Lucas',
    lastName: 'Fiévreux',
    birthDate: new Date('2020-01-12'),
    birthPlace: 'Toulouse',
    displayLabel: 'L\'enfant fiévreux',
  },
  {
    insToken: 'DEMO-INS-005',
    insHash: 'hash-demo-005',
    firstName: 'Henri',
    lastName: 'Polymédiqué',
    birthDate: new Date('1945-05-30'),
    birthPlace: 'Bordeaux',
    displayLabel: 'M. Poly-médiqué',
  },
];

const RULES_VERSION = 'NGAP_2024';

async function main() {
  console.log('🌱 Seed Prisma – Données démo\n');

  const patientIds: string[] = [];

  for (const p of DEMO_PATIENTS) {
    const patient = await prisma.patient.upsert({
      where: { insToken: p.insToken },
      create: {
        insToken: p.insToken,
        insHash: p.insHash,
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate,
        birthPlace: p.birthPlace,
        country: 'FR',
        createdBy: CREATED_BY,
      },
      update: {},
    });
    patientIds.push(patient.id);
    console.log(`  ✓ Patient : ${p.displayLabel} (${patient.id})`);
  }

  // Factures de démo – historique pour tester l'affichage
  const breakdown = {
    lines: [
      { label: 'Consultation C', amount: 26.5 },
      { label: 'Part Sécu (70%)', amount: 18.55 },
      { label: 'Reste à charge', amount: 7.95 },
    ],
    amo: 18.55,
    amc: 0,
    amount_patient: 7.95,
  };

  const invoices = [
    { acts: ['C'], total: 26.5, patientIdx: 2 },
    { acts: ['C', 'K'], total: 28.42, patientIdx: 2 },
    { acts: ['V'], total: 33, patientIdx: 0 },
    { acts: ['C'], total: 26.5, patientIdx: 4 },
    { acts: ['C', 'NUIT'], total: 61.5, patientIdx: 1 },
  ];

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const performedAt = new Date();
    performedAt.setDate(performedAt.getDate() - (i + 1));

    await prisma.invoice.upsert({
      where: { id: `seed-inv-${i + 1}` },
      create: {
        id: `seed-inv-${i + 1}`,
        patientId: patientIds[inv.patientIdx],
        totalAmount: inv.total,
        breakdown: { ...breakdown, lines: [{ label: `Acte(s) ${inv.acts.join(', ')}`, amount: inv.total }] },
        acts: inv.acts,
        status: 'VALIDATED',
        rulesVersion: RULES_VERSION,
        performedAt,
        contextSnapshot: { age: 45, coverage: 0, modifiers: inv.acts.includes('NUIT') ? ['NUIT'] : [] },
      },
      update: {},
    });
  }
  console.log(`  ✓ ${invoices.length} factures validées (historique démo)\n`);

  console.log('  IDs patients (Prisma) pour le cabinet :');
  patientIds.forEach((id, i) => {
    console.log(`    - ${DEMO_PATIENTS[i].displayLabel} : ${id}`);
  });
  console.log('\n  Terminé.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
