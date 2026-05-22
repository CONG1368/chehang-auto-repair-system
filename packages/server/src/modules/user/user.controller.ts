import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Query() query: PaginationDto) {
    return this.userService.findAll(query);
  }

  // 技师列表（必须在 :id 之前，避免路由冲突）
  @Get('technicians')
  async findTechnicians() {
    return this.userService.findTechnicians();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
