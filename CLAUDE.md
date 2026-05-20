# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ 强制工作流规则（每次对话开始前必须执行）

### 1. 全程中文
开发全程和思考全程都必须用中文显示。包括但不限于：代码注释、提交信息、任务描述、进度汇报、用户沟通。内部思考（thinking）也必须用中文。

### 2. 任务追踪机制
每次开发任务必须遵循以下流程：

**开始开发前：**
- 使用 `TaskCreate` 创建子任务，描述要完成的具体功能
- 使用 `TaskUpdate` 将当前任务标记为 `in_progress`
- 先执行 `TaskList` 查看所有任务，确认依赖关系和优先级

**完成每个子任务后：**
- 立即使用 `TaskUpdate` 将该任务标记为 `completed`
- 执行 `TaskList` 查看剩余未完成任务
- 向用户汇报当前进度（已完成数/总数）

**每个阶段完成后：**
- 更新阶段主任务状态
- 汇总当前进度百分比
- 明确列出后续剩余开发任务清单

### 3. 构建验证
每个模块开发完成后必须执行构建验证：
```bash
pnpm build:server && pnpm build:web
```
构建失败时优先修复，不允许有编译错误留存。

### 4. 开发前检查清单
开始任何开发工作前，先执行：
1. `TaskList` — 了解当前任务状态
2. 阅读 `CLAUDE.md` 中的技术约定
3. 确认要修改的模块文件路径

---

## 项目概述

泰州车行维修厂部综合管理系统 — 汽车维修厂内部管理平台。支持多角色（销售顾问、服务顾问、维修技师、配件管理员、财务、店长）通过浏览器和手机APP实时协同办公。B/S架构，部署于云服务器。

## 开发命令

```bash
pnpm install                          # 安装全部依赖
pnpm dev:server                       # 启动NestJS后端 (http://localhost:3000)
pnpm dev:web                          # 启动Vue3前端 (http://localhost:5173)
pnpm build:server && pnpm build:web   # 构建前后端
docker-compose up -d                  # 启动MySQL+Redis
pnpm db:generate                      # 生成Prisma客户端
pnpm db:migrate                       # 运行数据库迁移
pnpm db:seed                          # 初始化种子数据
```

默认账号: `admin` / `admin123`

## 技术栈与架构

```
packages/
├── server/          NestJS + TypeScript + Prisma + MySQL + Redis
├── web-admin/       Vue 3 + Element Plus + ECharts + Pinia + Axios
└── mobile/          uni-app (Vue 3) — 生成 APP + 微信小程序
```

- **后端**: NestJS模块化架构，每个业务模块含 controller / service / dto
- **ORM**: Prisma，schema文件位于 `packages/server/prisma/schema.prisma`（28张表）
- **认证**: JWT Token + Passport，前端Bearer头注入，响应401自动跳转登录
- **权限**: RBAC模型，`SysRole.permissions` 存JSON数组，`*` 表示超级管理员
- **实时推送**: Socket.IO，WsGateway在 `packages/server/src/modules/ws/ws.gateway.ts`

## 后端关键约定

- **API响应格式**: `{ code: 200, message: "操作成功", data: ... }`，由 `TransformInterceptor` 统一包装
- **异常处理**: `HttpExceptionFilter` 全局捕获，返回统一格式错误
- **分页**: 使用 `PaginationDto`（page/pageSize），Service返回 `PaginatedResult`（list/total/page/pageSize/totalPages）
- **数据库字段映射**: Prisma模型字段使用camelCase，通过 `@map()` 映射到数据库snake_case列名
- **工单号格式**: `RO年月日-序号`（如RO20260519-001），销售订单号 `SO年月日-序号`
- **WebSocket通知**: RepairService/InventoryService注入可选的WsGateway，在create/updateStatus/stockOut等关键操作后推送

## 前端关键约定

- **API请求**: 统一使用 `request from @/api/request`（Axios实例，baseURL `/api`，拦截器自动解包 `data` 字段返回）
- **路由**: 所有业务页面在MainLayout下，需登录；`/login` 为公开路由
- **权限store**: `useAuthStore()` 提供 `token`、`userInfo`、`login()`、`logout()`、`hasPermission()`
- **图表**: vue-echarts使用default import方式 `import VChart from 'vue-echarts'`，在组件内use按需注册echarts模块
- **Vite代理**: 开发时 `/api` 代理到 `http://localhost:3000`

## 维修工单状态流转

```
pending → assigned → repairing → quality_check → completed → delivered
(待派工)  (已派工)   (维修中)    (待质检)       (已完成)   (已交车)
```

质检不通过时 `quality_check` 回退到 `repairing`。

## 数据库核心表

| 模块 | 核心表 |
|------|--------|
| 系统 | `sys_user`, `sys_role` |
| 客户 | `customer`, `customer_vehicle`, `follow_record`, `member_card` |
| 库存 | `part`, `part_stock`, `stock_record`, `part_category`, `supplier`, `purchase_order` |
| 维修 | `repair_order`, `repair_order_item`, `dispatch_record`, `quality_check` |
| 销售 | `vehicle_info`, `sales_lead`, `sales_order` |
| 美容 | `beauty_service`, `beauty_package`, `beauty_appointment` |
| 财务 | `payment_record`, `receivable`, `payable`, `expense_record`, `invoice_record` |

## 文件组织模式

新增业务功能时遵循既有模式：
- 后端: `modules/<name>/` 下放 `dto/`、`*.module.ts`、`*.controller.ts`、`*.service.ts`
- 前端: `views/<module>/` 下放各页面 `.vue` 文件，`api/` 下放请求封装，`stores/` 下放Pinia store
- 移动端: `pages/<module>/` 下放页面，页面内自行封装 `apiFetch` 函数调用uni.request
