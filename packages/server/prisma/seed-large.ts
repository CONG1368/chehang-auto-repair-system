import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ========== 工具函数 ==========

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randDate(start: Date, end: Date) {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ========== 中文姓名库 ==========

const SURNAMES = ['张', '李', '王', '陈', '刘', '黄', '赵', '周', '吴', '徐', '孙', '朱', '马', '胡', '郭', '林', '何', '高', '梁', '郑', '罗', '宋', '谢', '唐', '韩', '曹', '许', '邓', '冯', '彭', '曾', '肖', '田', '董', '潘', '袁', '蔡', '蒋', '余', '于', '杜', '叶', '程', '苏', '魏', '吕', '丁', '任', '沈', '姚', '卢', '姜', '崔', '钟', '谭', '陆', '汪', '范', '金', '石', '廖', '贾', '夏', '韦', '付', '方', '白', '邹', '孟', '熊', '秦', '邱', '江', '尹', '薛', '闫', '段', '雷', '侯', '龙', '史', '陶', '黎', '贺', '顾', '毛', '郝', '龚', '邵', '万', '钱', '严', '覃', '武', '戴', '莫', '孔', '向', '汤'];

const GIVEN_NAMES = ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '明', '超', '华', '丽', '艳', '芳', '敏', '静', '秀英', '秀兰', '桂英', '桂兰', '建华', '建军', '建国', '志强', '志明', '志伟', '文博', '浩然', '子涵', '宇轩', '梓豪', '一鸣', '天宇', '浩宇', '子轩', '宇航', '铭泽', '奕辰', '奕泽', '雨泽', '思源', '乐天', '欣怡', '梓涵', '雨彤', '梦琪', '诗涵', '思雨', '雪婷', '晨曦', '晓明', '晓峰', '晓东', '晓燕', '晓红', '海燕', '海霞', '玉兰', '玉梅', '春梅', '冬梅', '秀珍', '秀云', '秀荣', '秀华', '文华', '文军', '文斌', '文杰', '永强', '永刚', '永明', '永红', '小燕', '小丽', '小龙', '小虎'];

// ========== 车牌号库 ==========

const PLATE_PREFIXES = ['苏M', '苏A', '苏B', '苏D', '苏E', '苏F', '苏K', '苏L'];

function genPlate() {
  const prefix = pick(PLATE_PREFIXES);
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const l1 = pick(letters.split(''));
  const digits = `${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}`;
  return `${prefix}${l1}${digits}`;
}

function genPhone() {
  const prefixes = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188', '136', '137'];
  const p = pick(prefixes);
  let tail = '';
  for (let i = 0; i < 8; i++) tail += rand(0, 9);
  return `${p}${tail}`;
}

// ========== 业务数据池 ==========

const CAR_BRANDS = [
  { brand: '丰田', series: '卡罗拉', models: ['2021款 1.2T', '2022款 1.5L', '2023款 双擎'] },
  { brand: '丰田', series: '凯美瑞', models: ['2021款 2.0G', '2022款 2.5G', '2023款 双擎'] },
  { brand: '丰田', series: 'RAV4', models: ['2021款 2.0L', '2022款 2.5L', '2023款 双擎'] },
  { brand: '大众', series: '朗逸', models: ['2021款 280TSI', '2022款 1.5L', '2023款 300TSI'] },
  { brand: '大众', series: '帕萨特', models: ['2021款 330TSI', '2022款 380TSI', '2023款 430PHEV'] },
  { brand: '大众', series: '途观L', models: ['2021款 330TSI', '2022款 380TSI', '2023款 300TSI'] },
  { brand: '本田', series: '思域', models: ['2021款 240TURBO', '2022款 e:HEV', '2023款 TYPE-R'] },
  { brand: '本田', series: '雅阁', models: ['2021款 260TURBO', '2022款 锐·混动', '2023款 e:PHEV'] },
  { brand: '本田', series: 'CR-V', models: ['2021款 240TURBO', '2022款 锐·混动', '2023款 e:PHEV'] },
  { brand: '日产', series: '轩逸', models: ['2021款 1.6L', '2022款 e-POWER', '2023款 1.6L'] },
  { brand: '日产', series: '天籁', models: ['2021款 2.0L', '2022款 2.0T', '2023款 e-POWER'] },
  { brand: '别克', series: '英朗', models: ['2021款 1.3T', '2022款 1.5L', '2023款 轻混'] },
  { brand: '别克', series: '君威', models: ['2021款 552T', '2022款 652T', '2023款 GS'] },
  { brand: '宝马', series: '3系', models: ['2021款 320Li', '2022款 325Li', '2023款 330Li'] },
  { brand: '宝马', series: '5系', models: ['2021款 525Li', '2022款 530Li', '2023款 540Li'] },
  { brand: '奔驰', series: 'C级', models: ['2021款 C200L', '2022款 C260L', '2023款 C350eL'] },
  { brand: '奔驰', series: 'E级', models: ['2021款 E260L', '2022款 E300L', '2023款 E350eL'] },
  { brand: '奥迪', series: 'A4L', models: ['2021款 40TFSI', '2022款 45TFSI', '2023款 55TFSIe'] },
  { brand: '奥迪', series: 'A6L', models: ['2021款 45TFSI', '2022款 55TFSI', '2023款 55TFSIe'] },
  { brand: '比亚迪', series: '秦PLUS', models: ['2021款 DM-i', '2022款 EV', '2023款 冠军版'] },
  { brand: '比亚迪', series: '宋PLUS', models: ['2021款 DM-i', '2022款 EV', '2023款 冠军版'] },
  { brand: '比亚迪', series: '汉', models: ['2021款 DM-i', '2022款 EV', '2023款 冠军版'] },
  { brand: '哈弗', series: 'H6', models: ['2021款 1.5T', '2022款 2.0T', '2023款 DHT-PHEV'] },
  { brand: '吉利', series: '星瑞', models: ['2021款 2.0T', '2022款 1.5T', '2023款 智擎'] },
  { brand: '长安', series: 'CS75 PLUS', models: ['2021款 1.5T', '2022款 2.0T', '2023款 智电iDD'] },
];

const REPAIR_TYPES = [
  { type: 'labor', name: '常规保养（含机油机滤）', laborFee: 150, partFee: 350 },
  { type: 'labor', name: '更换刹车片（前轮）', laborFee: 120, partFee: 380 },
  { type: 'labor', name: '更换刹车片（后轮）', laborFee: 100, partFee: 320 },
  { type: 'labor', name: '更换刹车盘', laborFee: 200, partFee: 680 },
  { type: 'labor', name: '更换火花塞', laborFee: 80, partFee: 240 },
  { type: 'labor', name: '更换空调滤清器', laborFee: 40, partFee: 120 },
  { type: 'labor', name: '更换空气滤清器', laborFee: 30, partFee: 90 },
  { type: 'labor', name: '更换变速箱油', laborFee: 200, partFee: 580 },
  { type: 'labor', name: '更换防冻液', laborFee: 60, partFee: 180 },
  { type: 'labor', name: '更换轮胎（单条）', laborFee: 50, partFee: 680 },
  { type: 'labor', name: '四轮定位', laborFee: 200, partFee: 0 },
  { type: 'labor', name: '空调系统检修', laborFee: 180, partFee: 350 },
  { type: 'labor', name: '发动机故障诊断', laborFee: 300, partFee: 0 },
  { type: 'labor', name: '更换正时皮带', laborFee: 500, partFee: 850 },
  { type: 'labor', name: '更换减震器（前）', laborFee: 250, partFee: 780 },
  { type: 'labor', name: '更换减震器（后）', laborFee: 220, partFee: 650 },
  { type: 'labor', name: '更换雨刮器', laborFee: 20, partFee: 90 },
  { type: 'labor', name: '电瓶更换', laborFee: 30, partFee: 480 },
  { type: 'labor', name: '发动机积碳清洗', laborFee: 350, partFee: 280 },
  { type: 'labor', name: '三元催化清洗', laborFee: 280, partFee: 220 },
  { type: 'labor', name: '喷油嘴清洗', laborFee: 200, partFee: 150 },
  { type: 'labor', name: '节气门清洗', laborFee: 120, partFee: 60 },
  { type: 'labor', name: '更换离合器片', laborFee: 600, partFee: 1200 },
  { type: 'labor', name: '水箱更换', laborFee: 350, partFee: 680 },
  { type: 'labor', name: '空调压缩机更换', laborFee: 400, partFee: 1850 },
  { type: 'part',  name: '机油 5W-30（4L）', laborFee: 0, partFee: 350 },
  { type: 'part',  name: '机油滤清器', laborFee: 0, partFee: 60 },
];

const FAULT_DESCS = [
  '发动机异响，加速无力',
  '刹车时有尖锐异响',
  '空调制冷效果差',
  '方向盘抖动严重',
  '底盘有异响，过减速带明显',
  '仪表盘故障灯亮起',
  '车辆启动困难',
  '变速箱换挡顿挫',
  '油耗明显增高',
  '排气管冒黑烟',
  '冷却液温度过高',
  '雨天行驶后刹车失灵',
  '轮胎磨损严重需更换',
  '车辆跑偏，方向不回正',
  '离合器打滑，加速无力',
  '发动机故障灯常亮',
  '空调出风口异味严重',
  '电瓶经常亏电',
  '悬架过坑有咯吱声',
  '定期保养到期',
];

const BEAUTY_NAMES = ['精洗', '内饰清洗', '发动机清洗', '打蜡', '镀晶', '镀膜', '空调清洗'];

const EXPENSE_CATEGORIES = ['水电费', '房租', '设备维修', '办公用品', '员工餐补', '工具采购', '培训费', '保洁费', '网络费', '保险费', '税务代理', '广告推广'];

// ========== 主流程 ==========

async function main() {
  console.log('🚀 开始生成三年模拟经营数据...\n');

  // ========== 第一阶段：清空所有数据 ==========
  console.log('🧹 清空现有数据...');

  const deleteOrder = [
    'notification', 'invoice_record', 'expense_record', 'payable', 'receivable',
    'payment_record', 'dispatch_record', 'quality_check', 'repair_order_item',
    'repair_order', 'beauty_appointment', 'beauty_package', 'beauty_service',
    'sales_order', 'sales_lead', 'vehicle_info', 'stock_record', 'purchase_order_item',
    'purchase_order', 'part_stock', 'part', 'part_category', 'supplier',
    'member_card_recharge', 'member_card', 'follow_record', 'customer_vehicle',
    'customer', 'system_config', 'sys_user', 'sys_role',
  ];

  for (const table of deleteOrder) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
  }
  console.log('✅ 数据清空完成\n');

  // ========== 第二阶段：基础参考数据 ==========
  console.log('📋 创建基础数据...');

  // 角色
  const roles = await Promise.all([
    prisma.sysRole.create({ data: { name: '超级管理员', code: 'admin', description: '系统最高权限', permissions: ['*'], status: 1 } }),
    prisma.sysRole.create({ data: { name: '店长/经理', code: 'manager', description: '查看所有数据和管理权限', permissions: ['dashboard', 'sales', 'repair', 'beauty', 'finance', 'inventory', 'customer', 'report'], status: 1 } }),
    prisma.sysRole.create({ data: { name: '销售顾问', code: 'sales_consultant', description: '负责整车销售', permissions: ['sales', 'customer:view'], status: 1 } }),
    prisma.sysRole.create({ data: { name: '服务顾问', code: 'service_advisor', description: '负责维修接车和客户服务', permissions: ['repair', 'customer:view'], status: 1 } }),
    prisma.sysRole.create({ data: { name: '维修技师', code: 'technician', description: '负责车辆维修', permissions: ['repair:view', 'repair:update'], status: 1 } }),
    prisma.sysRole.create({ data: { name: '配件管理员', code: 'inventory_keeper', description: '负责配件库存管理', permissions: ['inventory'], status: 1 } }),
    prisma.sysRole.create({ data: { name: '财务人员', code: 'finance_staff', description: '负责收银和财务报表', permissions: ['finance', 'report:view'], status: 1 } }),
  ]);
  console.log(`  ✅ ${roles.length} 个角色`);

  // 用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const users: any[] = [];
  const userDefs = [
    { username: 'admin', realName: '系统管理员', phone: '13800000000', roleIdx: 0 },
    { username: 'manager', realName: '张店长', phone: '13800000001', roleIdx: 1 },
    { username: 'sales', realName: '李销售', phone: '13800000002', roleIdx: 2 },
    { username: 'advisor', realName: '王顾问', phone: '13800000003', roleIdx: 3 },
    { username: 'tech', realName: '赵技师', phone: '13800000004', roleIdx: 4 },
    { username: 'keeper', realName: '钱库管', phone: '13800000005', roleIdx: 5 },
    { username: 'finance', realName: '孙财务', phone: '13800000006', roleIdx: 6 },
    { username: 'tech2', realName: '周技师', phone: '13800000007', roleIdx: 4 },
  ];
  for (const u of userDefs) {
    const user = await prisma.sysUser.create({
      data: { username: u.username, password: hashedPassword, realName: u.realName, phone: u.phone, roleId: roles[u.roleIdx].id, status: 1 },
    });
    users.push(user);
  }
  console.log(`  ✅ ${users.length} 个用户`);

  // 配件分类
  const catData = ['发动机配件', '底盘配件', '电气配件', '车身配件', '保养用品', '美容用品', '轮胎轮毂'];
  const categories: any[] = [];
  for (let i = 0; i < catData.length; i++) {
    const c = await prisma.partCategory.create({ data: { name: catData[i], sortOrder: i + 1 } });
    categories.push(c);
  }
  console.log(`  ✅ ${categories.length} 个配件分类`);

  // 供应商
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: '博世汽车配件有限公司', contact: '周经理', phone: '13900000001', status: 1 } }),
    prisma.supplier.create({ data: { name: '壳牌润滑油代理', contact: '吴经理', phone: '13900000002', status: 1 } }),
    prisma.supplier.create({ data: { name: '米其林轮胎经销商', contact: '郑经理', phone: '13900000003', status: 1 } }),
    prisma.supplier.create({ data: { name: '3M汽车美容用品', contact: '陈经理', phone: '13900000004', status: 1 } }),
    prisma.supplier.create({ data: { name: '曼牌滤清器代理', contact: '刘经理', phone: '13900000005', status: 1 } }),
    prisma.supplier.create({ data: { name: '瓦尔塔蓄电池总代', contact: '黄经理', phone: '13900000006', status: 1 } }),
  ]);
  console.log(`  ✅ ${suppliers.length} 个供应商`);

  // 美容服务项目
  const beautyServices = await Promise.all([
    prisma.beautyService.create({ data: { name: '精洗', category: '清洗类', price: 88, duration: 60 } }),
    prisma.beautyService.create({ data: { name: '内饰清洗', category: '清洗类', price: 280, duration: 120 } }),
    prisma.beautyService.create({ data: { name: '发动机清洗', category: '清洗类', price: 380, duration: 90 } }),
    prisma.beautyService.create({ data: { name: '打蜡', category: '护理类', price: 180, duration: 60 } }),
    prisma.beautyService.create({ data: { name: '镀晶', category: '护理类', price: 1280, duration: 180 } }),
    prisma.beautyService.create({ data: { name: '镀膜', category: '护理类', price: 880, duration: 120 } }),
    prisma.beautyService.create({ data: { name: '空调清洗', category: '养护类', price: 298, duration: 60 } }),
  ]);
  console.log(`  ✅ ${beautyServices.length} 个美容服务`);

  // 美容套餐
  await prisma.beautyPackage.createMany({
    data: [
      { name: '新车呵护套餐', originalPrice: 1280, packagePrice: 980, items: ['精洗', '镀晶', '内饰清洗'] },
      { name: '换季保养套餐', originalPrice: 580, packagePrice: 458, items: ['空调清洗', '发动机清洗'] },
      { name: '深度清洁套餐', originalPrice: 880, packagePrice: 698, items: ['精洗', '内饰清洗', '发动机清洗'] },
      { name: '全年护理套餐', originalPrice: 1560, packagePrice: 1280, items: ['12次洗车', '4次打蜡'] },
    ],
  });
  console.log('  ✅ 美容套餐');

  // 会员卡
  await prisma.memberCard.createMany({
    data: [
      { cardNo: 'MC001', name: '普通卡', level: 1, discount: 9.5, minRecharge: 0 },
      { cardNo: 'MC002', name: '银卡', level: 2, discount: 9.0, minRecharge: 2000 },
      { cardNo: 'MC003', name: '金卡', level: 3, discount: 8.5, minRecharge: 5000 },
      { cardNo: 'MC004', name: '钻石卡', level: 4, discount: 8.0, minRecharge: 10000 },
    ],
  });
  console.log('  ✅ 会员卡');

  // 系统配置
  await prisma.systemConfig.createMany({
    data: [
      { key: 'logo', value: '' },
      { key: 'appName', value: '车行' },
    ],
  });
  console.log('  ✅ 系统配置\n');

  // ========== 第三阶段：配件 ==========
  console.log('🔧 创建配件数据...');

  const partsDefs = [
    { code: 'P001', name: '机油滤清器', spec: '通用型', catIdx: 0, supIdx: 4, price: 80, cost: 50 },
    { code: 'P002', name: '空气滤清器', spec: '通用型', catIdx: 0, supIdx: 4, price: 120, cost: 70 },
    { code: 'P003', name: '空调滤清器', spec: '活性炭', catIdx: 0, supIdx: 4, price: 160, cost: 95 },
    { code: 'P004', name: '燃油滤清器', spec: '通用型', catIdx: 0, supIdx: 4, price: 200, cost: 120 },
    { code: 'P005', name: '机油 5W-30', spec: '4L装', catIdx: 4, supIdx: 1, price: 350, cost: 220 },
    { code: 'P006', name: '机油 0W-20', spec: '4L装', catIdx: 4, supIdx: 1, price: 420, cost: 280 },
    { code: 'P007', name: '机油 10W-40', spec: '4L装', catIdx: 4, supIdx: 1, price: 280, cost: 170 },
    { code: 'P008', name: '合成机油 5W-40', spec: '4L装', catIdx: 4, supIdx: 1, price: 580, cost: 380 },
    { code: 'P009', name: '刹车片（前轮）', spec: '陶瓷配方', catIdx: 1, supIdx: 0, price: 380, cost: 240 },
    { code: 'P010', name: '刹车片（后轮）', spec: '陶瓷配方', catIdx: 1, supIdx: 0, price: 320, cost: 200 },
    { code: 'P011', name: '刹车盘（前轮）', spec: '通风盘', catIdx: 1, supIdx: 0, price: 680, cost: 420 },
    { code: 'P012', name: '火花塞', spec: '铱金', catIdx: 0, supIdx: 0, price: 150, cost: 90 },
    { code: 'P013', name: '变速箱油 ATF', spec: '4L装', catIdx: 4, supIdx: 1, price: 320, cost: 200 },
    { code: 'P014', name: '防冻液', spec: '-35℃ 4L', catIdx: 4, supIdx: 1, price: 90, cost: 50 },
    { code: 'P015', name: '制动液 DOT4', spec: '1L装', catIdx: 4, supIdx: 0, price: 85, cost: 45 },
    { code: 'P016', name: '轮胎 205/55R16', spec: '91V', catIdx: 6, supIdx: 2, price: 680, cost: 450 },
    { code: 'P017', name: '轮胎 225/45R17', spec: '94W', catIdx: 6, supIdx: 2, price: 850, cost: 580 },
    { code: 'P018', name: '轮胎 215/55R17', spec: '94V', catIdx: 6, supIdx: 2, price: 780, cost: 520 },
    { code: 'P019', name: '雨刮器', spec: '无骨 24寸+16寸', catIdx: 3, supIdx: 0, price: 90, cost: 50 },
    { code: 'P020', name: '蓄电池 12V60Ah', spec: '免维护', catIdx: 2, supIdx: 5, price: 480, cost: 320 },
    { code: 'P021', name: '蓄电池 12V70Ah', spec: '免维护', catIdx: 2, supIdx: 5, price: 580, cost: 380 },
    { code: 'P022', name: '发电机皮带', spec: '多楔带', catIdx: 0, supIdx: 0, price: 150, cost: 85 },
    { code: 'P023', name: '正时皮带套件', spec: '含张紧轮', catIdx: 0, supIdx: 0, price: 850, cost: 550 },
    { code: 'P024', name: '前减震器', spec: '液压双筒', catIdx: 1, supIdx: 0, price: 780, cost: 480 },
    { code: 'P025', name: '后减震器', spec: '液压双筒', catIdx: 1, supIdx: 0, price: 650, cost: 400 },
    { code: 'P026', name: '离合器片套件', spec: '三件套', catIdx: 1, supIdx: 0, price: 1200, cost: 780 },
    { code: 'P027', name: '水箱', spec: '铝制', catIdx: 2, supIdx: 0, price: 680, cost: 420 },
    { code: 'P028', name: '空调压缩机', spec: '变频', catIdx: 2, supIdx: 0, price: 1850, cost: 1280 },
    { code: 'P029', name: '氧传感器', spec: '前氧', catIdx: 2, supIdx: 0, price: 350, cost: 220 },
    { code: 'P030', name: '节气门总成', spec: '电子', catIdx: 0, supIdx: 0, price: 850, cost: 580 },
    { code: 'P031', name: '汽油泵总成', spec: '电子燃油泵', catIdx: 0, supIdx: 0, price: 680, cost: 430 },
    { code: 'P032', name: '启动机', spec: '减速型', catIdx: 2, supIdx: 0, price: 550, cost: 340 },
    { code: 'P033', name: '发电机', spec: '交流', catIdx: 2, supIdx: 0, price: 780, cost: 500 },
    { code: 'P034', name: '散热风扇', spec: '电子', catIdx: 2, supIdx: 0, price: 380, cost: 230 },
    { code: 'P035', name: '前保险杠', spec: '原厂', catIdx: 3, supIdx: 0, price: 1200, cost: 780 },
    { code: 'P036', name: '前大灯总成', spec: 'LED', catIdx: 3, supIdx: 0, price: 1850, cost: 1280 },
    { code: 'P037', name: '尾灯总成', spec: 'LED', catIdx: 3, supIdx: 0, price: 850, cost: 580 },
    { code: 'P038', name: '前挡风玻璃', spec: '夹层', catIdx: 3, supIdx: 0, price: 1500, cost: 980 },
    { code: 'P039', name: '发动机清洗剂', spec: '500ml', catIdx: 5, supIdx: 3, price: 120, cost: 65 },
    { code: 'P040', name: '空调清洗剂', spec: '500ml', catIdx: 5, supIdx: 3, price: 98, cost: 50 },
    { code: 'P041', name: '镀晶套装', spec: '双剂型', catIdx: 5, supIdx: 3, price: 680, cost: 380 },
    { code: 'P042', name: '打蜡套装', spec: '棕榈蜡', catIdx: 5, supIdx: 3, price: 150, cost: 80 },
    { code: 'P043', name: '轮毂轴承', spec: '前轮', catIdx: 1, supIdx: 0, price: 320, cost: 190 },
    { code: 'P044', name: '转向拉杆球头', spec: '外球头', catIdx: 1, supIdx: 0, price: 180, cost: 100 },
    { code: 'P045', name: '平衡杆胶套', spec: '前', catIdx: 1, supIdx: 0, price: 85, cost: 40 },
    { code: 'P046', name: '半轴总成', spec: '前驱动轴', catIdx: 1, supIdx: 0, price: 950, cost: 620 },
    { code: 'P047', name: 'EGR阀', spec: '废气再循环', catIdx: 0, supIdx: 0, price: 520, cost: 340 },
    { code: 'P048', name: '碳罐电磁阀', spec: '燃油蒸发', catIdx: 0, supIdx: 0, price: 280, cost: 160 },
    { code: 'P049', name: '火花塞高压线', spec: '套装', catIdx: 2, supIdx: 0, price: 220, cost: 130 },
    { code: 'P050', name: '冷却液壶', spec: '膨胀水箱', catIdx: 0, supIdx: 0, price: 120, cost: 65 },
  ];

  const parts: any[] = [];
  for (const pd of partsDefs) {
    const part = await prisma.part.create({
      data: {
        code: pd.code, name: pd.name, spec: pd.spec,
        categoryId: categories[pd.catIdx].id,
        supplierId: suppliers[pd.supIdx].id,
        price: pd.price, cost: pd.cost,
        safetyStock: rand(5, 30), maxStock: rand(50, 200),
      },
    });
    await prisma.partStock.create({
      data: { partId: part.id, quantity: rand(pd.price > 500 ? 5 : 20, pd.price > 500 ? 30 : 120) },
    });
    parts.push(part);
  }
  console.log(`  ✅ ${parts.length} 个配件\n`);

  // ========== 第四阶段：客户与车辆 ==========
  console.log('👥 生成客户和车辆...');

  const customers: any[] = [];
  const vehicles: any[] = [];
  const usedPhones = new Set<string>();
  const usedPlates = new Set<string>();

  const customerData: any[] = [];
  for (let i = 0; i < 300; i++) {
    const surname = pick(SURNAMES);
    const givenName = pick(GIVEN_NAMES);
    const name = surname + givenName;
    let phone: string;
    do { phone = genPhone(); } while (usedPhones.has(phone));
    usedPhones.add(phone);

    const gender = rand(0, 1);
    const source = pick(['到店', '电话', '转介绍', '线上推广', '车友会', '保险推荐']);
    const tagsList = pickN(['新车', '老客户', '保养', '维修', '高意向', 'VIP', '团购', '企业客户', '事故车', '定期保养'], rand(1, 4));

    const createdAt = randDate(new Date('2022-01-01'), new Date('2023-12-31'));
    customerData.push({ name, phone, gender, source, tags: tagsList.join(','), status: 1, createdAt });
  }

  // 批量插入客户
  for (let i = 0; i < customerData.length; i += 50) {
    const batch = customerData.slice(i, i + 50);
    const created = await Promise.all(
      batch.map((d: any) => prisma.customer.create({ data: d })),
    );
    customers.push(...created);
  }
  console.log(`  ✅ ${customers.length} 个客户`);

  // 为每个客户创建 1-2 辆车
  const vehicleData: any[] = [];
  for (const c of customers) {
    const numVehicles = Math.random() < 0.3 ? 2 : 1;
    for (let v = 0; v < numVehicles; v++) {
      const car = pick(CAR_BRANDS);
      let plate: string;
      do { plate = genPlate(); } while (usedPlates.has(plate));
      usedPlates.add(plate);

      vehicleData.push({
        customerId: c.id,
        plateNumber: plate,
        brand: car.brand,
        series: car.series,
        model: pick(car.models),
        mileage: rand(5000, 150000),
        purchaseDate: randDate(new Date('2018-01-01'), new Date('2023-06-01')),
        insuranceDue: randDate(new Date('2024-01-01'), new Date('2027-12-31')),
        inspectionDue: randDate(new Date('2024-06-01'), new Date('2027-06-30')),
        createdAt: c.createdAt,
      });
    }
  }

  for (let i = 0; i < vehicleData.length; i += 50) {
    const batch = vehicleData.slice(i, i + 50);
    const created = await Promise.all(
      batch.map((d: any) => prisma.customerVehicle.create({ data: d })),
    );
    vehicles.push(...created);
  }
  console.log(`  ✅ ${vehicles.length} 辆车\n`);

  // ========== 第五阶段：展车 ==========
  console.log('🚗 创建展车数据...');

  const vehicleInfos: any[] = [];
  for (let i = 0; i < 30; i++) {
    const car = pick(CAR_BRANDS);
    const guidePrice = randFloat(100000, 500000, 0);
    const info = await prisma.vehicleInfo.create({
      data: {
        brand: car.brand,
        series: car.series,
        model: pick(car.models),
        guidePrice,
        salePrice: parseFloat((guidePrice * randFloat(0.85, 0.98)).toFixed(0)),
        minPrice: parseFloat((guidePrice * randFloat(0.80, 0.90)).toFixed(0)),
        stockStatus: pick(['in_stock', 'in_stock', 'in_stock', 'in_transit', 'ordered']),
        color: pick(['白色', '黑色', '银色', '灰色', '蓝色', '红色']),
        vin: `LSV${rand(10, 99)}${rand(1000, 9999)}${rand(100000, 999999)}`,
        status: 1,
      },
    });
    vehicleInfos.push(info);
  }
  console.log(`  ✅ ${vehicleInfos.length} 辆展车\n`);

  // ========== 第六阶段：时序业务数据 ==========
  console.log('📅 生成时序业务数据（2023-05-21 ~ 2026-05-21）...');

  const START = new Date('2023-05-21');
  const END = new Date('2026-05-21');
  const TOTAL_DAYS = Math.floor((END.getTime() - START.getTime()) / (86400 * 1000));

  const techUsers = users.filter((u: any) => u.roleId === roles[4].id);
  const advisorUsers = users.filter((u: any) => u.roleId === roles[3].id);
  const salesUsers = users.filter((u: any) => u.roleId === roles[2].id);

  let repairOrderCount = 0;
  let salesOrderCount = 0;
  let beautyApptCount = 0;
  let paymentCount = 0;
  let expenseCount = 0;
  let purchaseCount = 0;
  let stockRecordCount = 0;
  let leadCount = 0;
  let followCount = 0;

  let cumulativeRepairNo = 0;
  let cumulativeSalesNo = 0;
  let cumulativePurchaseNo = 0;
  let cumulativePaymentNo = 0;

  // 进度展示
  const PROGRESS_STEP = Math.floor(TOTAL_DAYS / 20);

  for (let day = 0; day <= TOTAL_DAYS; day++) {
    const currentDate = addDays(START, day);
    const dayOfWeek = currentDate.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 业务量随年份增长：第一年基准1.0，第二年1.2，第三年1.4
    const yearProgress = day / TOTAL_DAYS;
    const growthFactor = 0.8 + yearProgress * 0.6; // 0.8 → 1.4

    // === 维修工单（工作日 1-4 单，周末 0-1 单）===
    const maxRepairs = isWeekend ? (Math.random() < 0.3 ? 1 : 0) : Math.floor(rand(1, 4) * growthFactor);
    for (let r = 0; r < maxRepairs; r++) {
      const veh = pick(vehicles);
      const cust = customers.find((c: any) => c.id === veh.customerId);
      const advisor = pick(advisorUsers);
      const faultDesc = pick(FAULT_DESCS);

      // 季节性调整故障描述
      const month = currentDate.getMonth() + 1;
      let seasonalFault = faultDesc;
      if (month >= 6 && month <= 8 && Math.random() < 0.4) seasonalFault = '空调制冷效果差，出风口温度偏高';
      if (month >= 11 || month <= 2) {
        if (Math.random() < 0.3) seasonalFault = '冷车启动困难，电瓶电压偏低';
        if (Math.random() < 0.2) seasonalFault = '暖风不热，冷却系统异常';
      }

      // 状态分布：大多数已完成，少数其他状态
      const statusRoll = Math.random();
      let status: string;
      if (statusRoll < 0.65) status = 'completed';
      else if (statusRoll < 0.75) status = 'delivered';
      else if (statusRoll < 0.85) status = 'quality_check';
      else if (statusRoll < 0.95) status = 'repairing';
      else status = 'pending';

      cumulativeRepairNo++;
      const orderNo = `RO${dayStr(currentDate).replace(/-/g, '')}-${String(cumulativeRepairNo).padStart(3, '0')}`;

      // 随机选择 1-3 个维修项目
      const numItems = rand(1, 3);
      const selectedItems = pickN(REPAIR_TYPES, numItems);
      let totalLaborFee = 0;
      let totalPartFee = 0;
      const orderItemsData: any[] = [];

      for (const item of selectedItems) {
        const laborFee = item.laborFee + rand(-20, 50);
        const partFee = item.partFee > 0 ? item.partFee + rand(-30, 80) : 0;
        totalLaborFee += laborFee;
        totalPartFee += partFee;
        orderItemsData.push({
          type: item.type,
          name: item.name,
          laborFee,
          partFee,
          amount: laborFee + partFee,
          status: status === 'pending' ? 'pending' : 'completed',
        });
      }

      const totalAmount = totalLaborFee + totalPartFee;
      const discount = Math.random() < 0.3 ? randFloat(0, totalAmount * 0.1, 0) : 0;
      const finalAmount = parseFloat((totalAmount - discount).toFixed(2));

      const estCompleteTime = new Date(currentDate);
      estCompleteTime.setHours(estCompleteTime.getHours() + rand(2, 8));

      const repairOrder = await prisma.repairOrder.create({
        data: {
          orderNo, customerId: cust.id, vehicleId: veh.id,
          plateNumber: veh.plateNumber, vehicleModel: `${veh.brand} ${veh.series}`,
          mileage: veh.mileage + rand(100, 5000),
          status, faultDesc: seasonalFault,
          totalLaborFee, totalPartFee, totalAmount, discount, finalAmount,
          advisorId: advisor.id, estCompleteTime,
          actualCompleteTime: status === 'completed' || status === 'delivered' ? new Date(currentDate.getTime() + rand(1, 4) * 3600000) : null,
          createdAt: currentDate,
          items: {
            create: orderItemsData,
          },
        },
      });
      repairOrderCount++;

      // 派工记录
      const assignedTech = pick(techUsers);
      await prisma.dispatchRecord.create({
        data: {
          repairOrderId: repairOrder.id,
          technicianId: assignedTech.id,
          standardHours: randFloat(1, 6, 1),
          actualHours: status === 'completed' || status === 'delivered' ? randFloat(1, 6, 1) : null,
          status: status === 'pending' ? 'assigned' : 'completed',
          createdAt: currentDate,
        },
      });

      // 质检记录（70% 完成工单有质检）
      if ((status === 'completed' || status === 'delivered' || status === 'quality_check') && Math.random() < 0.7) {
        const isPassed = Math.random() < 0.92 ? 1 : 0;
        await prisma.qualityCheck.create({
          data: {
            repairOrderId: repairOrder.id,
            checkerId: advisor.id,
            itemsChecked: ['外观检查', '功能测试', '路试', '尾气检测'].slice(0, rand(2, 4)),
            roadTest: Math.random() < 0.5 ? '已路试' : '未路试',
            isPassed,
            remark: isPassed ? '质检合格' : pick(['刹车力度不足需返工', '发动机仍有异响', '灯光调试未到位']),
            createdAt: new Date(currentDate.getTime() + rand(1, 3) * 3600000),
          },
        });
        // 如果质检不通过，状态回退
        if (!isPassed && status === 'quality_check') {
          await prisma.repairOrder.update({ where: { id: repairOrder.id }, data: { status: 'repairing' } });
        }
      }

      // 收款（已完成/已交车工单）
      if (status === 'completed' || status === 'delivered') {
        cumulativePaymentNo++;
        const paymentNo = `PAY${dayStr(currentDate).replace(/-/g, '')}-${String(cumulativePaymentNo).padStart(3, '0')}`;
        const paymentMethod = pick(['现金', '微信', '支付宝', '刷卡', '转账']);

        // 收款时间在工单完成之后
        const paymentDate = new Date(currentDate);
        paymentDate.setHours(paymentDate.getHours() + rand(1, 5));

        await prisma.paymentRecord.create({
          data: {
            paymentNo,
            customerId: cust.id,
            repairOrderId: repairOrder.id,
            type: 'repair',
            amount: finalAmount,
            paymentMethod,
            discount,
            status: 'completed',
            operatorId: pick([advisor.id, users[1].id]),
            createdAt: paymentDate,
          },
        });
        paymentCount++;
      }

      // 库存出库（配件类项目扣减库存）
      for (const item of orderItemsData) {
        if (item.type === 'part' && item.partFee > 0) {
          const randomPart = pick(parts);
          const stockQty = rand(1, 3);
          await prisma.stockRecord.create({
            data: {
              partId: randomPart.id,
              type: 'out',
              quantity: stockQty,
              beforeQty: rand(10, 50),
              afterQty: rand(8, 47),
              relatedNo: orderNo,
              operator: advisor.realName,
              createdAt: currentDate,
            },
          });
          stockRecordCount++;
        }
      }
    }

    // === 销售线索（每周 0-2 条）===
    if (day % 7 === 0) {
      const maxLeads = rand(0, 2);
      for (let l = 0; l < maxLeads; l++) {
        const cust = pick(customers);
        const salesUser = pick(salesUsers);
        const car = pick(CAR_BRANDS);
        const leadStatus = pick(['new', 'contacted', 'test_drive', 'negotiating', 'closed_won', 'closed_lost']);
        await prisma.salesLead.create({
          data: {
            customerId: cust.id,
            userId: salesUser.id,
            source: pick(['到店', '电话', '线上', '车展', '转介绍']),
            intent: pick(['购车', '置换', '咨询']),
            intentModel: `${car.brand} ${car.series}`,
            budget: randFloat(80000, 400000, 0),
            status: leadStatus,
            remark: leadStatus === 'closed_lost' ? pick(['价格不合适', '已购竞品', '客户暂缓购车']) : null,
            nextFollowAt: leadStatus !== 'closed_won' && leadStatus !== 'closed_lost' ? addDays(currentDate, rand(3, 14)) : null,
            createdAt: currentDate,
          },
        });
        leadCount++;
      }
    }

    // === 销售订单（每周 0-1 单）===
    if (day % 5 === 0 && Math.random() < 0.35) {
      const cust = pick(customers);
      const vi = pick(vehicleInfos);
      cumulativeSalesNo++;
      const orderNo = `SO${dayStr(currentDate).replace(/-/g, '')}-${String(cumulativeSalesNo).padStart(3, '0')}`;
      const salePrice = Number(vi.salePrice);
      const discount2 = randFloat(0, 5000, 0);
      const totalAmount2 = parseFloat((salePrice - discount2 + randFloat(3000, 15000, 0)).toFixed(2));

      await prisma.salesOrder.create({
        data: {
          orderNo,
          customerId: cust.id,
          vehicleId: vi.id,
          salePrice,
          discount: discount2,
          tax: randFloat(2000, 8000, 0),
          insurance: randFloat(3000, 8000, 0),
          accessories: randFloat(0, 3000, 0),
          serviceFee: 500,
          deposit: randFloat(1000, 10000, 0),
          totalAmount: totalAmount2,
          paymentMethod: pick(['全款', '分期', '贷款']),
          status: pick(['pending', 'confirmed', 'delivered', 'delivered']),
          deliveryDate: Math.random() < 0.7 ? addDays(currentDate, rand(3, 30)) : null,
          salesId: pick(salesUsers).id,
          createdAt: currentDate,
        },
      });
      salesOrderCount++;
    }

    // === 美容预约（每日 0-3 条）===
    const maxBeauty = isWeekend ? rand(1, 3) : rand(0, 2);
    for (let b = 0; b < maxBeauty; b++) {
      const cust = pick(customers);
      const veh = vehicles.find((v: any) => v.customerId === cust.id);
      const selectedBeautyItems = pickN(BEAUTY_NAMES, rand(1, 3));
      const totalBeautyAmount = selectedBeautyItems.length * randFloat(80, 500, 0);

      const startTime = new Date(currentDate);
      startTime.setHours(rand(8, 16), rand(0, 3) * 15, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + rand(1, 4));

      const apptStatus = pick(['completed', 'completed', 'completed', 'processing', 'pending']);

      await prisma.beautyAppointment.create({
        data: {
          customerId: cust.id,
          vehicleId: veh?.id || null,
          serviceType: pick(['清洗类', '护理类', '养护类']),
          items: selectedBeautyItems,
          totalAmount: totalBeautyAmount,
          status: apptStatus,
          assignedTo: pick(techUsers).id,
          startTime,
          endTime: apptStatus === 'completed' ? endTime : null,
          createdAt: currentDate,
        },
      });
      beautyApptCount++;

      // 美容收款
      if (apptStatus === 'completed') {
        cumulativePaymentNo++;
        const paymentNo = `PAY${dayStr(currentDate).replace(/-/g, '')}-${String(cumulativePaymentNo).padStart(3, '0')}`;
        await prisma.paymentRecord.create({
          data: {
            paymentNo,
            customerId: cust.id,
            type: 'beauty',
            amount: totalBeautyAmount,
            paymentMethod: pick(['微信', '支付宝', '现金', '刷卡']),
            status: 'completed',
            operatorId: pick(advisorUsers).id,
            createdAt: endTime,
          },
        });
        paymentCount++;
      }
    }

    // === 商品销售收款（偶尔）===
    if (Math.random() < 0.15) {
      cumulativePaymentNo++;
      const paymentNo = `PAY${dayStr(currentDate).replace(/-/g, '')}-${String(cumulativePaymentNo).padStart(3, '0')}`;
      const cust = pick(customers);
      await prisma.paymentRecord.create({
        data: {
          paymentNo,
          customerId: cust.id,
          type: 'product',
          amount: randFloat(50, 800, 0),
          paymentMethod: pick(['微信', '支付宝', '现金']),
          status: 'completed',
          operatorId: pick(users).id,
          createdAt: currentDate,
        },
      });
      paymentCount++;
    }

    // === 跟进记录（每日 0-1 条）===
    if (Math.random() < 0.35) {
      const cust = pick(customers);
      await prisma.followRecord.create({
        data: {
          customerId: cust.id,
          userId: pick(salesUsers).id,
          type: pick(['电话回访', '到店面谈', '微信沟通', '试驾邀约', '保养提醒']),
          content: pick([
            '客户对服务满意，表示下次还会来',
            '沟通了车辆保养周期，客户预约了下周保养',
            '客户咨询新车信息，已发送报价单',
            '电话未接通，稍后再联系',
            '客户到店做免费检测，推荐了空调清洗项目',
            '微信发送了优惠活动信息，客户表示关注',
            '提醒客户保险即将到期，客户表示会考虑续保',
          ]),
          nextFollowAt: Math.random() < 0.6 ? addDays(currentDate, rand(1, 30)) : null,
          createdAt: currentDate,
        },
      });
      followCount++;
    }

    // === 库存入库（每周 0-2 次采购）===
    if (day % 4 === 0 && Math.random() < 0.5) {
      cumulativePurchaseNo++;
      const supplier = pick(suppliers);
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          orderNo: `PO${dayStr(currentDate).replace(/-/g, '')}-${String(cumulativePurchaseNo).padStart(3, '0')}`,
          supplierId: supplier.id,
          totalAmount: 0,
          status: pick(['completed', 'completed', 'completed', 'pending']),
          applicantId: users[5].id,
          createdAt: currentDate,
        },
      });

      // 采购 2-5 种配件
      const purchasedParts = pickN(parts, rand(2, 5));
      let poTotal = 0;
      for (const pp of purchasedParts) {
        const qty = rand(5, 50);
        const unitPrice = Number(pp.cost);
        const amount = parseFloat((qty * unitPrice).toFixed(2));
        poTotal += amount;
        await prisma.purchaseOrderItem.create({
          data: { purchaseOrderId: purchaseOrder.id, partId: pp.id, quantity: qty, unitPrice, amount },
        });
        // 库存入库
        await prisma.stockRecord.create({
          data: {
            partId: pp.id, type: 'in', quantity: qty,
            beforeQty: rand(5, 30), afterQty: rand(30, 80),
            relatedNo: purchaseOrder.orderNo, operator: '钱库管', createdAt: currentDate,
          },
        });
        stockRecordCount++;
      }
      await prisma.purchaseOrder.update({ where: { id: purchaseOrder.id }, data: { totalAmount: poTotal } });
      purchaseCount++;
    }

    // === 费用支出（每月 4-6 笔）===
    if (day % 6 === 0 && Math.random() < 0.5) {
      await prisma.expenseRecord.create({
        data: {
          category: pick(EXPENSE_CATEGORIES),
          amount: randFloat(80, 5000, 0),
          description: `${dayStr(currentDate)} ${pick(EXPENSE_CATEGORIES)}支出`,
          operatorId: pick([users[1].id, users[6].id]),
          createdAt: currentDate,
        },
      });
      expenseCount++;
    }

    // === 应收款（偶尔有赊账维修）===
    if (Math.random() < 0.03) {
      const cust = pick(customers);
      await prisma.receivable.create({
        data: {
          customerId: cust.id,
          amount: randFloat(500, 8000, 0),
          paidAmount: 0,
          dueDate: addDays(currentDate, rand(7, 90)),
          status: 'pending',
          source: 'repair',
          sourceNo: `RO${dayStr(currentDate).replace(/-/g, '')}-${String(rand(1, 99)).padStart(3, '0')}`,
          createdAt: currentDate,
        },
      });
    }

    // 进度日志
    if (day > 0 && day % PROGRESS_STEP === 0) {
      const pct = Math.round((day / TOTAL_DAYS) * 100);
      console.log(`  ⏳ 进度 ${pct}% — ${dayStr(currentDate)} — 维修${repairOrderCount} 销售${salesOrderCount} 美容${beautyApptCount} 收款${paymentCount}`);
    }
  }

  // ========== 第七阶段：通知 ==========
  console.log('\n📬 生成通知数据...');
  const notifyData: any[] = [];
  for (let i = 0; i < 200; i++) {
    const notifyDate = randDate(START, END);
    const type = pick(['repair', 'stock', 'customer', 'system', 'beauty']);
    let title = '';
    let content = '';
    let targetType = '';
    switch (type) {
      case 'repair':
        title = pick(['新维修工单', '工单状态更新', '质检完成', '工单待交车']);
        content = pick(['有新的维修工单等待派工', '维修工单已完成质检', '车辆已维修完毕等待交车', '技师已完成维修作业']);
        targetType = 'repair_order';
        break;
      case 'stock':
        title = pick(['库存预警', '配件入库', '采购单到货']);
        content = pick(['部分配件库存低于安全线', '采购单已生成请审核', '配件已入库请验收']);
        targetType = 'part';
        break;
      case 'customer':
        title = pick(['新客户注册', '客户生日提醒', '保险到期提醒']);
        content = pick(['有新客户到店', '近期有客户生日', '客户车辆保险即将到期']);
        targetType = 'customer';
        break;
      case 'beauty':
        title = pick(['美容预约提醒', '美容施工完成']);
        content = pick(['今日有美容预约待服务', '美容施工已完成']);
        targetType = 'beauty';
        break;
      default:
        title = '系统通知';
        content = '系统维护通知';
        targetType = 'system';
    }
    notifyData.push({
      userId: pick(users).id,
      type,
      title,
      content,
      targetType,
      isRead: Math.random() < 0.6,
      readAt: Math.random() < 0.6 ? addDays(notifyDate, rand(1, 5)) : null,
      createdAt: notifyDate,
    });
  }
  // 分批插入通知
  for (let i = 0; i < notifyData.length; i += 50) {
    await prisma.notification.createMany({ data: notifyData.slice(i, i + 50) });
  }
  console.log(`  ✅ ${notifyData.length} 条通知\n`);

  // ========== 大结局 ==========
  console.log('═══════════════════════════════════');
  console.log('  🎉 三年模拟数据生成完成！');
  console.log('═══════════════════════════════════');
  console.log(`  📋 客户:      ${customers.length}`);
  console.log(`  🚗 车辆:      ${vehicles.length}`);
  console.log(`  🔧 维修工单:  ${repairOrderCount}`);
  console.log(`  💰 销售订单:  ${salesOrderCount}`);
  console.log(`  💄 美容预约:  ${beautyApptCount}`);
  console.log(`  💵 收款记录:  ${paymentCount}`);
  console.log(`  📦 采购单:    ${purchaseCount}`);
  console.log(`  📊 库存流水:  ${stockRecordCount}`);
  console.log(`  📈 销售线索:  ${leadCount}`);
  console.log(`  📝 跟进记录:  ${followCount}`);
  console.log(`  💸 费用支出:  ${expenseCount}`);
  console.log(`  🔔 通知:      ${notifyData.length}`);
  console.log(`\n  🔑 默认账号: admin / admin123`);
  console.log('═══════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据生成失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
