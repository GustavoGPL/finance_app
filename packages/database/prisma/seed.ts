import { PrismaClient, type Prisma, type TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addMonths, parseDateOnly } from '@finance/shared';
import { seedDefaultCategories } from '../src/defaults';

const prisma = new PrismaClient();

const PASSWORD = '12345678';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

const HOUSEHOLD = { name: 'Casal Demo', inviteCode: 'DEMO-1234' };
const USER_A = { name: 'Gustavo', email: 'gustavo@demo.dev', memberRole: 'USER_A' as const };
const USER_B = { name: 'Esposa', email: 'esposa@demo.dev', memberRole: 'USER_B' as const };

async function main() {
  const household = await prisma.household.upsert({
    where: { inviteCode: HOUSEHOLD.inviteCode },
    update: { name: HOUSEHOLD.name },
    create: HOUSEHOLD,
  });

  await prisma.user.upsert({
    where: { email: USER_A.email },
    update: { name: USER_A.name, memberRole: USER_A.memberRole, householdId: household.id, passwordHash: PASSWORD_HASH },
    create: { ...USER_A, passwordHash: PASSWORD_HASH, householdId: household.id },
  });
  await prisma.user.upsert({
    where: { email: USER_B.email },
    update: { name: USER_B.name, memberRole: USER_B.memberRole, householdId: household.id, passwordHash: PASSWORD_HASH },
    create: { ...USER_B, passwordHash: PASSWORD_HASH, householdId: household.id },
  });

  await seedDefaultCategories(prisma, household.id);

  await prisma.account.upsert({
    where: { id: `seed-${household.id}-corrente` },
    update: { name: 'Conta Corrente', type: 'CHECKING', ownerType: 'SHARED', initialBalanceCents: 1500000 },
    create: {
      id: `seed-${household.id}-corrente`,
      name: 'Conta Corrente',
      type: 'CHECKING',
      ownerType: 'SHARED',
      initialBalanceCents: 1500000,
      householdId: household.id,
    },
  });
  await prisma.account.upsert({
    where: { id: `seed-${household.id}-nubank` },
    update: {
      name: 'Cartão Nubank',
      type: 'CREDIT_CARD',
      ownerType: 'USER_A',
      creditLimitCents: 800000,
      closingDay: 27,
      dueDay: 5,
    },
    create: {
      id: `seed-${household.id}-nubank`,
      name: 'Cartão Nubank',
      type: 'CREDIT_CARD',
      ownerType: 'USER_A',
      creditLimitCents: 800000,
      closingDay: 27,
      dueDay: 5,
      householdId: household.id,
    },
  });
  await prisma.account.upsert({
    where: { id: `seed-${household.id}-reserva` },
    update: { name: 'Reserva', type: 'SAVINGS', ownerType: 'SHARED', initialBalanceCents: 0 },
    create: {
      id: `seed-${household.id}-reserva`,
      name: 'Reserva',
      type: 'SAVINGS',
      ownerType: 'SHARED',
      initialBalanceCents: 0,
      householdId: household.id,
    },
  });

  await seedSampleTransactions(prisma, household.id, {
    checkingId: `seed-${household.id}-corrente`,
    cardId: `seed-${household.id}-nubank`,
    savingsId: `seed-${household.id}-reserva`,
  });

  console.log(`Seed concluído. Household: ${household.name} (${household.inviteCode})`);
  console.log(`Login: ${USER_A.email} ou ${USER_B.email} | senha: ${PASSWORD}`);
}

async function seedSampleTransactions(
  prisma: PrismaClient,
  householdId: string,
  accounts: { checkingId: string; cardId: string; savingsId: string },
) {
  const count = await prisma.transaction.count({ where: { householdId } });
  if (count > 0) {
    return;
  }

  const catId = async (name: string) => {
    const cat = await prisma.category.findFirst({ where: { householdId, name } });
    return cat?.id;
  };
  const cats = {
    salario: await catId('Salário'),
    aluguel: await catId('Aluguel / Financiamento'),
    mercado: await catId('Mercado'),
    uber: await catId('Uber / Táxi'),
    compras: await catId('Compras'),
  };
  const [userA, userB] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { householdId, memberRole: 'USER_A' } }),
    prisma.user.findFirstOrThrow({ where: { householdId, memberRole: 'USER_B' } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const create = (data: {
    description: string;
    amountCents: number;
    type: TransactionType;
    status: 'PAID' | 'RECEIVED' | 'PENDING';
    date: Date;
    ownerType: 'USER_A' | 'USER_B' | 'SHARED';
    accountId?: string;
    creditCardId?: string;
    transferToAccountId?: string;
    categoryId?: string;
    paidById?: string;
    tags?: Prisma.TransactionTagCreateNestedManyWithoutTransactionInput;
    installmentGroupId?: string;
    installmentIndex?: number;
    installmentTotal?: number;
  }) =>
    prisma.transaction.create({
      data: {
        description: data.description,
        amountCents: data.amountCents,
        type: data.type,
        status: data.status,
        date: data.date,
        ownerType: data.ownerType,
        household: { connect: { id: householdId } },
        ...(data.accountId ? { account: { connect: { id: data.accountId } } } : {}),
        ...(data.creditCardId ? { creditCard: { connect: { id: data.creditCardId } } } : {}),
        ...(data.transferToAccountId
          ? { transferToAccount: { connect: { id: data.transferToAccountId } } }
          : {}),
        ...(data.categoryId ? { category: { connect: { id: data.categoryId } } } : {}),
        ...(data.paidById ? { paidBy: { connect: { id: data.paidById } } } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        installmentGroupId: data.installmentGroupId ?? null,
        installmentIndex: data.installmentIndex ?? null,
        installmentTotal: data.installmentTotal ?? null,
      },
    });

  await create({
    description: 'Salário Gustavo',
    amountCents: 450000,
    type: 'INCOME',
    status: 'RECEIVED',
    date: parseDateOnly(today),
    ownerType: 'USER_A',
    accountId: accounts.checkingId,
    categoryId: cats.salario,
  });
  await create({
    description: 'Salário Esposa',
    amountCents: 400000,
    type: 'INCOME',
    status: 'RECEIVED',
    date: parseDateOnly(today),
    ownerType: 'USER_B',
    accountId: accounts.checkingId,
    categoryId: cats.salario,
  });
  await create({
    description: 'Aluguel',
    amountCents: 180000,
    type: 'EXPENSE',
    status: 'PAID',
    date: parseDateOnly(today),
    ownerType: 'SHARED',
    accountId: accounts.checkingId,
    categoryId: cats.aluguel,
    paidById: userA.id,
  });
  await create({
    description: 'Mercado do mês',
    amountCents: 85000,
    type: 'EXPENSE',
    status: 'PAID',
    date: parseDateOnly(today),
    ownerType: 'SHARED',
    accountId: accounts.checkingId,
    categoryId: cats.mercado,
    paidById: userB.id,
    tags: {
      create: [
        {
          tag: {
            connectOrCreate: {
              where: { householdId_name: { householdId, name: 'compras' } },
              create: { householdId, name: 'compras' },
            },
          },
        },
      ],
    },
  });
  await create({
    description: 'Uber',
    amountCents: 4500,
    type: 'EXPENSE',
    status: 'PAID',
    date: parseDateOnly(today),
    ownerType: 'USER_A',
    accountId: accounts.checkingId,
    categoryId: cats.uber,
    paidById: userA.id,
  });

  const groupId = 'seed-installment-notebook';
  for (let i = 0; i < 3; i++) {
    await create({
      description: 'Notebook',
      amountCents: 120000,
      type: 'EXPENSE',
      status: 'PENDING',
      date: addMonths(parseDateOnly(today), i),
      ownerType: 'SHARED',
      creditCardId: accounts.cardId,
      categoryId: cats.compras,
      paidById: userA.id,
      installmentGroupId: groupId,
      installmentIndex: i + 1,
      installmentTotal: 3,
    });
  }

  await create({
    description: 'Reserva mensal',
    amountCents: 50000,
    type: 'TRANSFER',
    status: 'PAID',
    date: parseDateOnly(today),
    ownerType: 'SHARED',
    accountId: accounts.checkingId,
    transferToAccountId: accounts.savingsId,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
