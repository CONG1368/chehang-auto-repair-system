import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据...');

  // 1. 创建角色
  const roles = await Promise.all([
    prisma.sysRole.create({
      data: {
        name: '超级管理员',
        code: 'admin',
        description: '系统最高权限',
        permissions: JSON.stringify(['*']),
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '店长/经理',
        code: 'manager',
        description: '查看所有数据和管理权限',
        permissions: JSON.stringify(['dashboard', 'sales', 'repair', 'beauty', 'finance', 'inventory', 'customer', 'report']),
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '销售顾问',
        code: 'sales_consultant',
        description: '负责整车销售',
        permissions: JSON.stringify(['sales', 'customer:view']),
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '服务顾问',
        code: 'service_advisor',
        description: '负责维修接车和客户服务',
        permissions: JSON.stringify(['repair', 'customer:view']),
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '维修技师',
        code: 'technician',
        description: '负责车辆维修',
        permissions: JSON.stringify(['repair:view', 'repair:update']),
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '配件管理员',
        code: 'inventory_keeper',
        description: '负责配件库存管理',
        permissions: JSON.stringify(['inventory']),
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '财务人员',
        code: 'finance_staff',
        description: '负责收银和财务报表',
        permissions: JSON.stringify(['finance', 'report:view']),
        status: 1,
      },
    }),
  ]);
  console.log(`✅ 创建了 ${roles.length} 个角色`);

  // 2. 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.sysUser.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      realName: '系统管理员',
      phone: '13800000000',
      roleId: roles[0].id,
      status: 1,
    },
  });

  const testUsers = [
    { username: 'manager', realName: '张店长', phone: '13800000001', roleIdx: 1 },
    { username: 'sales', realName: '李销售', phone: '13800000002', roleIdx: 2 },
    { username: 'advisor', realName: '王顾问', phone: '13800000003', roleIdx: 3 },
    { username: 'tech', realName: '赵技师', phone: '13800000004', roleIdx: 4 },
    { username: 'keeper', realName: '钱库管', phone: '13800000005', roleIdx: 5 },
    { username: 'finance', realName: '孙财务', phone: '13800000006', roleIdx: 6 },
  ];
  for (const u of testUsers) {
    await prisma.sysUser.create({
      data: {
        username: u.username,
        password: hashedPassword,
        realName: u.realName,
        phone: u.phone,
        roleId: roles[u.roleIdx].id,
        status: 1,
      },
    });
  }
  console.log(`✅ 创建了 ${testUsers.length + 1} 个用户`);

  // 3. 创建配件分类
  const categories = await Promise.all([
    prisma.partCategory.create({ data: { name: '发动机配件', sortOrder: 1 } }),
    prisma.partCategory.create({ data: { name: '底盘配件', sortOrder: 2 } }),
    prisma.partCategory.create({ data: { name: '电气配件', sortOrder: 3 } }),
    prisma.partCategory.create({ data: { name: '车身配件', sortOrder: 4 } }),
    prisma.partCategory.create({ data: { name: '保养用品', sortOrder: 5 } }),
    prisma.partCategory.create({ data: { name: '美容用品', sortOrder: 6 } }),
    prisma.partCategory.create({ data: { name: '轮胎轮毂', sortOrder: 7 } }),
  ]);
  console.log(`✅ 创建了 ${categories.length} 个配件分类`);

  // 4. 创建供应商
  await prisma.supplier.createMany({
    data: [
      { name: '博世汽车配件有限公司', contact: '周经理', phone: '13900000001', status: 1 },
      { name: '壳牌润滑油代理', contact: '吴经理', phone: '13900000002', status: 1 },
      { name: '米其林轮胎经销商', contact: '郑经理', phone: '13900000003', status: 1 },
      { name: '3M汽车美容用品', contact: '陈经理', phone: '13900000004', status: 1 },
    ],
  });
  console.log('✅ 创建了 4 个供应商');

  // 5. 创建示例配件
  const suppliers = await prisma.supplier.findMany();
  const sampleParts = [
    { code: 'P001', name: '机油滤清器', spec: '通用型', categoryId: categories[0].id, supplierId: suppliers[0].id, price: 80, cost: 50, safetyStock: 20, maxStock: 200 },
    { code: 'P002', name: '空气滤清器', spec: '通用型', categoryId: categories[0].id, supplierId: suppliers[0].id, price: 120, cost: 70, safetyStock: 15, maxStock: 150 },
    { code: 'P003', name: '刹车片', spec: '前轮', categoryId: categories[1].id, supplierId: suppliers[0].id, price: 380, cost: 240, safetyStock: 10, maxStock: 100 },
    { code: 'P004', name: '火花塞', spec: '铂金', categoryId: categories[0].id, supplierId: suppliers[0].id, price: 150, cost: 90, safetyStock: 30, maxStock: 300 },
    { code: 'P005', name: '机油 5W-30', spec: '4L装', categoryId: categories[4].id, supplierId: suppliers[1].id, price: 350, cost: 220, safetyStock: 40, maxStock: 400 },
    { code: 'P006', name: '轮胎 205/55R16', spec: '91V', categoryId: categories[6].id, supplierId: suppliers[2].id, price: 680, cost: 450, safetyStock: 8, maxStock: 80 },
    { code: 'P007', name: '空调滤清器', spec: '活性炭', categoryId: categories[0].id, supplierId: suppliers[0].id, price: 160, cost: 95, safetyStock: 25, maxStock: 250 },
    { code: 'P008', name: '雨刮器', spec: '无骨', categoryId: categories[3].id, supplierId: suppliers[0].id, price: 90, cost: 50, safetyStock: 30, maxStock: 300 },
  ];

  for (const p of sampleParts) {
    const part = await prisma.part.create({
      data: {
        code: p.code, name: p.name, spec: p.spec, categoryId: p.categoryId,
        supplierId: p.supplierId, price: p.price, cost: p.cost,
        safetyStock: p.safetyStock, maxStock: p.maxStock,
      },
    });
    await prisma.partStock.create({ data: { partId: part.id, quantity: p.safetyStock * 2 } });
  }
  console.log(`✅ 创建了 ${sampleParts.length} 个示例配件`);

  // 6. 创建美容服务项目
  await prisma.beautyService.createMany({
    data: [
      { name: '精洗', category: '清洗类', price: 88, duration: 60 },
      { name: '内饰清洗', category: '清洗类', price: 280, duration: 120 },
      { name: '发动机清洗', category: '清洗类', price: 380, duration: 90 },
      { name: '打蜡', category: '护理类', price: 180, duration: 60 },
      { name: '镀晶', category: '护理类', price: 1280, duration: 180 },
      { name: '镀膜', category: '护理类', price: 880, duration: 120 },
      { name: '空调清洗', category: '养护类', price: 298, duration: 60 },
    ],
  });
  console.log('✅ 创建了 7 个美容服务项目');

  // 7. 创建美容套餐
  await prisma.beautyPackage.createMany({
    data: [
      { name: '新车呵护套餐', originalPrice: 1280, packagePrice: 980, items: JSON.stringify(['精洗', '镀晶', '内饰清洗']) },
      { name: '换季保养套餐', originalPrice: 580, packagePrice: 458, items: JSON.stringify(['空调清洗', '消毒除味', '滤芯更换']) },
      { name: '深度清洁套餐', originalPrice: 880, packagePrice: 698, items: JSON.stringify(['精洗', '内饰清洗', '发动机清洗']) },
      { name: '全年护理套餐', originalPrice: 1560, packagePrice: 1280, items: JSON.stringify(['12次洗车', '4次打蜡']) },
    ],
  });
  console.log('✅ 创建了 4 个美容套餐');

  // 8. 创建会员卡类型
  await prisma.memberCard.createMany({
    data: [
      { cardNo: 'MC001', name: '普通卡', level: 1, discount: 9.5, minRecharge: 0 },
      { cardNo: 'MC002', name: '银卡', level: 2, discount: 9.0, minRecharge: 2000 },
      { cardNo: 'MC003', name: '金卡', level: 3, discount: 8.5, minRecharge: 5000 },
      { cardNo: 'MC004', name: '钻石卡', level: 4, discount: 8.0, minRecharge: 10000 },
    ],
  });
  console.log('✅ 创建了 4 种会员卡类型');

  // 9. 创建示例客户
  const customer1 = await prisma.customer.create({
    data: { name: '测试客户A', phone: '13811111111', gender: 1, source: '到店', tags: '新车,高意向', status: 1 },
  });
  await prisma.customerVehicle.create({
    data: { customerId: customer1.id, plateNumber: '苏A12345', brand: '丰田', series: '卡罗拉', model: '2023款 1.2T', mileage: 15000 },
  });

  const customer2 = await prisma.customer.create({
    data: { name: '测试客户B', phone: '13822222222', gender: 0, source: '电话', tags: '维修,老客户', status: 1 },
  });
  await prisma.customerVehicle.create({
    data: { customerId: customer2.id, plateNumber: '苏A67890', brand: '大众', series: '帕萨特', model: '2022款 330TSI', mileage: 35000 },
  });
  console.log('✅ 创建了 2 个示例客户');

  console.log('\n🎉 数据初始化完成！');
  console.log('📋 默认账号: admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
