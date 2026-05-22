import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      sysUser: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      sysRole: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========== 用户管理 ==========

  describe('findAll', () => {
    it('应返回分页用户列表，且密码字段被排除', async () => {
      const mockUsers = [
        {
          id: 1,
          username: 'admin',
          password: 'hashed_admin',
          realName: '系统管理员',
          phone: '13800000001',
          email: 'admin@test.com',
          roleId: 1,
          status: 1,
          role: {
            id: 1,
            name: '超级管理员',
            code: 'super_admin',
            permissions: ['*'],
          },
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
        {
          id: 2,
          username: 'sales01',
          password: 'hashed_sales',
          realName: '张三',
          phone: '13800000002',
          email: 'zhangsan@test.com',
          roleId: 2,
          status: 1,
          role: {
            id: 2,
            name: '销售顾问',
            code: 'sales',
            permissions: ['sales:view', 'sales:create'],
          },
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
      ];

      mockPrisma.sysUser.findMany.mockResolvedValue(mockUsers);
      mockPrisma.sysUser.count.mockResolvedValue(2);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAll(query);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
      // 验证密码字段被排除
      result.list.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
      // 验证 username 和 role 依然存在
      expect(result.list[0].username).toBe('admin');
      expect(result.list[0].role).toBeDefined();
    });

    it('列表为空时应返回空数组和 total 0', async () => {
      mockPrisma.sysUser.findMany.mockResolvedValue([]);
      mockPrisma.sysUser.count.mockResolvedValue(0);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAll(query);

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('findMany 应包含 role 关联', async () => {
      mockPrisma.sysUser.findMany.mockResolvedValue([]);
      mockPrisma.sysUser.count.mockResolvedValue(0);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      await service.findAll(query);

      expect(mockPrisma.sysUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { role: true } }),
      );
    });
  });

  describe('findOne', () => {
    it('应返回用户且不含密码字段', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        password: 'hashed_admin',
        realName: '系统管理员',
        phone: '13800000001',
        email: 'admin@test.com',
        roleId: 1,
        status: 1,
        role: { id: 1, name: '超级管理员', code: 'super_admin' },
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      };
      mockPrisma.sysUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe('admin');
      expect(result.realName).toBe('系统管理员');
      expect(result.role).toBeDefined();
      expect(mockPrisma.sysUser.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { role: true },
      });
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.sysUser.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('用户不存在');
    });
  });

  describe('create', () => {
    it('创建用户时密码应被 bcrypt 哈希', async () => {
      const dto = {
        username: 'newuser',
        password: 'abc123',
        realName: '新用户',
        roleId: 2,
        status: 1,
      } as any;

      mockPrisma.sysUser.findUnique.mockResolvedValue(null);
      mockPrisma.sysUser.create.mockResolvedValue({
        id: 3,
        username: 'newuser',
        password: 'hashed_result',
        realName: '新用户',
        roleId: 2,
        status: 1,
        role: { id: 2, name: '销售顾问' },
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      });

      const result = await service.create(dto);

      // 返回结果不含密码
      expect(result).not.toHaveProperty('password');
      // 验证传给 create 的密码不是原始明文
      const createCall = mockPrisma.sysUser.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe('abc123');
      // 验证哈希后的密码是 bcrypt 格式（$2a$、$2b$ 或 $2y$ 开头）
      expect(createCall.data.password).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('返回结果不应包含 password 字段', async () => {
      const dto = {
        username: 'newuser2',
        password: 'test123',
        realName: '新用户2',
        roleId: 1,
      } as any;

      mockPrisma.sysUser.findUnique.mockResolvedValue(null);
      mockPrisma.sysUser.create.mockResolvedValue({
        id: 4,
        username: 'newuser2',
        password: 'hashed_result',
        realName: '新用户2',
        roleId: 1,
        status: 1,
        role: { id: 1, name: '超级管理员' },
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      });

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe('newuser2');
      expect(result.realName).toBe('新用户2');
      expect(result.role).toBeDefined();
    });

    it('重复 username 应抛出 ConflictException', async () => {
      const dto = {
        username: 'admin',
        password: 'abc123',
        realName: '重复用户',
        roleId: 1,
      } as any;

      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'hashed',
        realName: '系统管理员',
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow('用户名已存在');
    });
  });

  describe('update', () => {
    it('应更新用户基本信息', async () => {
      // findOne 内部调用（存在性检查）
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'oldhash',
        realName: '系统管理员',
        role: { id: 1, name: '超级管理员' },
      });
      mockPrisma.sysUser.update.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'oldhash',
        realName: '管理员新名',
        phone: '13900000000',
        email: 'newemail@test.com',
        role: { id: 1, name: '超级管理员' },
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      });

      const dto = {
        realName: '管理员新名',
        phone: '13900000000',
        email: 'newemail@test.com',
      } as any;
      const result = await service.update(1, dto);

      expect(result).not.toHaveProperty('password');
      expect(result.realName).toBe('管理员新名');
      expect(result.phone).toBe('13900000000');
      expect(mockPrisma.sysUser.update).toHaveBeenCalled();
    });

    it('更新密码时应重新 bcrypt 哈希', async () => {
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'oldhash',
        realName: '系统管理员',
        role: { id: 1, name: '超级管理员' },
      });
      mockPrisma.sysUser.update.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'newhash',
        realName: '系统管理员',
        role: { id: 1, name: '超级管理员' },
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      });

      const dto = { password: 'newpassword123' } as any;
      const result = await service.update(1, dto);

      expect(result).not.toHaveProperty('password');
      const updateCall = mockPrisma.sysUser.update.mock.calls[0][0];
      // 密码应被哈希，不是原始值
      expect(updateCall.data.password).not.toBe('newpassword123');
      expect(updateCall.data.password).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.sysUser.findUnique.mockResolvedValue(null);

      const dto = { realName: '新名字' } as any;
      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
      await expect(service.update(999, dto)).rejects.toThrow('用户不存在');
    });
  });

  describe('remove', () => {
    it('应删除用户并返回成功消息', async () => {
      // findOne 存在性检查
      mockPrisma.sysUser.findUnique.mockResolvedValue({
        id: 1,
        username: 'admin',
        password: 'hashed',
        realName: '系统管理员',
        role: { id: 1, name: '超级管理员' },
      });
      mockPrisma.sysUser.delete.mockResolvedValue({ id: 1 });

      const result = await service.remove(1);

      expect(result).toEqual({ message: '删除成功' });
      expect(mockPrisma.sysUser.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.sysUser.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow('用户不存在');
    });
  });

  // ========== 角色管理 ==========

  describe('findAllRoles', () => {
    it('应返回角色列表含已解析的 permissions', async () => {
      const mockRoles = [
        {
          id: 1,
          name: '超级管理员',
          code: 'super_admin',
          description: '拥有所有权限',
          permissions: ['*'],
          status: 1,
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
        {
          id: 2,
          name: '销售顾问',
          code: 'sales',
          description: '销售相关权限',
          permissions: ['sales:view', 'sales:create'],
          status: 1,
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
      ];

      mockPrisma.sysRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAllRoles();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('超级管理员');
      expect(result[0].permissions).toEqual(['*']);
      expect(result[1].permissions).toEqual(['sales:view', 'sales:create']);
    });

    it('permissions 是 JSON 字符串时应自动 JSON.parse', async () => {
      const mockRoles = [
        {
          id: 3,
          name: '测试角色',
          code: 'test_role',
          description: null,
          permissions: '["sales:view","sales:create"]' as any,
          status: 1,
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
      ];

      mockPrisma.sysRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAllRoles();

      expect(result[0].permissions).toEqual(['sales:view', 'sales:create']);
      expect(Array.isArray(result[0].permissions)).toBe(true);
    });

    it('permissions 为 null 时保持不变', async () => {
      const mockRoles = [
        {
          id: 4,
          name: '无权限角色',
          code: 'no_perms',
          description: null,
          permissions: null,
          status: 1,
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
      ];

      mockPrisma.sysRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAllRoles();

      // 当前代码实现：null 不做特殊转换，保持 null
      expect(result[0].permissions).toBeNull();
    });
  });

  describe('findRoleOne', () => {
    it('应返回单个角色含已解析的 permissions', async () => {
      const mockRole = {
        id: 1,
        name: '超级管理员',
        code: 'super_admin',
        description: '拥有所有权限',
        permissions: ['*'],
        status: 1,
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      };

      mockPrisma.sysRole.findUnique.mockResolvedValue(mockRole);

      const result = await service.findRoleOne(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('超级管理员');
      expect(result.permissions).toEqual(['*']);
      expect(mockPrisma.sysRole.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('permissions 为字符串时应自动 JSON.parse', async () => {
      const mockRole = {
        id: 2,
        name: '存储为字符串的角色',
        code: 'string_role',
        permissions: '["inventory:view"]' as any,
        status: 1,
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      };

      mockPrisma.sysRole.findUnique.mockResolvedValue(mockRole);

      const result = await service.findRoleOne(2);

      expect(Array.isArray(result.permissions)).toBe(true);
      expect(result.permissions).toEqual(['inventory:view']);
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.sysRole.findUnique.mockResolvedValue(null);

      await expect(service.findRoleOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findRoleOne(999)).rejects.toThrow('角色不存在');
    });
  });

  describe('createRole', () => {
    it('应创建角色并返回', async () => {
      const dto = {
        name: '测试角色',
        code: 'test_role',
        description: '测试用角色',
        permissions: ['sales:view'],
        status: 1,
      } as any;

      mockPrisma.sysRole.findUnique.mockResolvedValue(null);
      mockPrisma.sysRole.create.mockResolvedValue({
        id: 3,
        name: '测试角色',
        code: 'test_role',
        description: '测试用角色',
        permissions: ['sales:view'],
        status: 1,
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      });

      const result = await service.createRole(dto);

      expect(result.name).toBe('测试角色');
      expect(result.code).toBe('test_role');
      expect(result.permissions).toEqual(['sales:view']);
      expect(mockPrisma.sysRole.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: '测试角色',
            code: 'test_role',
          }),
        }),
      );
    });

    it('重复 code 应抛出 ConflictException', async () => {
      const dto = {
        name: '重复角色',
        code: 'super_admin',
        description: '重复编码',
        permissions: [],
      } as any;

      mockPrisma.sysRole.findUnique.mockResolvedValue({
        id: 1,
        name: '超级管理员',
        code: 'super_admin',
        permissions: ['*'],
      });

      await expect(service.createRole(dto)).rejects.toThrow(ConflictException);
      await expect(service.createRole(dto)).rejects.toThrow('角色编码已存在');
    });
  });

  describe('updateRole', () => {
    it('应更新角色信息', async () => {
      mockPrisma.sysRole.findUnique.mockResolvedValue({
        id: 1,
        name: '超级管理员',
        code: 'super_admin',
        permissions: ['*'],
      });
      mockPrisma.sysRole.update.mockResolvedValue({
        id: 1,
        name: '管理员更新',
        code: 'super_admin',
        description: '更新后的描述',
        permissions: ['*', 'audit:view'],
        status: 1,
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      });

      const dto = {
        name: '管理员更新',
        description: '更新后的描述',
        permissions: ['*', 'audit:view'],
      } as any;
      const result = await service.updateRole(1, dto);

      expect(result.name).toBe('管理员更新');
      expect(result.permissions).toEqual(['*', 'audit:view']);
      expect(mockPrisma.sysRole.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.sysRole.findUnique.mockResolvedValue(null);

      const dto = { name: '新名称' } as any;
      await expect(service.updateRole(999, dto)).rejects.toThrow(NotFoundException);
      await expect(service.updateRole(999, dto)).rejects.toThrow('角色不存在');
    });
  });

  describe('removeRole', () => {
    it('应删除角色并返回成功消息', async () => {
      mockPrisma.sysRole.findUnique.mockResolvedValue({
        id: 3,
        name: '测试角色',
        code: 'test_role',
        permissions: [],
      });
      // 没有关联用户
      mockPrisma.sysUser.count.mockResolvedValue(0);
      mockPrisma.sysRole.delete.mockResolvedValue({ id: 3 });

      const result = await service.removeRole(3);

      expect(result).toEqual({ message: '删除成功' });
      expect(mockPrisma.sysRole.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.sysRole.findUnique.mockResolvedValue(null);

      await expect(service.removeRole(999)).rejects.toThrow(NotFoundException);
      await expect(service.removeRole(999)).rejects.toThrow('角色不存在');
    });

    it('有关联用户时抛出 ConflictException', async () => {
      mockPrisma.sysRole.findUnique.mockResolvedValue({
        id: 1,
        name: '超级管理员',
        code: 'super_admin',
        permissions: ['*'],
      });
      // 有 5 个用户关联此角色
      mockPrisma.sysUser.count.mockResolvedValue(5);

      await expect(service.removeRole(1)).rejects.toThrow(ConflictException);
      await expect(service.removeRole(1)).rejects.toThrow('该角色下仍有用户，无法删除');
      // 确保没有调用 delete
      expect(mockPrisma.sysRole.delete).not.toHaveBeenCalled();
    });
  });
});
