import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  type: true,
  parentId: true,
  isDefault: true,
  icon: true,
  color: true,
  createdAt: true,
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, type?: 'INCOME' | 'EXPENSE') {
    return this.prisma.category.findMany({
      where: { householdId: user.householdId, ...(type ? { type } : {}) },
      select: CATEGORY_SELECT,
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(user: AuthUser, dto: CreateCategoryDto) {
    const parent = dto.parentId
      ? await this.prisma.category.findFirst({
          where: { id: dto.parentId, householdId: user.householdId },
        })
      : null;
    if (dto.parentId && !parent) {
      throw new BadRequestException('Categoria pai inválida');
    }
    if (parent && parent.type !== dto.type) {
      throw new BadRequestException('Subcategoria deve ter o mesmo tipo da categoria pai');
    }
    await this.assertUniqueName(user.householdId, dto.name, dto.parentId ?? null);
    return this.prisma.category.create({
      data: {
        householdId: user.householdId,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId ?? null,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
      },
      select: CATEGORY_SELECT,
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateCategoryDto) {
    const existing = await this.getOwned(user, id);
    if (dto.name && dto.name !== existing.name) {
      await this.assertUniqueName(user.householdId, dto.name, dto.parentId ?? existing.parentId, id);
    }
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      select: CATEGORY_SELECT,
    });
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.getOwned(user, id);
    if (existing.isDefault) {
      throw new BadRequestException('Categorias padrão não podem ser removidas');
    }
    const [txCount, childCount] = await Promise.all([
      this.prisma.transaction.count({ where: { householdId: user.householdId, categoryId: id } }),
      this.prisma.category.count({ where: { householdId: user.householdId, parentId: id } }),
    ]);
    if (txCount > 0) {
      throw new BadRequestException('Categoria em uso por transações');
    }
    if (childCount > 0) {
      throw new BadRequestException('Remova as subcategorias antes');
    }
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  private async getOwned(user: AuthUser, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, householdId: user.householdId },
    });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  private async assertUniqueName(householdId: string, name: string, parentId: string | null, exceptId?: string) {
    const duplicate = await this.prisma.category.findFirst({
      where: { householdId, name, parentId, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    if (duplicate) {
      throw new BadRequestException('Já existe uma categoria com esse nome');
    }
  }
}
