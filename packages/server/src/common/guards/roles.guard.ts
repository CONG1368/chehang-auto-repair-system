import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string[]>('requiredPermissions', context.getHandler());
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.roleId) return false;

    const role = await this.prisma.sysRole.findUnique({ where: { id: user.roleId } });
    if (!role?.permissions) return false;

    const permissions: string[] =
      typeof role.permissions === 'string'
        ? JSON.parse(role.permissions as string)
        : (role.permissions as string[]);

    if (permissions.includes('*')) return true;
    return required.some((p) => permissions.includes(p));
  }
}
