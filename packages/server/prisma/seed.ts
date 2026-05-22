import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化数据...');

  // 清空所有业务数据（反向依赖顺序：先删子表再删父表）
  await prisma.paymentRecord.deleteMany();
  await prisma.repairOrderItem.deleteMany();
  await prisma.dispatchRecord.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.repairOrder.deleteMany();
  await prisma.leadFollowRecord.deleteMany();
  await prisma.salesLead.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.vehicleInfo.deleteMany();
  await prisma.stockRecord.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.beautyAppointment.deleteMany();
  await prisma.beautyPackage.deleteMany();
  await prisma.beautyService.deleteMany();
  await prisma.memberCardRecharge.deleteMany();
  await prisma.invoiceRecord.deleteMany();
  await prisma.receivable.deleteMany();
  await prisma.payable.deleteMany();
  await prisma.followRecord.deleteMany();
  await prisma.customerVehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.expenseRecord.deleteMany();
  await prisma.memberCard.deleteMany();
  await prisma.partStock.deleteMany();
  await prisma.part.deleteMany();
  await prisma.partCategory.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.sysUser.deleteMany();
  await prisma.sysRole.deleteMany();
  console.log('🧹 已清空旧数据');

  // 1. 创建角色
  const roles = await Promise.all([
    prisma.sysRole.create({
      data: {
        name: '超级管理员',
        code: 'admin',
        description: '系统最高权限',
        permissions: ['*'],
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '店长/经理',
        code: 'manager',
        description: '查看所有数据和管理权限',
        permissions: ['dashboard', 'sales', 'repair', 'beauty', 'finance', 'inventory', 'customer', 'report'],
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '销售顾问',
        code: 'sales_consultant',
        description: '负责整车销售',
        permissions: ['sales', 'customer:view'],
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '服务顾问',
        code: 'service_advisor',
        description: '负责维修接车和客户服务',
        permissions: ['repair', 'customer:view'],
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '维修技师',
        code: 'technician',
        description: '负责车辆维修',
        permissions: ['repair:view', 'repair:update'],
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '配件管理员',
        code: 'inventory_keeper',
        description: '负责配件库存管理',
        permissions: ['inventory'],
        status: 1,
      },
    }),
    prisma.sysRole.create({
      data: {
        name: '财务人员',
        code: 'finance_staff',
        description: '负责收银和财务报表',
        permissions: ['finance', 'report:view'],
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
      { name: '新车呵护套餐', originalPrice: 1280, packagePrice: 980, items: ['精洗', '镀晶', '内饰清洗'] },
      { name: '换季保养套餐', originalPrice: 580, packagePrice: 458, items: ['空调清洗', '消毒除味', '滤芯更换'] },
      { name: '深度清洁套餐', originalPrice: 880, packagePrice: 698, items: ['精洗', '内饰清洗', '发动机清洗'] },
      { name: '全年护理套餐', originalPrice: 1560, packagePrice: 1280, items: ['12次洗车', '4次打蜡'] },
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

  // 9.5 创建更多客户用于经营模拟
  const c3 = await prisma.customer.create({
    data: { name: '刘先生', phone: '13911111111', gender: 1, source: '到店', tags: '高意向,新车', status: 1 },
  });
  await prisma.customerVehicle.create({
    data: { customerId: c3.id, plateNumber: '苏B11111', brand: '丰田', series: '卡罗拉', model: '2024款 1.2T', mileage: 5000 },
  });
  const c4 = await prisma.customer.create({
    data: { name: '陈女士', phone: '13922222222', gender: 0, source: '朋友介绍', tags: '美容,VIP', status: 1 },
  });
  await prisma.customerVehicle.create({
    data: { customerId: c4.id, plateNumber: '苏B22222', brand: '比亚迪', series: '汉', model: '2024款 DM-i', mileage: 8000 },
  });
  const c5 = await prisma.customer.create({
    data: { name: '周先生', phone: '13933333333', gender: 1, source: '网络', tags: '维修,保养', status: 1 },
  });
  await prisma.customerVehicle.create({
    data: { customerId: c5.id, plateNumber: '苏B33333', brand: '大众', series: '迈腾', model: '2023款 330TSI', mileage: 28000 },
  });
  console.log('✅ 补充创建了 3 个客户');

  // 10. 创建展车库存（车辆信息）
  const vehicles = await Promise.all([
    prisma.vehicleInfo.create({ data: { brand: '丰田', series: '卡罗拉', model: '2024款 1.2T 先锋版', yearModel: '2024', color: '白色', vin: 'LFMA1234567890001', guidePrice: 129800, salePrice: 119800, minPrice: 115000, stockStatus: '在库', location: 'A区-1号', status: 1 } }),
    prisma.vehicleInfo.create({ data: { brand: '本田', series: '雅阁', model: '2024款 260TURBO 豪华版', yearModel: '2024', color: '黑色', vin: 'LHGCM4567890123456', guidePrice: 199800, salePrice: 189800, minPrice: 183000, stockStatus: '在库', location: 'A区-2号', status: 1 } }),
    prisma.vehicleInfo.create({ data: { brand: '大众', series: '迈腾', model: '2024款 330TSI 领先型', yearModel: '2024', color: '银色', vin: 'LSVDN7890123456789', guidePrice: 219900, salePrice: 209900, minPrice: 203000, stockStatus: '在库', location: 'A区-3号', status: 1 } }),
    prisma.vehicleInfo.create({ data: { brand: '比亚迪', series: '汉', model: '2024款 DM-i 冠军版', yearModel: '2024', color: '红色', vin: 'LC0C7654321000001', guidePrice: 249800, salePrice: 239800, minPrice: 233000, stockStatus: '在途', location: '待入库', status: 1 } }),
    prisma.vehicleInfo.create({ data: { brand: '丰田', series: '凯美瑞', model: '2024款 2.0G 豪华版', yearModel: '2024', color: '黑色', vin: 'LVGBH6789000000001', guidePrice: 199800, salePrice: 185000, minPrice: 180000, stockStatus: '已售', location: 'B区-已售', status: 1 } }),
    prisma.vehicleInfo.create({ data: { brand: '吉利', series: '星越L', model: '2024款 2.0TD 高功版', yearModel: '2024', color: '蓝色', vin: 'L6T78234560000002', guidePrice: 165800, salePrice: 155800, minPrice: 150000, stockStatus: '已售', location: 'B区-已售', status: 1 } }),
  ]);
  console.log(`✅ 创建了 ${vehicles.length} 辆展车库存`);

  // 11. 创建销售线索
  const allUsers = await prisma.sysUser.findMany();
  const getUid = (uname: string) => allUsers.find(u => u.username === uname)!.id;
  const leads = await Promise.all([
    prisma.salesLead.create({ data: { customerId: customer1.id, userId: getUid('sales'), source: '到店', intent: '高', intentModel: '卡罗拉 2024款', budget: 120000, status: '跟进中', nextFollowAt: new Date(Date.now() + 3 * 86400000), remark: '已试驾，对比价格中' } }),
    prisma.salesLead.create({ data: { customerId: c3.id, userId: getUid('sales'), source: '网络', intent: '中', intentModel: '雅阁 2024款', budget: 190000, status: '新线索', remark: '网站留资，待电话回访' } }),
    prisma.salesLead.create({ data: { customerId: c4.id, userId: getUid('sales'), source: '朋友介绍', intent: '高', intentModel: '汉 DM-i 冠军版', budget: 240000, status: '已成交', remark: '已转为销售订单' } }),
    prisma.salesLead.create({ data: { customerId: c5.id, userId: getUid('sales'), source: '电话', intent: '低', intentModel: '迈腾 2024款', budget: 210000, status: '已流失', remark: '竞品价格更优，已购其他品牌' } }),
  ]);
  console.log(`✅ 创建了 ${leads.length} 条销售线索`);

  // 12. 创建销售订单
  const soPrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [v_corolla, v_accord, v_magotan] = vehicles;
  const so1 = await prisma.salesOrder.create({
    data: { orderNo: `SO${soPrefix}-001`, customerId: c3.id, vehicleId: v_corolla.id, salePrice: 119800, discount: 2800, deposit: 20000, totalAmount: 117000, paymentMethod: '银行卡', status: '已签约', salesId: getUid('sales') },
  });
  const so2 = await prisma.salesOrder.create({
    data: { orderNo: `SO${soPrefix}-002`, customerId: c4.id, vehicleId: v_corolla.id, salePrice: 239800, discount: 2000, deposit: 30000, totalAmount: 237800, paymentMethod: '银行卡', status: '已交付', deliveryDate: new Date(Date.now() - 2 * 86400000), salesId: getUid('sales') },
  });
  const so3 = await prisma.salesOrder.create({
    data: { orderNo: `SO${soPrefix}-003`, customerId: c5.id, vehicleId: v_magotan.id, salePrice: 209900, totalAmount: 209900, status: '待签约', salesId: getUid('sales') },
  });
  console.log('✅ 创建了 3 个销售订单');

  // 13. 创建维修工单（含施工项目）
  const allCustVehicles = await prisma.customerVehicle.findMany();
  const getVeh = (plate: string) => allCustVehicles.find(v => v.plateNumber === plate)!;
  const roDate = new Date();
  const roPrefix = roDate.toISOString().slice(0, 10).replace(/-/g, '');

  const ro1 = await prisma.repairOrder.create({
    data: {
      orderNo: `RO${roPrefix}-001`, customerId: customer2.id, vehicleId: getVeh('苏A67890').id,
      plateNumber: '苏A67890', vehicleModel: '帕萨特 2022款 330TSI', mileage: 35000,
      status: 'quality_check', faultDesc: '刹车异响，方向盘抖动',
      totalLaborFee: 380, totalPartFee: 620, totalAmount: 1000, discount: 0, finalAmount: 1000,
      advisorId: getUid('advisor'), estCompleteTime: new Date(Date.now() + 2 * 86400000),
    },
  });
  await prisma.repairOrderItem.createMany({
    data: [
      { repairOrderId: ro1.id, type: 'labor', name: '刹车系统检查', laborFee: 180, amount: 180, status: 'completed' },
      { repairOrderId: ro1.id, type: 'labor', name: '四轮定位', laborFee: 200, amount: 200, status: 'completed' },
      { repairOrderId: ro1.id, type: 'part', name: '前刹车片', partFee: 380, amount: 380, status: 'completed' },
      { repairOrderId: ro1.id, type: 'part', name: '方向盘减震器', partFee: 240, amount: 240, status: 'completed' },
    ],
  });

  const ro2 = await prisma.repairOrder.create({
    data: {
      orderNo: `RO${roPrefix}-002`, customerId: customer1.id, vehicleId: getVeh('苏A12345').id,
      plateNumber: '苏A12345', vehicleModel: '卡罗拉 2023款 1.2T', mileage: 15000,
      status: 'completed', faultDesc: '定期保养，更换机油机滤',
      totalLaborFee: 120, totalPartFee: 430, totalAmount: 550, discount: 50, finalAmount: 500,
      advisorId: getUid('advisor'), actualCompleteTime: new Date(Date.now() - 1 * 86400000),
    },
  });
  await prisma.repairOrderItem.createMany({
    data: [
      { repairOrderId: ro2.id, type: 'labor', name: '保养工时', laborFee: 120, amount: 120, status: 'completed' },
      { repairOrderId: ro2.id, type: 'part', name: '机油 5W-30 4L', partFee: 350, amount: 350, status: 'completed' },
      { repairOrderId: ro2.id, type: 'part', name: '机油滤清器', partFee: 80, amount: 80, status: 'completed' },
    ],
  });

  const ro3 = await prisma.repairOrder.create({
    data: {
      orderNo: `RO${roPrefix}-003`, customerId: c5.id, vehicleId: getVeh('苏B33333').id,
      plateNumber: '苏B33333', vehicleModel: '迈腾 2023款 330TSI', mileage: 28000,
      status: 'repairing', faultDesc: '空调制冷效果差',
      totalLaborFee: 200, totalPartFee: 0, totalAmount: 200, discount: 0, finalAmount: 200,
      advisorId: getUid('advisor'),
    },
  });
  await prisma.repairOrderItem.createMany({
    data: [
      { repairOrderId: ro3.id, type: 'labor', name: '空调系统检测', laborFee: 200, amount: 200, status: 'pending' },
    ],
  });
  console.log('✅ 创建了 3 个维修工单（含施工项目）');

  // 14. 创建收款记录（跨日期、多支付方式）
  const payDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);
  const [custA, custB] = [customer1, customer2];
  await prisma.paymentRecord.createMany({
    data: [
      // 维修收款
      { paymentNo: `PAO${roPrefix}-001`, customerId: custB.id, repairOrderId: ro1.id, type: 'repair', amount: 1000, paymentMethod: '微信', discount: 0, status: 'completed', operatorId: getUid('finance'), createdAt: payDate(0) },
      { paymentNo: `PAO${roPrefix}-002`, customerId: custA.id, repairOrderId: ro2.id, type: 'repair', amount: 500, paymentMethod: '现金', discount: 50, status: 'completed', operatorId: getUid('finance'), createdAt: payDate(1) },
      // 销售收款
      { paymentNo: `PAO${roPrefix}-003`, customerId: c3.id, salesOrderId: so1.id, type: 'sales', amount: 20000, paymentMethod: '银行卡', status: 'completed', operatorId: getUid('finance'), createdAt: payDate(1) },
      { paymentNo: `PAO${roPrefix}-004`, customerId: c4.id, salesOrderId: so2.id, type: 'sales', amount: 30000, paymentMethod: '银行卡', status: 'completed', operatorId: getUid('finance'), createdAt: payDate(2) },
      // 美容收款（无实际预约关联，仅用于报表）
      { paymentNo: `PAO${roPrefix}-005`, customerId: c4.id, type: 'beauty', amount: 698, paymentMethod: '支付宝', discount: 0, status: 'completed', operatorId: getUid('finance'), createdAt: payDate(0) },
      { paymentNo: `PAO${roPrefix}-006`, customerId: custA.id, type: 'beauty', amount: 88, paymentMethod: '微信', discount: 0, status: 'completed', operatorId: getUid('finance'), createdAt: payDate(3) },
      // 更多历史收款（丰富报表数据）
      { paymentNo: `PAO${roPrefix}-007`, customerId: c5.id, type: 'repair', amount: 1200, paymentMethod: '支付宝', discount: 100, status: 'completed', operatorId: getUid('finance'), createdAt: payDate(5) },
      { paymentNo: `PAO${roPrefix}-008`, customerId: c3.id, type: 'beauty', amount: 458, paymentMethod: '会员卡', status: 'completed', operatorId: getUid('finance'), createdAt: payDate(7) },
    ],
  });
  console.log('✅ 创建了 8 条收款记录');

  // 15. 初始化系统配置
  await prisma.systemConfig.createMany({
    data: [
      { key: 'logo', value: '' },
      { key: 'appName', value: '车行' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 初始化系统配置');

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
