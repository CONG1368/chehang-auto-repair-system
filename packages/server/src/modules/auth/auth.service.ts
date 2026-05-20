import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    if (user.status === 0) throw new UnauthorizedException('账号已被禁用');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('用户名或密码错误');

    // 更新最后登录时间
    await this.prisma.sysUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { id: user.id, username: user.username, roleId: user.roleId };
    const token = this.jwtService.sign(payload);

    return { token };
  }

  async getUserInfo(userId: number) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException('用户不存在');

    let permissions: string[] = [];
    if (user.role?.permissions) {
      permissions = typeof user.role.permissions === 'string'
        ? JSON.parse(user.role.permissions as string)
        : (user.role.permissions as any);
    }

    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      phone: user.phone,
      roleId: user.roleId,
      roleName: user.role?.name || '',
      permissions,
    };
  }
}
