import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { VISIBILITIES, type Visibility } from '@finance/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DashboardService } from './dashboard.service';

class QueryDashboardDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsEnum(VISIBILITIES)
  visibility?: Visibility;
}

class QueryNetWorthDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;

  @IsOptional()
  @IsEnum(VISIBILITIES)
  visibility?: Visibility;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser, @Query() q: QueryDashboardDto) {
    return this.dashboardService.overview(user, q);
  }

  @Get('categories')
  categories(@CurrentUser() user: AuthUser, @Query() q: QueryDashboardDto) {
    return this.dashboardService.categories(user, q);
  }

  @Get('net-worth')
  netWorth(@CurrentUser() user: AuthUser, @Query() q: QueryNetWorthDto) {
    return this.dashboardService.netWorth(user, q.months ?? 6, q.visibility ?? 'SELF');
  }

  @Get('couple-split')
  coupleSplit(@CurrentUser() user: AuthUser, @Query() q: QueryDashboardDto) {
    return this.dashboardService.coupleSplit(user, q);
  }
}
