import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

// 辅助：登录
async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[placeholder="用户名"]');
  await page.fill('input[placeholder="用户名"]', 'admin');
  await page.fill('input[placeholder="密码"]', 'admin123');
  await page.click('button:has-text("登 录")');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// 辅助：侧边栏导航
async function navigateTo(page: Page, menuText: string, itemText: string) {
  // 点击侧边栏一级菜单展开
  const menu = page.locator('.el-sub-menu__title', { hasText: menuText });
  await menu.click();
  await page.waitForTimeout(300);
  // 点击二级菜单项
  const item = page.locator('.el-menu-item', { hasText: itemText });
  await item.click();
  await page.waitForTimeout(500);
}

test.describe('泰州车行维修厂部综合管理系统 - 全自动化测试', () => {

  test('【1】登录验证', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveTitle(/泰州车行维修厂/);

    // 空表单校验
    await page.fill('input[placeholder="用户名"]', '');
    await page.fill('input[placeholder="密码"]', '');
    await page.click('button:has-text("登 录")');
    // Element Plus 表单验证应出现

    // 错误密码
    await page.fill('input[placeholder="用户名"]', 'admin');
    await page.fill('input[placeholder="密码"]', 'wrong');
    await page.click('button:has-text("登 录")');
    await expect(page.locator('.el-message--error').first()).toBeVisible({ timeout: 5000 });

    // 正确登录
    await page.fill('input[placeholder="密码"]', 'admin123');
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('.el-message--success').first()).toBeVisible({ timeout: 5000 });
  });

  test('【2】经营驾驶舱', async ({ page }) => {
    await login(page);
    // 验证核心数据卡片
    await expect(page.locator('.main-content')).toBeVisible();
    // 等待 ECharts 图表渲染
    await page.waitForTimeout(2000);
  });

  test('【3】客户管理 - 客户列表', async ({ page }) => {
    await login(page);
    await navigateTo(page, '客户管理', '客户档案');
    await page.waitForURL('**/customer/list');
    await expect(page.locator('.el-table')).toBeVisible({ timeout: 5000 });
  });

  test('【4】客户管理 - 新增客户', async ({ page }) => {
    await login(page);
    await navigateTo(page, '客户管理', '客户档案');
    await page.waitForURL('**/customer/list');

    await page.click('button:has-text("新增客户")');
    await page.waitForSelector('.el-dialog', { timeout: 3000 });
    await page.waitForTimeout(300);
    const nameInput = page.locator('.el-dialog input').first();
    await nameInput.fill('自动化测试客户');
    await page.click('.el-dialog button:has-text("确定")');
    await page.waitForTimeout(500);
  });

  test('【5】维修服务 - 工单管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '维修服务', '工单管理');
    await page.waitForURL('**/repair/orders');
    await expect(page.locator('.search-bar').first()).toBeAttached({ timeout: 5000 });
  });

  test('【6】维修服务 - 接车开单', async ({ page }) => {
    await login(page);
    await navigateTo(page, '维修服务', '接车开单');
    await page.waitForURL('**/repair/reception');
    await expect(page.locator('.page-header')).toBeVisible();
  });

  test('【7】维修服务 - 技师派工', async ({ page }) => {
    await login(page);
    await navigateTo(page, '维修服务', '技师派工');
    await page.waitForURL('**/repair/dispatch');
    await expect(page.locator('.el-tabs')).toBeVisible({ timeout: 5000 });
  });

  test('【8】维修服务 - 质检交车', async ({ page }) => {
    await login(page);
    await navigateTo(page, '维修服务', '质检交车');
    await page.waitForURL('**/repair/quality');
    await expect(page.locator('.el-tabs')).toBeVisible({ timeout: 5000 });
  });

  test('【9】库存管理 - 配件管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '库存管理', '配件管理');
    await page.waitForURL('**/inventory/parts');
    await expect(page.locator('.search-bar').first()).toBeVisible({ timeout: 5000 });
  });

  test('【10】库存管理 - 库存查询', async ({ page }) => {
    await login(page);
    await navigateTo(page, '库存管理', '库存查询');
    await page.waitForURL('**/inventory/stock');
    await expect(page.locator('.page-header')).toBeVisible();
  });

  test('【11】库存管理 - 入库管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '库存管理', '入库管理');
    await page.waitForURL('**/inventory/inbound');
  });

  test('【12】库存管理 - 采购管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '库存管理', '采购管理');
    await page.waitForURL('**/inventory/purchase');
  });

  test('【13】新车销售 - 车辆管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '新车销售', '车辆管理');
    await page.waitForURL('**/sales/vehicles');
    await expect(page.locator('.search-bar').first()).toBeVisible({ timeout: 5000 });
  });

  test('【14】新车销售 - 客户跟进', async ({ page }) => {
    await login(page);
    await navigateTo(page, '新车销售', '客户跟进');
    await page.waitForURL('**/sales/leads');
  });

  test('【15】新车销售 - 报价签约', async ({ page }) => {
    await login(page);
    await navigateTo(page, '新车销售', '报价签约');
    await page.waitForURL('**/sales/orders');
  });

  test('【16】新车销售 - 交车管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '新车销售', '交车管理');
    await page.waitForURL('**/sales/delivery');
  });

  test('【17】美容服务 - 服务项目', async ({ page }) => {
    await login(page);
    await navigateTo(page, '美容服务', '服务项目');
    await page.waitForURL('**/beauty/services');
  });

  test('【18】美容服务 - 套餐管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '美容服务', '套餐管理');
    await page.waitForURL('**/beauty/packages');
  });

  test('【19】美容服务 - 会员卡管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '美容服务', '会员卡');
    await page.waitForURL('**/beauty/cards');
  });

  test('【20】美容服务 - 施工管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '美容服务', '施工管理');
    await page.waitForURL('**/beauty/schedule');
  });

  test('【21】财务管理 - 收银台', async ({ page }) => {
    await login(page);
    await navigateTo(page, '财务管理', '收银台');
    await page.waitForURL('**/finance/cashier');
  });

  test('【22】财务管理 - 对账报表', async ({ page }) => {
    await login(page);
    await navigateTo(page, '财务管理', '对账报表');
    await page.waitForURL('**/finance/reports');
  });

  test('【23】财务管理 - 应收应付', async ({ page }) => {
    await login(page);
    await navigateTo(page, '财务管理', '应收应付');
    await page.waitForURL('**/finance/receivable');
  });

  test('【24】财务管理 - 利润分析', async ({ page }) => {
    await login(page);
    await navigateTo(page, '财务管理', '利润分析');
    await page.waitForURL('**/finance/profit');
  });

  test('【25】数据报表 - 数据大屏', async ({ page }) => {
    await login(page);
    await navigateTo(page, '数据报表', '数据大屏');
    await page.waitForURL('**/report/overview');
    await page.waitForTimeout(2000);
  });

  test('【26】数据报表 - 销售分析', async ({ page }) => {
    await login(page);
    await navigateTo(page, '数据报表', '销售分析');
    await page.waitForURL('**/report/sales');
  });

  test('【27】数据报表 - 维修分析', async ({ page }) => {
    await login(page);
    await navigateTo(page, '数据报表', '维修分析');
    await page.waitForURL('**/report/repair');
  });

  test('【28】数据报表 - 财务分析', async ({ page }) => {
    await login(page);
    await navigateTo(page, '数据报表', '财务分析');
    await page.waitForURL('**/report/finance');
  });

  test('【29】系统管理 - 用户管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '系统管理', '用户管理');
    await page.waitForURL('**/system/users');
    await expect(page.locator('.search-bar').first()).toBeVisible({ timeout: 5000 });
  });

  test('【30】系统管理 - 角色管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '系统管理', '角色管理');
    await page.waitForURL('**/system/roles');
  });

  test('【31】退出登录', async ({ page }) => {
    await login(page);
    await page.click('.header-right .el-avatar, .header-right .el-dropdown');
    await page.waitForTimeout(500);
    const logoutBtn = page.locator('.el-dropdown-menu__item:has-text("退出登录")');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
    }
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page.locator('.login-container')).toBeVisible();
  });

});
