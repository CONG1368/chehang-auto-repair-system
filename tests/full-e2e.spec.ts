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

test.describe('车行综合管理系统 - 全自动化测试', () => {

  test('【1】登录验证', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveTitle(/车行/);

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
    // 数据验证：表格至少渲染了表头
    await expect(page.locator('.el-table__header')).toBeVisible({ timeout: 5000 });
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
    // 数据验证：表格存在且有列定义
    await expect(page.locator('.el-table__header th').first()).toBeVisible({ timeout: 5000 });
  });

  test('【6】维修服务 - 接车开单', async ({ page }) => {
    await login(page);
    await navigateTo(page, '维修服务', '接车开单');
    await page.waitForURL('**/repair/reception');
    await expect(page.locator('.page-header')).toBeVisible();
    // 关键表单检查：验证表单有输入框
    await expect(page.locator('.el-form input, .el-form textarea, input, textarea').first()).toBeVisible({ timeout: 5000 });
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

  test('【32】导航到多个模块后能正常返回首页', async ({ page }) => {
    await login(page);
    // 导航到客户管理
    await navigateTo(page, '客户管理', '客户档案');
    await page.waitForURL('**/customer/list');
    // 导航到维修服务
    await navigateTo(page, '维修服务', '工单管理');
    await page.waitForURL('**/repair/orders');
    // 导航到库存管理
    await navigateTo(page, '库存管理', '配件管理');
    await page.waitForURL('**/inventory/parts');
    // 返回首页（通过URL直接跳转）
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(1000);
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('【33】登录→浏览页面→退出登录→验证未登录拦截完整循环', async ({ page }) => {
    // 1. 登录
    await login(page);
    // 2. 验证登录成功，仪表盘可见
    await expect(page.locator('.main-content')).toBeVisible();
    // 3. 浏览多个页面
    await navigateTo(page, '客户管理', '客户档案');
    await expect(page.locator('.el-table')).toBeVisible({ timeout: 5000 });
    await navigateTo(page, '财务管理', '收银台');
    await page.waitForURL('**/finance/cashier');
    // 4. 退出登录
    await page.click('.header-right .el-avatar, .header-right .el-dropdown');
    await page.waitForTimeout(500);
    const logoutBtn = page.locator('.el-dropdown-menu__item:has-text("退出登录")');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
    }
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page.locator('.login-container')).toBeVisible();
    // 5. 验证未登录状态下无法访问受保护页面（应跳转回登录）
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(2000);
    // 未登录时应被路由守卫拦截，回退到登录页
    await expect(page.locator('.login-container')).toBeVisible({ timeout: 5000 });
  });

  // ==================== 美容服务 ====================

  test('【34】美容服务 - 充值记录', async ({ page }) => {
    await login(page);
    await navigateTo(page, '美容服务', '充值记录');
    await page.waitForURL('**/beauty/recharges');
    await expect(page.locator('.el-table__header')).toBeVisible({ timeout: 5000 });
  });

  // ==================== 财务管理 ====================

  test('【35】财务管理 - 应付账款', async ({ page }) => {
    await login(page);
    await navigateTo(page, '财务管理', '应付账款');
    await page.waitForURL('**/finance/payable');
    await expect(page.locator('.el-table__header, .search-bar, .page-header').first()).toBeVisible({ timeout: 5000 });
  });

  test('【36】财务管理 - 发票管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '财务管理', '发票管理');
    await page.waitForURL('**/finance/invoice');
    await expect(page.locator('.el-table__header, .search-bar, .page-header').first()).toBeVisible({ timeout: 5000 });
  });

  test('【37】财务管理 - 费用管理', async ({ page }) => {
    await login(page);
    await navigateTo(page, '财务管理', '费用管理');
    await page.waitForURL('**/finance/expenses');
    await expect(page.locator('.el-table__header, .search-bar, .page-header').first()).toBeVisible({ timeout: 5000 });
  });

  // ==================== 数据报表 ====================

  test('【38】数据报表 - 美容统计', async ({ page }) => {
    await login(page);
    await navigateTo(page, '数据报表', '美容统计');
    await page.waitForURL('**/report/beauty');
    await expect(page.locator('.page-header, .main-content, .el-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('【39】数据报表 - 员工绩效', async ({ page }) => {
    await login(page);
    await navigateTo(page, '数据报表', '员工绩效');
    await page.waitForURL('**/report/performance');
    await expect(page.locator('.page-header, .main-content, .el-card, .el-tabs').first()).toBeVisible({ timeout: 5000 });
  });

  // ==================== 系统管理 ====================

  test('【40】系统管理 - 系统设置', async ({ page }) => {
    await login(page);
    await navigateTo(page, '系统管理', '系统设置');
    await page.waitForURL('**/system/settings');
    await expect(page.locator('.el-form, .page-header, .main-content').first()).toBeVisible({ timeout: 5000 });
  });

  test('【41】系统管理 - 操作日志', async ({ page }) => {
    await login(page);
    await navigateTo(page, '系统管理', '操作日志');
    await page.waitForURL('**/system/logs');
    await expect(page.locator('.el-table__header, .search-bar, .page-header').first()).toBeVisible({ timeout: 5000 });
  });

  test('【42】系统管理 - 个人设置', async ({ page }) => {
    await login(page);
    await navigateTo(page, '系统管理', '个人设置');
    await page.waitForURL('**/system/profile');
    await expect(page.locator('.el-form, .page-header, .main-content').first()).toBeVisible({ timeout: 5000 });
  });

  // ==================== 通知 ====================

  test('【43】消息通知 - 铃铛下拉', async ({ page }) => {
    await login(page);
    // 点击顶部铃铛图标
    const bell = page.locator('.bell-icon').first();
    await bell.click();
    await page.waitForTimeout(500);
    // 弹出下拉面板（popover）
    await expect(page.locator('.notification-popover, .el-popover, .el-popper').first()).toBeVisible({ timeout: 3000 });
  });

  // ==================== 导出功能 ====================

  test('【44】导出功能 - 报表页导出按钮', async ({ page }) => {
    await login(page);
    await navigateTo(page, '数据报表', '销售分析');
    await page.waitForURL('**/report/sales');
    // 检查导出按钮存在
    const exportBtn = page.locator('button').filter({ hasText: /导出Excel|导出PDF/ }).first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  // ==================== 打印功能 ====================

  test('【45】打印功能 - 维修工单打印按钮', async ({ page }) => {
    await login(page);
    await navigateTo(page, '维修服务', '工单管理');
    await page.waitForURL('**/repair/orders');
    // 点击第一行的查看详情
    const viewBtn = page.locator('.el-table__body .el-button').filter({ hasText: /详情|查看/ }).first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForTimeout(800);
      // 检查抽屉中是否有打印按钮
      const printBtn = page.locator('button').filter({ hasText: /打印/ }).first();
      await expect(printBtn).toBeVisible({ timeout: 3000 });
    }
  });

});
