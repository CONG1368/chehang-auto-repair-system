# 车行综合管理系统

**汽车维修厂内部管理平台** — 数字化管理 · 智能化运营 · 一体化服务

支持多角色（店长、销售顾问、服务顾问、维修技师、配件管理员、财务）通过 **浏览器（B/S）** 和 **手机 APP** 实时协同办公。

---

## 技术架构

```
packages/
├── server/          NestJS + TypeScript + Prisma + MySQL + Redis
├── web-admin/       Vue 3 + Element Plus + ECharts + Pinia + Axios
└── mobile/          uni-app (Vue 3) — 生成 APP + 微信小程序
```

| 层级 | 技术栈 |
|------|--------|
| 后端框架 | NestJS 10.x + TypeScript |
| 前端框架 | Vue 3 + Element Plus 2.x |
| 移动端 | uni-app (Vue 3)，支持 APP & 微信小程序 |
| ORM | Prisma 5.x（28 张数据表） |
| 数据库 | MySQL |
| 缓存/队列 | Redis（ioredis） |
| 认证 | JWT + Passport |
| 实时推送 | Socket.IO（12 种事件类型） |
| 图表 | ECharts 5.x（vue-echarts） |
| 测试 | Jest（单元测试）+ Playwright（E2E） |

## 业务模块

| 模块 | 说明 |
|------|------|
| **客户管理** | 客户档案、车辆信息、保养到期提醒、保险到期提醒、年检到期提醒、跟进记录 |
| **维修管理** | 维修工单全流程（接车→派工→维修→质检→交车）、工时/配件费用核算 |
| **销售管理** | 销售线索漏斗、整车销售订单、展车管理 |
| **美容管理** | 美容服务项目、套餐卡、预约管理、会员卡充值 |
| **库存管理** | 配件分类/供应商/采购单/出入库流水/低库存预警 |
| **财务管理** | 收款/应收/应付/费用支出/利润分析 |
| **发票管理** | 发票开具、查询、作废 |
| **报表中心** | 经营驾驶舱、营收趋势、业务占比、员工绩效、美容报表 |
| **通知系统** | 实时消息推送（Socket.IO）、已读/未读管理 |
| **系统管理** | 用户管理、角色管理（RBAC 权限模型）、操作日志审计 |
| **数据导出** | Excel 导出（12 个业务模块） |

## 维修工单状态流转

```
pending → assigned → repairing → quality_check → completed → delivered
(待派工)  (已派工)   (维修中)    (待质检)       (已完成)   (已交车)
```

质检不通过时 `quality_check` 回退到 `repairing`。

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- MySQL 5.7+
- Redis（可选，用于缓存与会话）

### 安装与运行

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp packages/server/.env.example packages/server/.env
# 编辑 .env 文件，填入数据库连接信息

# 3. 初始化数据库
pnpm db:generate
pnpm db:migrate
pnpm db:seed          # 导入种子数据（默认管理员账号）

# 4. 启动开发服务
pnpm dev:server       # 后端 → http://localhost:3000
pnpm dev:web          # 前端 → http://localhost:5173
pnpm dev:mobile       # 移动端开发

# 5. 构建生产版本
pnpm build:server && pnpm build:web
```

### 默认账号

| 账号 | 密码 |
|------|------|
| `admin` | `admin123` |

## 测试

```bash
pnpm test                              # 单元测试（16 套件 / 269 用例）
npx playwright test --reporter=list    # E2E 测试（45 用例）
```

---

## 版权声明

> **Copyright © 2025–2026. All rights reserved.**

**本仓库所有源代码、文档、设计及附属资料均受版权法保护，保留一切权利。**

### 授权范围

- **允许：** 个人学习、研究探讨、教育用途。欢迎 Star & Fork 用于非商业目的的学习交流。
- **严格禁止：** 未经版权人**书面授权**，任何个人或组织不得将本项目代码、文档或衍生作品用于任何**商业用途**，包括但不限于：
  - 直接部署于商业运营环境
  - 作为 SaaS 产品向第三方提供收费服务
  - 嵌入商业软件中进行销售或分发
  - 用于商业项目开发、外包交付或客户项目实施
  - 任何直接或间接产生经济收益的使用方式

### 侵权追责

对于违反上述条款的商业使用行为，版权人保留追究法律责任的权利，包括但不限于要求停止侵权、赔偿经济损失、承担维权合理开支（律师费、公证费等）。

### 授权咨询

如需商业授权，请联系版权人获取书面许可。
