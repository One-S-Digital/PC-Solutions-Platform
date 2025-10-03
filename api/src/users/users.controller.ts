import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      role,
      search,
    });
  }

  @Get('me')
  getCurrentUser(@Request() request) {
    return this.usersService.findByClerkId(request.user.clerkId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  updateCurrentUser(@Request() request, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateByClerkId(request.user.clerkId, updateUserDto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: UserRole,
  ) {
    return this.usersService.assignRole(id, role);
  }

  @Delete(':id/roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: UserRole,
  ) {
    return this.usersService.removeRole(id, role);
  }

  @Get('search/email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findByEmail(@Query('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get('org/:orgId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findByOrganization(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.usersService.findByOrganization(orgId);
  }
}