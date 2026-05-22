import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取路由所需权限（与 RequirePermissions 装饰器 key 一致）
    const required = this.reflector.get<string[]>('requiredPermissions', context.getHandler());
    // 路由未设置权限要求 → 允许访问
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.roleId) {
      throw new ForbiddenException('用户未绑定角色，无权访问');
    }

    // 从数据库获取用户角色权限
    const role = await this.prisma.sysRole.findUnique({ where: { id: user.roleId } });
    if (!role?.permissions) {
      throw new ForbiddenException('用户角色无权限配置');
    }

    // 防御性解析：处理历史数据中可能存在的双重编码
    const permissions: string[] =
      typeof role.permissions === 'string'
        ? JSON.parse(role.permissions as string)
        : (role.permissions as string[]);

    // 超级管理员（permissions 包含 *）→ 允许所有操作
    if (permissions.includes('*')) return true;

    // 用户权限包含路由所需权限之一 → 允许
    if (required.some((p) => permissions.includes(p))) return true;

    // 权限不足 → 禁止访问
    throw new ForbiddenException('权限不足，无法访问该资源');
  }
}
