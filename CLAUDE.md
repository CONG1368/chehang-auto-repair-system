# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 强制工作流规则（每次对话开始前必须执行）

### 1. 全程中文
开发全程和思考全程都必须用中文显示。包括但不限于：代码注释、提交信息、任务描述、进度汇报、用户沟通。内部思考（thinking）也必须用中文。

### 2. 多Agent并发执行（强制）

**任务数 ≥ 2 时，必须采用多 Agent 并发执行，禁止串行逐个处理。**

- 将任务按文件集拆分，确保各 Agent 修改的文件互不重叠
- 所有 Agent 使用 `run_in_background: true` 同时启动
- Agent 完成后立即更新对应任务状态
- 最后一个 Agent 完成后，进行整体构建验证

**每个开发阶段的 Agent 编排流程：**

1. TaskCreate 创建所有子任务
2. 按文件无重叠原则分组，每组分配一个 Agent
3. 所有 Agent 并行启动（单条消息中多个 Agent 工具调用）
4. 等待全部 Agent 完成通知
5. 执行 `pnpm build:server && pnpm build:web` 整体验证
6. 如构建失败，修复后重新构建

### 3. 代码质量审计 Agent（强制）

**所有开发任务完成后，必须派遣一个独立的代码质量审计 Agent。** 该 Agent 只做审查，不做修改：

- 检查所有新增/修改代码是否存在：安全问题（XSS、注入、越权）、冗余逻辑、未使用变量、类型不安全、边界条件遗漏
- 输出审计报告：按严重程度列出问题清单
- 用户确认后，根据审计结果修复 Critical 和 High 级别问题

### 4. 任务追踪机制
每次开发任务必须遵循以下流程：

**开始开发前：**
- 使用 `TaskCreate` 创建子任务，描述要完成的具体功能
- 使用 `TaskUpdate` 将当前任务标记为 `in_progress`
- 先执行 `TaskList` 查看所有任务，确认依赖关系和优先级

**完成每个子任务后：**
- 立即使用 `TaskUpdate` 将该任务标记为 `completed`
- 执行 `TaskList` 查看剩余未完成任务
- 向用户汇报当前进度（已完成数/总数）

### 5. 构建验证
每个模块开发完成后必须执行构建验证：
```bash
pnpm build:server && pnpm build:web
```
构建失败时优先修复，不允许有编译错误留存。

### 6. 开发前检查清单
开始任何开发工作前，先执行：
1. `TaskList` — 了解当前任务状态
2. 阅读 `CLAUDE.md` 中的技术约定
3. 确认要修改的模块文件路径

---

## 项目概述

车行综合管理系统 — 汽车维修厂内部管理平台。支持多角色（销售顾问、服务顾问、维修技师、配件管理员、财务、店长）通过浏览器和手机APP实时协同办公。B/S架构，部署于云服务器。

## 开发命令

```bash
pnpm install                          # 安装全部依赖
pnpm dev:server                       # 启动NestJS后端 (http://localhost:3000)
pnpm dev:web                          # 启动Vue3前端 (http://localhost:5173)
pnpm dev:mobile                       # 启动uni-app移动端
pnpm build:server && pnpm build:web   # 构建前后端
pnpm build:mobile                     # 构建移动端
pnpm db:generate                      # 生成Prisma客户端
pnpm db:migrate                       # prisma migrate dev（有迁移文件时）
pnpm db:seed                          # 初始化种子数据
pnpm db:studio                        # Prisma Studio 数据库管理界面 (localhost:5555)
pnpm test                             # 运行全部单元测试（16套件/269用例）
npx playwright test --reporter=list   # 运行E2E测试（45用例）
npx playwright test -g "关键词"        # 运行单个E2E测试
npx ts-node packages/server/prisma/cleanup-json-fields.ts  # 修复JSON双重编码历史数据
```

默认账号: `admin` / `admin123`

## 技术栈与架构

```
packages/
├── server/          NestJS + TypeScript + Prisma + MySQL + Redis
├── web-admin/       Vue 3 + Element Plus + ECharts + Pinia + Axios
└── mobile/          uni-app (Vue 3) — 生成 APP + 微信小程序
```

- **后端**: NestJS模块化架构，每个业务模块含 controller / service / dto，18个业务模块 + 4个基础设施模块注册在 `app.module.ts`
- **ORM**: Prisma，schema文件位于 `packages/server/prisma/schema.prisma`（28张表）
- **认证**: JWT Token + Passport，前端Bearer头注入，响应401自动跳转登录
- **权限**: RBAC模型，`SysRole.permissions` 存JSON数组，`*` 表示超级管理员。7个预设角色：超级管理员/店长/销售顾问/服务顾问/维修技师/配件管理员/财务人员
- **实时推送**: Socket.IO，WsGateway在 `packages/server/src/modules/ws/ws.gateway.ts`，12种事件类型，推送时自动写入 Notification 表
- **模块**: Auth / User / Customer / Inventory / Repair / Sales / Beauty / Finance / Report / Notification / Export / Upload / System / Invoice / Audit / Health / Ws / Prisma / Redis

## 后端关键约定

- **API响应格式**: `{ code: 200, message: "操作成功", data: ... }`，由 `TransformInterceptor` 统一包装
- **异常处理**: `HttpExceptionFilter` 全局捕获，返回统一格式错误
- **分页**: 使用 `PaginationDto`（page/pageSize），Service返回 `PaginatedResult`（list/total/page/pageSize/totalPages）
- **数据库字段映射**: Prisma模型字段使用camelCase，通过 `@map()` 映射到数据库snake_case列名
- **ValidationPipe**: 全局启用 `whitelist: true`，DTO 中未定义的请求字段会被静默剥离
- **工单号格式**: `RO年月日-序号`（如RO20260519-001），销售订单号 `SO年月日-序号`，采购单号 `PO年月日-序号`
- **WebSocket通知**: RepairService/InventoryService注入可选的WsGateway，在create/updateStatus/stockOut等关键操作后推送
- **测试**: Playwright E2E 测试位于 `tests/` 目录，配置 `playwright.config.ts`（Chromium headless，失败自动截图+录屏）

## 前端关键约定

- **API请求**: 统一使用 `request from @/api/request`（Axios实例，baseURL `/api`，拦截器自动解包 `data` 字段返回）。各业务模块的API封装在 `api/` 目录下（14个文件：auth / customer / repair / sales / inventory / finance / beauty / invoice / notification / user / report / system / upload / request）
- **路由**: 所有业务页面在MainLayout下，需登录；`/login` 为公开路由。Web Admin共42个路由页面
- **权限store**: `useAuthStore()` 提供 `token`、`userInfo`、`login()`、`logout()`、`hasPermission()`
- **图表**: vue-echarts使用default import方式 `import VChart from 'vue-echarts'`，在组件内use按需注册echarts模块
- **Vite代理**: 开发时 `/api` 代理到 `http://localhost:3000`
- **详情模式**: 所有列表页面表格行支持 `@row-click` 跳转详情（el-drawer + el-descriptions），新增列表页需同步实现
- **打印**: 使用 `print-js` 调起浏览器打印，7个打印模板组件在 `components/PrintTemplate/` 下（ReceptionPrint / RepairOrderPrint / QualityCheckPrint / SalesOrderPrint / CashierReceiptPrint / PurchaseOrderPrint / FinanceReportPrint）
- **文件上传**: 前端 `utils/upload.ts` + `api/upload.ts` 封装，后端 multer 存储至 `uploads/{module}/`，文件通过 `GET /uploads/:module/:filename`（JWT鉴权 + 路径穿越防护）访问

## 数据库核心表

| 模块 | 核心表 |
|------|--------|
| 系统 | `sys_user`, `sys_role` |
| 客户 | `customer`, `customer_vehicle`, `follow_record`, `member_card`, `member_card_recharge` |
| 库存 | `part`, `part_stock`, `stock_record`, `part_category`, `supplier`, `purchase_order`, `purchase_order_item` |
| 维修 | `repair_order`, `repair_order_item`, `dispatch_record`, `quality_check` |
| 销售 | `vehicle_info`, `sales_lead`, `sales_order` |
| 美容 | `beauty_service`, `beauty_package`, `beauty_appointment` |
| 财务 | `payment_record`, `receivable`, `payable`, `expense_record`, `invoice_record` |
| 通知 | `notification` |

### Prisma Json 列（10个）

| 模型 | 字段 | 用途 |
|------|------|------|
| `SysRole` | `permissions` | 权限代码数组 |
| `Customer` | `images` | 客户照片 URL 数组 |
| `Part` | `images` | 配件图片 URL 数组 |
| `PurchaseOrder` | `attachments` | 采购单附件 URL 数组 |
| `RepairOrder` | `images` | 故障照片 URL 数组 |
| `RepairOrder` | `checkImages` | 质检照片 URL 数组 |
| `QualityCheck` | `itemsChecked` | 质检项目数组 |
| `VehicleInfo` | `images` | 展车图片 URL 数组 |
| `BeautyPackage` | `items` | 包含服务数组 |
| `BeautyAppointment` | `items` | 预约项目数组 |

## 维修工单状态流转

```
pending → assigned → repairing → quality_check → completed → delivered
(待派工)  (已派工)   (维修中)    (待质检)       (已完成)   (已交车)
```

质检不通过时 `quality_check` 回退到 `repairing`。

## API 端点速查

标准 CRUD 端点遵循 REST 模式，以下仅列非标准端点：

| 端点 | 说明 |
|------|------|
| `GET /customers/reminds?type=maintenance\|insurance\|inspection` | 到期提醒 |
| `GET /customers/:customerId/follows` | 客户跟进记录 |
| `POST /customers/:customerId/follows` | 新增跟进记录 |
| `GET /inventory/purchase?status=&page=&pageSize=` | 采购单分页 |
| `POST /inventory/purchase` | 创建采购单 |
| `DELETE /inventory/purchase/:id` | 删除采购单 |
| `GET /inventory/stock-records` | 库存流水 |
| `POST /inventory/stock-in` | 入库 |
| `POST /inventory/stock-out` | 出库 |
| `GET /inventory/low-stock` | 低库存预警 |
| `POST /part-categories` | 创建配件分类 |
| `PUT /part-categories/:id` | 更新配件分类 |
| `DELETE /part-categories/:id` | 删除配件分类 |
| `POST /suppliers` | 创建供应商 |
| `PUT /suppliers/:id` | 更新供应商 |
| `DELETE /suppliers/:id` | 删除供应商 |
| `POST /repair/dispatch` | 技师派工 |
| `POST /repair/quality-check` | 质检 |
| `PUT /repair/:id/deliver` | 交车完成 |
| `POST /repair/:id/calculate` | 重算工单费用 |
| `GET /reports/dashboard?startDate=&endDate=` | 经营驾驶舱汇总 |
| `GET /reports/revenue-trend?days=30` | 营收趋势 |
| `GET /reports/business-ratio` | 业务占比 |
| `GET /reports/beauty-stats` | 美容报表 |
| `GET /reports/staff-performance` | 员工绩效 |
| `GET /notifications?page=&pageSize=&type=&isRead=` | 通知分页 |
| `GET /notifications/unread-count` | 未读数量 |
| `PUT /notifications/:id/read` | 标记已读 |
| `PUT /notifications/read-all` | 全部已读 |
| `GET /export/excel?module=customers\|parts\|repair\|sales\|leads\|vehicles\|delivery\|beauty\|finance\|inventory_stock\|beauty_cards\|report` | 导出Excel（12模块） |
| `POST /upload/batch?module=...` | 批量上传（20文件/50MB） |
| `DELETE /upload/file/:module/:filename` | 删除已上传文件 |
| `GET /uploads/:module/:filename` | 文件访问（JWT鉴权） |
| `GET /finance/payments` | 收款列表 |
| `POST /finance/payments` | 创建收款 |
| `PUT /finance/payments/:id` | 编辑收款 |
| `DELETE /finance/payments/:id` | 删除收款 |
| `GET /finance/receivables/summary` | 应收汇总 |
| `GET /finance/payables/summary` | 应付汇总 |
| `GET /finance/profit-summary` | 利润分析 |
| `GET /audit?page=&pageSize=` | 操作日志 |
| `GET /audit/stats` | 操作统计 |
| `GET /invoice?page=&pageSize=` | 发票列表 |
| `POST /invoice` | 创建发票 |
| `PUT /invoice/:id/cancel` | 作废发票 |
| `DELETE /sales/leads/:id` | 删除线索 |
| `DELETE /sales/orders/:id` | 删除订单 |
| `DELETE /beauty/cards/:id` | 删除会员卡 |
| `DELETE /beauty/appointments/:id` | 删除预约 |

## 文件组织模式

新增业务功能时遵循既有模式：
- 后端: `modules/<name>/` 下放 `dto/`、`*.module.ts`、`*.controller.ts`、`*.service.ts`
- 前端: `views/<module>/` 下放各页面 `.vue` 文件，`api/` 下放请求封装，`stores/` 下放Pinia store
- 移动端: `pages/<module>/` 下放页面（43页），页面内自行封装 `apiFetch` 函数调用uni.request。pages.json 中注册所有页面路由，底部TabBar含4项（首页/工单/客户/库存）

## 已知陷阱

### 1. request 拦截器已解包 data，Store 禁止再取 .data

`packages/web-admin/src/api/request.ts` 响应拦截器（第 23 行 `return data`）已经把后端 `{code:200, data:{token:...}}` 解包为 `{token:...}`。**Store 中直接使用返回值，不能再 `.data`**：

```typescript
// ❌ 错误：二次解包拿到 undefined
const res = await loginApi({ username, password });
token.value = res.data.token;  // undefined!

// ✅ 正确
token.value = res.token;
```

### 2. NestJS 路由顺序：显式路径必须在 :id 之前

NestJS 按定义顺序匹配路由。`@Get('reminds')` 如果放在 `@Get(':id')` 之后，`reminds` 会被 `:id` 参数路由吞掉。**Controller 中所有显式路径路由必须定义在 `:id` 参数路由之前。**

### 3. bcrypt → bcryptjs（Windows 兼容）

原生 `bcrypt` 在 Windows 上编译失败。已全部替换为 `bcryptjs`（纯 JS，API 兼容）。新代码中一律使用 `import * as bcrypt from 'bcryptjs'`。

### 4. Prisma schema 双向关联

为已存在的表添加关联时，必须同时添加双向关联。例如给 `PurchaseOrderItem` 加 `part` 字段，必须在 `Part` 模型也加 `purchaseItems PurchaseOrderItem[]`。

### 5. Element Plus Locale 类型声明

`element-plus/dist/locale/zh-cn.mjs` 无 TypeScript 声明，需在 `src/types/element-plus.d.ts` 中添加：
```typescript
declare module 'element-plus/dist/locale/zh-cn.mjs';
```

### 6. tsconfig 已废弃选项

`useDefineForExpose` 在 TypeScript 5.x 中不存在（vue-tsc 1.x 专用选项），升级 vue-tsc 到 2.x 后必须移除。

### 7. Prisma 查询参数类型转换

URL 查询参数始终是字符串。传给 Prisma 的 Boolean 字段（如 `isRead`）必须手动转换：
```typescript
if (query.isRead !== undefined && query.isRead !== null) {
  where.isRead = query.isRead === true || query.isRead === 'true';
}
```

### 8. Prisma 删除操作需级联处理

`repairOrder.delete()` 会因外键约束失败。必须用 `$transaction` 先删关联记录再删主记录。同理，其他有外键关联的表删除时也要检查。

### 9. Element Plus 图标手动导入

`Bell` 等部分图标不会被 `unplugin-vue-components` 自动解析，需显式导入：
```typescript
import { Bell } from '@element-plus/icons-vue'
```

### 10. multer 需要直接依赖

`diskStorage` 从 `multer` 包导入（非 `@nestjs/platform-express`），必须将 `multer` 作为 server 的 `dependencies` 直接安装。

### 11. NestJS 构建输出路径

nest build 输出到 `dist/src/main.js` 而非 `dist/main.js`。运行服务器命令：`node dist/src/main.js`。

### 12. Prisma Json 列禁止 JSON.stringify（双重编码陷阱！）

Prisma `Json` 列类型会自动处理 JSON 序列化。**对 Json 列写入时绝对不要再用 `JSON.stringify()`**，否则数据库中存入的是 JSON 字符串而非 JSON 数组，前端 `v-for` 遍历时会逐字符渲染，产生乱字符。

```typescript
// ❌ 错误：双重编码 → 乱字符
permissions: JSON.stringify(['sales', 'repair'])

// ✅ 正确：直接传数组，Prisma 自动序列化
permissions: ['sales', 'repair']
```

**读取侧防御：** `findAll` 等方法返回前需对 Json 列做字符串转数组的防御性解析：
```typescript
return roles.map((role) => ({
  ...role,
  permissions: typeof role.permissions === 'string'
    ? JSON.parse(role.permissions as string)
    : role.permissions,
}));
```

当前 `SysRole.permissions`、`BeautyPackage.items`、`BeautyAppointment.items` 已实施防御性解析。新增 Json 列服务端读取也必须做此处理。已有损坏数据可运行 `cleanup-json-fields.ts` 脚本修复。

### 13. ValidationPipe whitelist 会静默剥离 DTO 未定义字段

`main.ts` 中全局启用了 `whitelist: true`。如果前端传递的字段未在 DTO 中用装饰器声明，该字段会被静默丢弃，不会写入数据库。**新增 Json 字段时，必须同时在对应 DTO 中添加 `@IsOptional() @IsArray() fieldName?: string[]` 装饰器声明。** 这是之前 `images`/`attachments`/`checkImages` 等字段数据丢失的根因。

### 14. QualityCheck 模型没有 images 字段

`RepairOrder` 有 `images`（故障照片）和 `checkImages`（质检照片），但 `QualityCheck` 表只有 `itemsChecked`、`roadTest`、`isPassed`、`remark`。质检照片应存入 `repair_order.check_images` 而非 QualityCheck。

### 15. 禁止 Docker 部署

本项目不使用 Docker 部署，禁止创建或恢复 `docker-compose.yml`、`docker/` 目录等 Docker 相关文件，除非用户明确授权。CI/CD 通过 GitHub Actions + PM2 直接部署。`main.ts` 中已启用 `enableImplicitConversion: true` 自动处理查询参数类型转换（陷阱#7的框架级解决方案）。

### 16. 文件服务鉴权

`/uploads` 路径通过 `FileServeController`（`@Controller('uploads')` + `@UseGuards(JwtAuthGuard)`）提供文件访问，不再使用 `ServeStaticModule` 无鉴权静态服务。文件访问路径格式为 `GET /uploads/:module/:filename`，含路径穿越防护（禁止 `..`、`/`、`\` 字符）。`DELETE /upload/file/:module/:filename` 可删除已上传文件。
