import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    return this.userService.findAllRoles();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findRoleOne(+id);
  }

  @Post()
  async create(@Body() dto: CreateRoleDto) {
    return this.userService.createRole(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.userService.updateRole(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.removeRole(+id);
  }
}
