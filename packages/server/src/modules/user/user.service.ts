import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // ========== 用户管理 ==========

  async findAll(query: PaginationDto) {
    const where: any = {};
    const [list, total] = await Promise.all([
      this.prisma.sysUser.findMany({
        skip: query.skip,
        take: query.take,
        where,
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sysUser.count({ where }),
    ]);
    // 去除密码字段
    const safeList = list.map(({ password, ...rest }) => rest);
    return new PaginatedResult(safeList, total, query.page!, query.pageSize!);
  }

  async findOne(id: number) {
    const user = await this.prisma.sysUser.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('用户不存在');
    const { password, ...rest } = user;
    return rest;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.sysUser.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('用户名已存在');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.sysUser.create({
      data: { ...dto, password: hashedPassword },
      include: { role: true },
    });
    const { password, ...rest } = user;
    return rest;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id); // 确保存在
    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    const user = await this.prisma.sysUser.update({ where: { id }, data, include: { role: true } });
    const { password, ...rest } = user;
    return rest;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.sysUser.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // ========== 角色管理 ==========

  async findAllRoles() {
    return this.prisma.sysRole.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findRoleOne(id: number) {
    const role = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.sysRole.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('角色编码已存在');
    return this.prisma.sysRole.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        permissions: dto.permissions ? JSON.stringify(dto.permissions) : undefined,
        status: dto.status ?? 1,
      },
    });
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    await this.findRoleOne(id);
    const data: any = { ...dto };
    if (dto.permissions) {
      data.permissions = JSON.stringify(dto.permissions);
    }
    return this.prisma.sysRole.update({ where: { id }, data });
  }

  async removeRole(id: number) {
    await this.findRoleOne(id);
    const userCount = await this.prisma.sysUser.count({ where: { roleId: id } });
    if (userCount > 0) throw new ConflictException('该角色下仍有用户，无法删除');
    await this.prisma.sysRole.delete({ where: { id } });
    return { message: '删除成功' };
  }
}
