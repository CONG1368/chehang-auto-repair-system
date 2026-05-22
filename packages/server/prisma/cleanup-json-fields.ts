import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始修复 JSON 双重编码数据...\n');

  // 1. 修复 SysRole.permissions
  console.log('[1/4] 修复角色权限 (SysRole.permissions)...');
  const roles = await prisma.sysRole.findMany();
  let fixedRoles = 0;
  for (const role of roles) {
    if (typeof role.permissions === 'string') {
      const parsed = JSON.parse(role.permissions as string);
      await prisma.sysRole.update({
        where: { id: role.id },
        data: { permissions: parsed },
      });
      fixedRoles++;
      console.log(`  修复角色: ${role.name} (${role.code})`);
    }
  }
  console.log(`  共修复 ${fixedRoles} 个角色\n`);

  // 2. 修复 BeautyPackage.items
  console.log('[2/4] 修复美容套餐 (BeautyPackage.items)...');
  const packages = await prisma.beautyPackage.findMany();
  let fixedPkgs = 0;
  for (const pkg of packages) {
    if (typeof pkg.items === 'string') {
      const parsed = JSON.parse(pkg.items as string);
      await prisma.beautyPackage.update({
        where: { id: pkg.id },
        data: { items: parsed },
      });
      fixedPkgs++;
      console.log(`  修复套餐: ${pkg.name}`);
    }
  }
  console.log(`  共修复 ${fixedPkgs} 个套餐\n`);

  // 3. 修复 BeautyAppointment.items
  console.log('[3/4] 修复美容预约 (BeautyAppointment.items)...');
  const appointments = await prisma.beautyAppointment.findMany();
  let fixedAppts = 0;
  for (const appt of appointments) {
    if (typeof appt.items === 'string') {
      const parsed = JSON.parse(appt.items as string);
      await prisma.beautyAppointment.update({
        where: { id: appt.id },
        data: { items: parsed },
      });
      fixedAppts++;
      console.log(`  修复预约: #${appt.id}`);
    }
  }
  console.log(`  共修复 ${fixedAppts} 个预约\n`);

  // 4. 修复 QualityCheck.itemsChecked
  console.log('[4/4] 修复质检记录 (QualityCheck.itemsChecked)...');
  const checks = await prisma.qualityCheck.findMany();
  let fixedChecks = 0;
  for (const check of checks) {
    if (typeof check.itemsChecked === 'string') {
      const parsed = JSON.parse(check.itemsChecked as string);
      await prisma.qualityCheck.update({
        where: { id: check.id },
        data: { itemsChecked: parsed },
      });
      fixedChecks++;
      console.log(`  修复质检记录: #${check.id}`);
    }
  }
  console.log(`  共修复 ${fixedChecks} 条质检记录\n`);

  console.log('JSON 字段修复完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
