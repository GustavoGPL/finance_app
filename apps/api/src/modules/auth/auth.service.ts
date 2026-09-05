import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { seedDefaultCategories } from '@finance/database';
import type { MemberRole, User } from '@finance/database';
import { PrismaService } from '../../common/prisma.service';
import { sha256, ttlToMs } from '../../common/token.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  memberRole: true,
  householdId: true,
  createdAt: true,
} as const;

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    let householdId: string;
    let memberRole: MemberRole = 'USER_A';

    if (dto.inviteCode) {
      const code = dto.inviteCode.trim().toUpperCase();
      const household = await this.prisma.household.findUnique({ where: { inviteCode: code } });
      if (!household) {
        throw new BadRequestException('Código de convite inválido');
      }
      householdId = household.id;
      memberRole = 'USER_B';
    } else {
      const inviteCode = await this.generateInviteCode();
      const household = await this.prisma.household.create({
        data: { name: dto.householdName ?? `${dto.name.split(' ')[0]} e família`, inviteCode },
      });
      householdId = household.id;
      await seedDefaultCategories(this.prisma, householdId);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, memberRole, householdId },
      select: USER_SELECT,
    });

    const tokens = await this.issueTokenPair(user);
    return {
      user,
      household: await this.prisma.household.findUniqueOrThrow({ where: { id: householdId } }),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const safeUser = this.toSafeUser(user);
    const tokens = await this.issueTokenPair(safeUser);
    return { user: safeUser, ...tokens };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = sha256(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    const safeUser = this.toSafeUser(user);
    const tokens = await this.issueTokenPair(safeUser);
    return { user: safeUser, ...tokens };
  }

  async logout(dto: RefreshTokenDto) {
    const tokenHash = sha256(dto.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async generateInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const buf = randomBytes(8);
      let raw = '';
      for (const byte of buf) {
        raw += INVITE_CHARS[byte % INVITE_CHARS.length];
      }
      const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      const exists = await this.prisma.household.findUnique({ where: { inviteCode: code } });
      if (!exists) {
        return code;
      }
    }
    throw new ConflictException('Não foi possível gerar um código de convite único');
  }

  private async issueTokenPair(user: {
    id: string;
    email: string;
    name: string;
    memberRole: MemberRole;
    householdId: string;
  }) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
      memberRole: user.memberRole,
      householdId: user.householdId,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const refreshTtlMs = ttlToMs(this.config.get<string>('REFRESH_TOKEN_TTL') ?? '30d');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.config.get<string>('ACCESS_TOKEN_TTL') ?? '15m',
    };
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      memberRole: user.memberRole,
      householdId: user.householdId,
      createdAt: user.createdAt,
    };
  }
}
