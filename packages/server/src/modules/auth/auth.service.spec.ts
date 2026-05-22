import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwt: any;

  beforeEach(async () => {
    mockPrisma = {
      sysUser: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockJwt = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('正确账号密码应返回 token', async () => {
      const hashedPwd = await bcrypt.hash('admin123', 10);
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1, username: 'admin', password: hashedPwd, status: 1, roleId: 1,
      });
      mockPrisma.sysUser.update.mockResolvedValue({});

      const result = await service.login('admin', 'admin123');
      expect(result).toHaveProperty('token', 'mock-jwt-token');
    });

    it('错误密码应抛出异常', async () => {
      const hashedPwd = await bcrypt.hash('admin123', 10);
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1, username: 'admin', password: hashedPwd, status: 1,
      });

      await expect(service.login('admin', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('不存在的用户应抛出异常', async () => {
      mockPrisma.sysUser.findUnique.mockResolvedValue(null);
      await expect(service.login('nobody', 'xxx'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('已禁用的用户应抛出异常', async () => {
      const hashedPwd = await bcrypt.hash('admin123', 10);
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1, username: 'admin', password: hashedPwd, status: 0,
      });

      await expect(service.login('admin', 'admin123'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserInfo', () => {
    it('应返回用户信息及权限', async () => {
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1,
        username: 'admin',
        realName: '管理员',
        phone: '13800000000',
        email: 'admin@test.com',
        avatar: null,
        roleId: 1,
        role: { id: 1, name: '超级管理员', permissions: ['*'] },
      });

      const result = await service.getUserInfo(1);
      expect(result.realName).toBe('管理员');
      expect(result.permissions).toEqual(['*']);
    });

    it('角色无权限时应返回空数组', async () => {
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 2,
        username: 'user1',
        realName: '用户1',
        roleId: 2,
        role: { id: 2, name: '普通角色', permissions: null },
      });

      const result = await service.getUserInfo(2);
      expect(result.permissions).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('应更新用户资料', async () => {
      mockPrisma.sysUser.update.mockResolvedValue({
        id: 1, username: 'admin', realName: '新名字',
        phone: '13900000000', email: 'new@test.com', avatar: null,
        roleId: 1, role: { id: 1, name: '管理员', permissions: ['*'] },
      });

      const result = await service.updateProfile(1, {
        realName: '新名字',
        phone: '13900000000',
        email: 'new@test.com',
        avatar: undefined,
      });
      expect(result.realName).toBe('新名字');
    });
  });
});
