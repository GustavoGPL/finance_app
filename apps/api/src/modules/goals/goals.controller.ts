import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.goalsService.findAll(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.goalsService.remove(user, id);
  }

  @Post(':id/contributions')
  addContribution(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddContributionDto,
  ) {
    return this.goalsService.addContribution(user, id, dto);
  }

  @Delete(':id/contributions/:contributionId')
  removeContribution(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
  ) {
    return this.goalsService.removeContribution(user, id, contributionId);
  }
}
