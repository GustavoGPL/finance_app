import type { PrismaClient, TransactionType } from '@prisma/client';

export interface CategorySeed {
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  children?: Omit<CategorySeed, 'children'>[];
}

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  {
    name: 'Renda',
    type: 'INCOME',
    icon: 'banknote',
    color: '#16a34a',
    children: [
      { name: 'Salário', type: 'INCOME', color: '#16a34a' },
      { name: 'Freelance', type: 'INCOME', color: '#22c55e' },
      { name: 'Investimentos', type: 'INCOME', color: '#4ade80' },
    ],
  },
  {
    name: 'Moradia',
    type: 'EXPENSE',
    icon: 'home',
    color: '#7c3aed',
    children: [
      { name: 'Aluguel / Financiamento', type: 'EXPENSE', color: '#7c3aed' },
      { name: 'Condomínio', type: 'EXPENSE', color: '#8b5cf6' },
      { name: 'IPTU / Impostos', type: 'EXPENSE', color: '#a78bfa' },
    ],
  },
  {
    name: 'Contas & Serviços',
    type: 'EXPENSE',
    icon: 'receipt',
    color: '#0ea5e9',
    children: [
      { name: 'Energia', type: 'EXPENSE', color: '#0ea5e9' },
      { name: 'Água', type: 'EXPENSE', color: '#38bdf8' },
      { name: 'Internet', type: 'EXPENSE', color: '#7dd3fc' },
      { name: 'Telefone', type: 'EXPENSE', color: '#bae6fd' },
    ],
  },
  {
    name: 'Alimentação',
    type: 'EXPENSE',
    icon: 'utensils',
    color: '#f59e0b',
    children: [
      { name: 'Mercado', type: 'EXPENSE', color: '#f59e0b' },
      { name: 'Restaurantes', type: 'EXPENSE', color: '#fbbf24' },
      { name: 'Delivery', type: 'EXPENSE', color: '#fcd34d' },
    ],
  },
  {
    name: 'Transporte',
    type: 'EXPENSE',
    icon: 'car',
    color: '#ef4444',
    children: [
      { name: 'Combustível', type: 'EXPENSE', color: '#ef4444' },
      { name: 'Uber / Táxi', type: 'EXPENSE', color: '#f87171' },
      { name: 'Estacionamento', type: 'EXPENSE', color: '#fca5a5' },
    ],
  },
  { name: 'Saúde', type: 'EXPENSE', icon: 'heart-pulse', color: '#ec4899' },
  { name: 'Educação', type: 'EXPENSE', icon: 'graduation-cap', color: '#6366f1' },
  {
    name: 'Lazer',
    type: 'EXPENSE',
    icon: 'palmtree',
    color: '#14b8a6',
    children: [
      { name: 'Viagem', type: 'EXPENSE', color: '#14b8a6' },
      { name: 'Entretenimento', type: 'EXPENSE', color: '#2dd4bf' },
    ],
  },
  { name: 'Compras', type: 'EXPENSE', icon: 'shopping-bag', color: '#f97316' },
  { name: 'Vestuário', type: 'EXPENSE', icon: 'shirt', color: '#a855f7' },
  { name: 'Assinaturas', type: 'EXPENSE', icon: 'refresh-cw', color: '#64748b' },
];

export async function seedDefaultCategories(prisma: PrismaClient, householdId: string): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    let parent = await prisma.category.findFirst({
      where: { householdId, name: cat.name, parentId: null },
    });
    if (!parent) {
      parent = await prisma.category.create({
        data: {
          householdId,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
        },
      });
    }
    for (const child of cat.children ?? []) {
      const existing = await prisma.category.findFirst({
        where: { householdId, name: child.name, parentId: parent.id },
      });
      if (!existing) {
        await prisma.category.create({
          data: {
            householdId,
            name: child.name,
            type: child.type,
            icon: child.icon,
            color: child.color,
            isDefault: true,
            parentId: parent.id,
          },
        });
      }
    }
  }
}
