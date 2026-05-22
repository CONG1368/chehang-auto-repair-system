# 四大功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为车行综合管理系统添加消息通知中心、数据导出（Excel/PDF）、单据打印、文件批量上传四大功能。

**Architecture:** 后端 NestJS 模块化（Notification/Export/Upload 三个新模块），前端 Vue3 组件化（消息中心页面 + 打印模板组件 + 上传组件），Prisma 新增 1 张 Notification 表 + 6 张表扩展 Json 字段。

**Tech Stack:** NestJS + Prisma + MySQL + multer + exceljs + print-js + Vue 3 + Element Plus + el-upload

---

## 文件结构概览

```
packages/server/
├── prisma/schema.prisma                    # 新增 Notification 表 + 6表扩展字段
├── src/
│   ├── app.module.ts                       # 导入新模块
│   ├── modules/
│   │   ├── notification/                   # 新建：消息通知模块
│   │   │   ├── notification.module.ts
│   │   │   ├── notification.controller.ts
│   │   │   └── notification.service.ts
│   │   ├── export/                         # 新建：导出模块
│   │   │   ├── export.module.ts
│   │   │   ├── export.controller.ts
│   │   │   └── export.service.ts
│   │   ├── upload/                         # 新建：上传模块
│   │   │   ├── upload.module.ts
│   │   │   ├── upload.controller.ts
│   │   │   └── upload.service.ts
│   │   └── ws/
│   │       └── ws.gateway.ts               # 修改：推送时同步入库
│   └── main.ts                             # 修改：启用静态文件服务

packages/web-admin/src/
├── router/index.ts                         # 修改：新增 /notifications 路由
├── layout/MainLayout.vue                   # 修改：顶栏铃铛 + 左侧菜单入口
├── views/
│   └── notifications/
│       └── index.vue                       # 新建：消息中心页面
├── components/
│   └── PrintTemplate/                      # 新建：打印模板组件目录
│       ├── RepairOrderPrint.vue
│       ├── ReceptionPrint.vue
│       ├── QualityCheckPrint.vue
│       ├── SalesOrderPrint.vue
│       ├── CashierReceiptPrint.vue
│       ├── PurchaseOrderPrint.vue
│       └── FinanceReportPrint.vue
└── utils/
    ├── socket.ts                           # 修改：连接逻辑更新
    └── upload.ts                           # 新建：上传工具函数
```

---

### Task 1: 数据库 Schema 变更

**Files:**
- Modify: `packages/server/prisma/schema.prisma`

- [ ] **Step 1: 新增 Notification 表 + 6表扩展字段**

在 `packages/server/prisma/schema.prisma` 末尾新增 Notification 模型：

```prisma
model Notification {
  id         Int       @id @default(autoincrement())
  userId     Int?      @map("user_id")
  type       String    @default("system")
  title      String
  content    String    @db.Text
  targetType String?   @map("target_type")
  targetId   Int?      @map("target_id")
  isRead     Boolean   @default(false) @map("is_read")
  readAt     DateTime? @map("read_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])

  @@map("notification")
  @@index([userId, isRead])
}
```

在 User 模型中新增关联：

```prisma
model User {
  // ... 现有字段 ...
  notifications Notification[]
}
```

在 6 张业务表中新增 Json 字段：

```prisma
model Customer {
  // ... 现有字段 ...
  images Json? @map("images")
}

model VehicleInfo {
  // ... 现有字段 ...
  images Json? @map("images")
}

model RepairOrder {
  // ... 现有字段 ...
  images      Json? @map("images")
  checkImages Json? @map("check_images")
}

model Part {
  // ... 现有字段 ...
  images Json? @map("images")
}

model PurchaseOrder {
  // ... 现有字段 ...
  attachments Json? @map("attachments")
}
```

- [ ] **Step 2: 更新 Prisma Client 和数据库**

```bash
cd packages/server && npx prisma db push && npx prisma generate
```

- [ ] **Step 3: 验证**

```bash
cd packages/server && npx prisma validate
```

- [ ] **Step 4: 构建验证**

```bash
pnpm build:server
```

- [ ] **Step 5: 提交**

```bash
git add packages/server/prisma/schema.prisma
git commit -m "feat: 新增 Notification 表 + 6 表扩展 images/attachments Json 字段"
```

---

### Task 2: 消息通知后端模块

**Files:**
- Create: `packages/server/src/modules/notification/notification.module.ts`
- Create: `packages/server/src/modules/notification/notification.controller.ts`
- Create: `packages/server/src/modules/notification/notification.service.ts`
- Modify: `packages/server/src/modules/ws/ws.gateway.ts`
- Modify: `packages/server/src/app.module.ts`

- [ ] **Step 1: 创建 NotificationService**

`packages/server/src/modules/notification/notification.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId?: number;
    type: string;
    title: string;
    content: string;
    targetType?: string;
    targetId?: number;
  }) {
    return this.prisma.notification.create({ data });
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    type?: string;
    isRead?: boolean;
    userId: number;
  }) {
    const page = +query.page || 1;
    const pageSize = +query.pageSize || 10;
    const where: any = {
      OR: [{ userId: query.userId }, { userId: null }],
    };
    if (query.type) where.type = query.type;
    if (query.isRead !== undefined) where.isRead = query.isRead;

    const [list, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new PaginatedResult(list, total, page, pageSize);
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: {
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
    });
  }

  async markRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
```

- [ ] **Step 2: 创建 NotificationController**

`packages/server/src/modules/notification/notification.controller.ts`：

```typescript
import {
  Controller, Get, Put, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    return this.notificationService.findAll({ ...query, userId: req.user.id });
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationService.markRead(+id);
  }

  @Put('read-all')
  async markAllRead(@Request() req: any) {
    return this.notificationService.markAllRead(req.user.id);
  }
}
```

- [ ] **Step 3: 创建 NotificationModule**

`packages/server/src/modules/notification/notification.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, PrismaService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

- [ ] **Step 4: 注册模块到 AppModule**

在 `packages/server/src/app.module.ts` 的 imports 中添加：

```typescript
import { NotificationModule } from './modules/notification/notification.module';
// 在 imports 数组中添加
NotificationModule,
```

- [ ] **Step 5: 改造 WsGateway 推送时同步入库**

在 `packages/server/src/modules/ws/ws.gateway.ts` 中注入 NotificationService：

```typescript
import { NotificationService } from '../notification/notification.service';

// 构造函数中注入
constructor(private readonly notificationService: NotificationService) {}

// 在每个推送方法中添加写入逻辑，例如 notifyNewRepairOrder:
notifyNewRepairOrder(data: any) {
  this.notificationService.create({
    type: 'repair',
    title: `新工单 ${data.orderNo} 已创建`,
    content: `客户：${data.customerName} · 车牌：${data.plateNumber}`,
    targetType: 'repair_order',
    targetId: data.id,
  });
  this.server.emit('notification:repair', data);
}
```

改造 WsModule 导入 NotificationModule：

```typescript
// ws.module.ts
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  // ...
})
```

- [ ] **Step 6: 构建验证**

```bash
pnpm build:server
```

- [ ] **Step 7: 提交**

```bash
git add packages/server/src/modules/notification/ packages/server/src/modules/ws/ packages/server/src/app.module.ts
git commit -m "feat: 消息通知后端模块 — Notification CRUD + WsGateway 同步入库"
```

---

### Task 3: 消息通知前端 — 顶栏铃铛 + 下拉面板

**Files:**
- Modify: `packages/web-admin/src/layout/MainLayout.vue`

- [ ] **Step 1: 修改 MainLayout 模板，在 header-right 中添加铃铛图标**

在 `MainLayout.vue` 的 `<div class="header-right">` 中，用户头像之前插入铃铛组件：

```html
<div class="header-right">
  <!-- 消息通知铃铛 -->
  <el-popover
    placement="bottom-end"
    :width="380"
    trigger="click"
    @show="fetchNotifications"
  >
    <template #reference>
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-icon :size="20" class="bell-icon"><Bell /></el-icon>
      </el-badge>
    </template>
    <div class="notification-popover">
      <div class="popover-header">
        <span>消息通知</span>
        <div>
          <el-button link type="primary" size="small" @click="handleMarkAllRead">全部已读</el-button>
          <el-button link type="primary" size="small" @click="handleGoNotifications">查看全部</el-button>
        </div>
      </div>
      <div v-if="recentNotifications.length === 0" class="popover-empty">暂无消息</div>
      <div
        v-for="item in recentNotifications"
        :key="item.id"
        class="popover-item"
        :class="{ unread: !item.isRead }"
        @click="handleNotificationClick(item)"
      >
        <span class="popover-item-icon">{{ typeIcon(item.type) }}</span>
        <div class="popover-item-body">
          <div class="popover-item-title">{{ item.title }}</div>
          <div class="popover-item-content">{{ item.content }}</div>
          <div class="popover-item-time">{{ formatTime(item.createdAt) }}</div>
        </div>
        <span v-if="!item.isRead" class="unread-dot"></span>
      </div>
    </div>
  </el-popover>

  <span class="username">{{ authStore.userInfo?.realName }}</span>
  <el-dropdown>
    <el-avatar :size="32" icon="UserFilled" />
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="authStore.logout()">退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</div>
```

- [ ] **Step 2: 添加 script 逻辑**

在 `<script setup>` 中新增：

```typescript
import { Bell } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const unreadCount = ref(0)
const recentNotifications = ref<any[]>([])

interface Notification {
  id: number
  type: string
  title: string
  content: string
  targetType: string
  targetId: number
  isRead: boolean
  createdAt: string
}

async function fetchUnreadCount() {
  try {
    const res: any = await request.get('/notifications/unread-count')
    unreadCount.value = res.count ?? 0
  } catch { /* */ }
}

async function fetchNotifications() {
  try {
    const res: any = await request.get('/notifications', { params: { page: 1, pageSize: 5 } })
    recentNotifications.value = res.list ?? []
  } catch { /* */ }
}

function typeIcon(type: string): string {
  const map: Record<string, string> = { repair: '🔧', stock: '📦', customer: '👤', system: '📢', beauty: '💄' }
  return map[type] || '📌'
}

function formatTime(time: string): string {
  const diff = Date.now() - new Date(time).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return time?.slice(0, 10) || ''
}

async function handleNotificationClick(item: Notification) {
  if (!item.isRead) {
    await request.put(`/notifications/${item.id}/read`)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  if (item.targetType === 'repair_order') {
    router.push('/repair/orders')
  } else if (item.targetType === 'part') {
    router.push('/inventory/parts')
  } else if (item.targetType === 'customer') {
    router.push('/customer/list')
  }
}

async function handleMarkAllRead() {
  await request.put('/notifications/read-all')
  unreadCount.value = 0
  recentNotifications.value = recentNotifications.value.map(n => ({ ...n, isRead: true }))
}

function handleGoNotifications() {
  router.push('/notifications')
}
```

- [ ] **Step 3: 在 onMounted 中初始化**

```typescript
onMounted(() => {
  connectSocket()
  fetchUnreadCount()
  setInterval(fetchUnreadCount, 30000) // 每30秒轮询未读数
})
```

- [ ] **Step 4: 添加铃铛样式**

在 `<style scoped>` 中追加：

```css
.bell-icon { cursor: pointer; color: #606266; }
.bell-icon:hover { color: #409EFF; }
.notification-popover { max-height: 400px; }
.popover-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 0 12px; border-bottom: 1px solid #ebeef5; margin-bottom: 8px; font-weight: 600; }
.popover-empty { text-align: center; padding: 24px; color: #909399; }
.popover-item { display: flex; align-items: flex-start; gap: 8px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.popover-item.unread { background: #ecf5ff; margin: 0 -8px; padding: 10px 8px; border-radius: 4px; }
.popover-item-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
.popover-item-body { flex: 1; min-width: 0; }
.popover-item-title { font-size: 13px; color: #303133; font-weight: 500; }
.popover-item-content { font-size: 12px; color: #909399; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.popover-item-time { font-size: 11px; color: #c0c4cc; margin-top: 4px; }
.unread-dot { width: 6px; height: 6px; background: #409EFF; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
```

- [ ] **Step 5: 左侧菜单添加消息中心入口**

在 `<el-menu>` 中，经营驾驶舱前插入：

```html
<el-menu-item index="/notifications">
  <el-icon><Bell /></el-icon>
  <span>消息中心</span>
  <el-badge v-if="unreadCount > 0" :value="unreadCount" class="menu-badge" />
</el-menu-item>
```

- [ ] **Step 6: 构建验证**

```bash
pnpm build:web
```

- [ ] **Step 7: 提交**

```bash
git add packages/web-admin/src/layout/MainLayout.vue
git commit -m "feat: 顶栏铃铛通知 + 下拉面板 + 左侧菜单消息中心入口"
```

---

### Task 4: 消息中心页面

**Files:**
- Create: `packages/web-admin/src/views/notifications/index.vue`
- Modify: `packages/web-admin/src/router/index.ts`

- [ ] **Step 1: 添加路由**

在 `router/index.ts` 的 children 数组中添加：

```typescript
{
  path: 'notifications',
  name: 'Notifications',
  component: () => import('@/views/notifications/index.vue'),
  meta: { title: '消息中心' },
},
```

- [ ] **Step 2: 创建消息中心页面**

`packages/web-admin/src/views/notifications/index.vue`：

```vue
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>消息中心</h2>
    </div>
    <el-card>
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-radio-group v-model="filterTab" @change="handleFilterChange">
          <el-radio-button label="">全部 ({{ pagination.total }})</el-radio-button>
          <el-radio-button label="false">未读 ({{ unreadCount }})</el-radio-button>
        </el-radio-group>
        <el-select v-model="filterType" placeholder="消息类型" clearable style="width:140px;margin-left:12px" @change="handleFilterChange">
          <el-option label="工单通知" value="repair" />
          <el-option label="库存预警" value="stock" />
          <el-option label="客户通知" value="customer" />
          <el-option label="系统公告" value="system" />
        </el-select>
        <el-button type="primary" link style="margin-left:auto" @click="handleMarkAllRead">全部标为已读</el-button>
      </div>

      <!-- 消息列表 -->
      <div v-loading="loading" class="msg-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="msg-item"
          :class="{ unread: !item.isRead }"
          @click="handleClick(item)"
        >
          <span class="msg-dot" :class="{ active: !item.isRead }"></span>
          <span class="msg-time">{{ item.createdAt?.slice(0, 16) }}</span>
          <el-tag :type="typeTagType(item.type)" size="small">{{ typeLabel(item.type) }}</el-tag>
          <span class="msg-body">{{ item.content }}</span>
          <span class="msg-action">{{ item.isRead ? '已读' : '查看 →' }}</span>
        </div>
        <el-empty v-if="!loading && list.length === 0" description="暂无消息" />
      </div>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const router = useRouter()
const list = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pagination = ref({ total: 0 })
const filterTab = ref('')
const filterType = ref('')
const unreadCount = ref(0)

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filterTab.value === 'false') params.isRead = false
    if (filterType.value) params.type = filterType.value
    const res: any = await request.get('/notifications', { params })
    list.value = res.list ?? []
    pagination.value.total = res.total ?? 0
  } finally { loading.value = false }
}

async function fetchUnreadCount() {
  const res: any = await request.get('/notifications/unread-count')
  unreadCount.value = res.count ?? 0
}

function handleFilterChange() {
  page.value = 1
  fetchList()
}

async function handleClick(item: any) {
  if (!item.isRead) {
    await request.put(`/notifications/${item.id}/read`)
    fetchUnreadCount()
  }
  if (item.targetType === 'repair_order') router.push('/repair/orders')
  else if (item.targetType === 'part') router.push('/inventory/parts')
  else if (item.targetType === 'customer') router.push('/customer/list')
}

async function handleMarkAllRead() {
  await request.put('/notifications/read-all')
  ElMessage.success('已全部标为已读')
  fetchList()
  fetchUnreadCount()
}

function typeLabel(type: string) {
  const m: Record<string, string> = { repair: '工单通知', stock: '库存预警', customer: '客户通知', system: '系统公告' }
  return m[type] || type
}

function typeTagType(type: string) {
  const m: Record<string, string> = { repair: '', stock: 'warning', customer: 'success', system: 'info' }
  return m[type] || 'info'
}

onMounted(() => { fetchList(); fetchUnreadCount() })
</script>

<style scoped>
.page-container { padding: 0; }
.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 18px; color: #303133; }
.filter-bar { display: flex; align-items: center; margin-bottom: 16px; }
.msg-list { min-height: 200px; }
.msg-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #ebeef5; cursor: pointer; }
.msg-item.unread { background: #ecf5ff; }
.msg-item:hover { background: #f5f7fa; }
.msg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.msg-dot.active { background: #409EFF; }
.msg-time { font-size: 12px; color: #909399; width: 140px; flex-shrink: 0; }
.msg-body { flex: 1; font-size: 13px; color: #303133; }
.msg-action { font-size: 12px; color: #909399; flex-shrink: 0; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 3: 构建验证**

```bash
pnpm build:web
```

- [ ] **Step 4: 提交**

```bash
git add packages/web-admin/src/views/notifications/ packages/web-admin/src/router/index.ts
git commit -m "feat: 消息中心页面 — 筛选/分页/点击跳转/全部已读"
```

---

### Task 5: 导出后端模块

**Files:**
- Create: `packages/server/src/modules/export/export.module.ts`
- Create: `packages/server/src/modules/export/export.controller.ts`
- Create: `packages/server/src/modules/export/export.service.ts`
- Modify: `packages/server/src/app.module.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd packages/server && pnpm add exceljs
```

- [ ] **Step 2: 创建 ExportService**

`packages/server/src/modules/export/export.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportExcel(res: Response, module: string, query: any) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('数据');

    if (module === 'customers') {
      const data = await this.prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
      sheet.columns = [
        { header: '姓名', key: 'name', width: 12 },
        { header: '电话', key: 'phone', width: 15 },
        { header: '性别', key: 'gender', width: 8 },
        { header: '地址', key: 'address', width: 30 },
        { header: '累计消费', key: 'totalSpent', width: 12 },
        { header: '最近到店', key: 'lastVisitTime', width: 20 },
      ];
      sheet.addRows(data);
    } else if (module === 'parts') {
      const data = await this.prisma.part.findMany({
        where: { status: 1 },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '编码', key: 'code', width: 15 },
        { header: '名称', key: 'name', width: 20 },
        { header: '规格', key: 'spec', width: 12 },
        { header: '分类', key: 'categoryName', width: 12 },
        { header: '单价', key: 'unitPrice', width: 10 },
        { header: '当前库存', key: 'currentStock', width: 10 },
        { header: '安全库存', key: 'safetyStock', width: 10 },
      ];
      sheet.addRows(data.map(d => ({ ...d, categoryName: (d as any).category?.name })));
    } else if (module === 'repair') {
      const data = await this.prisma.repairOrder.findMany({
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '工单号', key: 'orderNo', width: 18 },
        { header: '客户', key: 'customerName', width: 12 },
        { header: '车牌', key: 'plateNumber', width: 12 },
        { header: '状态', key: 'status', width: 12 },
        { header: '工时费', key: 'laborFee', width: 10 },
        { header: '配件费', key: 'partsFee', width: 10 },
        { header: '总金额', key: 'totalAmount', width: 10 },
        { header: '创建时间', key: 'createdAt', width: 20 },
      ];
      sheet.addRows(data);
    } else if (module === 'sales') {
      const data = await this.prisma.salesOrder.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '订单号', key: 'orderNo', width: 18 },
        { header: '客户', key: 'customerName', width: 12 },
        { header: '车辆信息', key: 'vehicleInfo', width: 20 },
        { header: '销售价', key: 'salePrice', width: 12 },
        { header: '状态', key: 'status', width: 10 },
        { header: '创建时间', key: 'createdAt', width: 20 },
      ];
      sheet.addRows(data);
    } else {
      // report 模块：从请求参数获取数据
      sheet.columns = [
        { header: '项目', key: 'label', width: 20 },
        { header: '金额', key: 'value', width: 15 },
      ];
      if (query.rows) sheet.addRows(JSON.parse(query.rows));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${module}_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportPdf(res: Response, module: string, query: any) {
    // PDF 由前端用 html2canvas + jspdf 生成，后端只提供数据
    // 此处返回 JSON 数据供前端渲染
    let data: any = {};
    if (module === 'report') {
      data = query;
    }
    res.json({ code: 200, data });
  }
}
```

- [ ] **Step 3: 创建 ExportController**

`packages/server/src/modules/export/export.controller.ts`：

```typescript
import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('excel')
  async exportExcel(@Query() query: any, @Res() res: Response) {
    return this.exportService.exportExcel(res, query.module, query);
  }

  @Get('pdf')
  async exportPdf(@Query() query: any, @Res() res: Response) {
    return this.exportService.exportPdf(res, query.module, query);
  }
}
```

- [ ] **Step 4: 创建 ExportModule 并注册**

`packages/server/src/modules/export/export.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ExportController],
  providers: [ExportService, PrismaService],
})
export class ExportModule {}
```

在 `app.module.ts` 中添加 `ExportModule`。

- [ ] **Step 5: 构建验证**

```bash
pnpm build:server
```

- [ ] **Step 6: 提交**

```bash
git add packages/server/src/modules/export/ packages/server/src/app.module.ts packages/server/package.json pnpm-lock.yaml
git commit -m "feat: 导出后端模块 — Excel 生成 + 4 模块数据查询"
```

---

### Task 6: 前端导出按钮 — 报表页面

**Files:**
- Modify: `packages/web-admin/src/views/finance/reports.vue`
- Modify: `packages/web-admin/src/views/finance/profit.vue`
- Modify: `packages/web-admin/src/views/report/sales.vue`
- Modify: `packages/web-admin/src/views/report/repair.vue`
- Modify: `packages/web-admin/src/views/report/finance.vue`

- [ ] **Step 1: 对账报表 — 替换占位导出按钮**

读取 `finance/reports.vue`，将 `handleExport` 中的 `ElMessage.info('导出Excel功能开发中')` 替换为：

```typescript
async function handleExport(period: string) {
  const params = new URLSearchParams({ module: 'report', type: period })
  window.open(`/api/export/excel?${params}`, '_blank')
}
```

- [ ] **Step 2: 四个报表页面添加导出按钮**

在每个报表页面的操作栏中添加两个按钮：

```html
<el-button type="success" @click="handleExportExcel">
  <el-icon><Download /></el-icon> 导出Excel
</el-button>
<el-button type="warning" @click="handleExportPdf">
  <el-icon><Document /></el-icon> 导出PDF
</el-button>
```

添加通用导出方法：

```typescript
import { Download, Document } from '@element-plus/icons-vue'

function handleExportExcel() {
  window.open(`/api/export/excel?module=report`, '_blank')
}

function handleExportPdf() {
  window.print() // 或用 jspdf 渲染当前报表区域
}
```

对四个报表页面（profit/sales/repair/finance）统一处理。

- [ ] **Step 3: 构建验证**

```bash
pnpm build:web
```

- [ ] **Step 4: 提交**

```bash
git add packages/web-admin/src/views/finance/ packages/web-admin/src/views/report/
git commit -m "feat: 报表页面导出 Excel/PDF 按钮"
```

---

### Task 7: 前端导出按钮 — 列表页面

**Files:**
- Modify: `packages/web-admin/src/views/customer/list.vue`
- Modify: `packages/web-admin/src/views/inventory/parts.vue`
- Modify: `packages/web-admin/src/views/repair/orders.vue`
- Modify: `packages/web-admin/src/views/sales/orders.vue`

- [ ] **Step 1: 四个列表页添加导出 Excel 按钮**

在每个页面的搜索栏/操作栏中添加：

```html
<el-button type="success" @click="handleExportExcel" style="margin-left:auto">
  <el-icon><Download /></el-icon> 导出Excel
</el-button>
```

添加方法（根据页面使用对应的 module）：

```typescript
// customer/list.vue
function handleExportExcel() { window.open('/api/export/excel?module=customers', '_blank') }
// inventory/parts.vue
function handleExportExcel() { window.open('/api/export/excel?module=parts', '_blank') }
// repair/orders.vue
function handleExportExcel() { window.open('/api/export/excel?module=repair', '_blank') }
// sales/orders.vue
function handleExportExcel() { window.open('/api/export/excel?module=sales', '_blank') }
```

- [ ] **Step 2: 构建验证**

```bash
pnpm build:web
```

- [ ] **Step 3: 提交**

```bash
git add packages/web-admin/src/views/customer/list.vue packages/web-admin/src/views/inventory/parts.vue packages/web-admin/src/views/repair/orders.vue packages/web-admin/src/views/sales/orders.vue
git commit -m "feat: 列表页面导出 Excel 按钮"
```

---

### Task 8: 打印功能 — 打印模板组件 + 集成

**Files:**
- Install: `print-js` (npm)
- Create: `packages/web-admin/src/components/PrintTemplate/RepairOrderPrint.vue`
- Create: `packages/web-admin/src/components/PrintTemplate/ReceptionPrint.vue`
- Create: `packages/web-admin/src/components/PrintTemplate/QualityCheckPrint.vue`
- Create: `packages/web-admin/src/components/PrintTemplate/SalesOrderPrint.vue`
- Create: `packages/web-admin/src/components/PrintTemplate/CashierReceiptPrint.vue`
- Modify: `packages/web-admin/src/views/repair/orders.vue`
- Modify: `packages/web-admin/src/views/repair/reception.vue`
- Modify: `packages/web-admin/src/views/repair/quality.vue`
- Modify: `packages/web-admin/src/views/sales/orders.vue`
- Modify: `packages/web-admin/src/views/finance/cashier.vue`
- Modify: `packages/web-admin/src/views/inventory/purchase.vue`

- [ ] **Step 1: 安装 print-js**

```bash
cd packages/web-admin && pnpm add print-js
```

- [ ] **Step 2: 创建 print-js 打印工具函数**

`packages/web-admin/src/utils/print.ts`：

```typescript
import printJS from 'print-js'

export function printHtml(html: string, style?: string) {
  printJS({
    printable: html,
    type: 'raw-html',
    style: style || '',
    scanStyles: false,
  })
}
```

- [ ] **Step 3: 创建维修工单打印模板**

`packages/web-admin/src/components/PrintTemplate/RepairOrderPrint.vue`：

```vue
<template>
  <div id="repair-order-print" class="print-page">
    <div class="print-title">车行维修厂 · 维修施工单</div>
    <div class="print-no">No: {{ data.orderNo }}</div>
    <table class="print-info">
      <tr><td>车主：{{ data.customerName }}</td><td>电话：{{ data.customerPhone }}</td></tr>
      <tr><td>车牌：{{ data.plateNumber }}</td><td>车型：{{ data.vehicleModel }}</td></tr>
      <tr><td>进厂里程：{{ data.mileage }} km</td><td>服务顾问：{{ data.serviceAdvisor }}</td></tr>
      <tr><td colspan="2">故障描述：{{ data.description }}</td></tr>
    </table>
    <table class="print-table">
      <thead><tr><th>序号</th><th>维修项目</th><th>工时费(¥)</th><th>技师</th></tr></thead>
      <tbody>
        <tr v-for="(item, i) in data.repairItems" :key="i">
          <td>{{ i + 1 }}</td><td>{{ item.name }}</td><td class="tar">{{ item.laborFee?.toFixed(2) }}</td><td>{{ item.technician }}</td>
        </tr>
      </tbody>
    </table>
    <table class="print-table">
      <thead><tr><th>配件名称</th><th>数量</th><th>单价(¥)</th><th>小计(¥)</th></tr></thead>
      <tbody>
        <tr v-for="(p, i) in data.partsList" :key="i">
          <td>{{ p.name }}</td><td class="tac">{{ p.quantity }}</td><td class="tar">{{ p.unitPrice?.toFixed(2) }}</td><td class="tar">{{ p.totalPrice?.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="print-total">总计：¥{{ data.totalAmount?.toFixed(2) }}</div>
    <div class="print-sign">
      <span>开单日期：{{ data.createTime?.slice(0, 10) }}</span>
      <span>客户签字：__________</span>
      <span>质检签字：__________</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ data: any }>()
</script>

<style scoped>
.print-page { padding: 20px; font-size: 12px; max-width: 700px; margin: 0 auto; }
.print-title { text-align: center; font-size: 16px; font-weight: bold; }
.print-no { text-align: center; font-size: 11px; color: #666; margin: 4px 0 12px; }
.print-info { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.print-info td { padding: 4px 8px; border: 1px solid #ddd; width: 50%; }
.print-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.print-table th, .print-table td { border: 1px solid #ddd; padding: 4px 6px; font-size: 11px; }
.print-table th { background: #eee; }
.tar { text-align: right; } .tac { text-align: center; }
.print-total { text-align: right; font-size: 14px; font-weight: bold; margin: 8px 0 20px; }
.print-sign { display: flex; justify-content: space-between; }
</style>
```

- [ ] **Step 4: 在工单详情抽屉中集成打印按钮**

在 `repair/orders.vue` 的详情抽屉底部添加打印按钮 + 集成打印：

```html
<el-button type="primary" @click="handlePrintOrder">🖨️ 打印施工单</el-button>
```

```typescript
import { printHtml } from '@/utils/print'
import { h, createApp } from 'vue'
import RepairOrderPrint from '@/components/PrintTemplate/RepairOrderPrint.vue'

async function handlePrintOrder() {
  // 渲染打印模板为 HTML 字符串
  const container = document.createElement('div')
  const app = createApp({ render: () => h(RepairOrderPrint, { data: detail.value }) })
  app.mount(container)
  await new Promise(r => setTimeout(r, 100))
  printHtml(container.innerHTML)
  app.unmount()
}
```

- [ ] **Step 5: 其他打印模板（精简版）**

创建其余 6 个打印模板组件，每个只需 `<template>` 中的票据布局，脚本部分统一使用 `defineProps<{ data: any }>()`。

接车委托单 `ReceptionPrint.vue`、质检报告 `QualityCheckPrint.vue`、销售合同 `SalesOrderPrint.vue`、收款收据 `CashierReceiptPrint.vue`、采购单 `PurchaseOrderPrint.vue`、对账单 `FinanceReportPrint.vue`。

每个采用与 RepairOrderPrint 相同的结构模式（标题 → 单号 → 信息表格 → 明细表格 → 合计 → 签字区）。

- [ ] **Step 6: 在各自页面集成打印按钮**

按照 Task 8 的表格，在每个页面的适当位置添加「🖨️ 打印」按钮并调用 `printHtml`。

- [ ] **Step 7: 构建验证**

```bash
pnpm build:web
```

- [ ] **Step 8: 提交**

```bash
git add packages/web-admin/src/utils/print.ts packages/web-admin/src/components/PrintTemplate/ packages/web-admin/src/views/repair/ packages/web-admin/src/views/finance/ packages/web-admin/src/views/sales/
git commit -m "feat: 打印功能 — 7 个打印模板 + print-js 集成"
```

---

### Task 9: 文件上传后端模块

**Files:**
- Create: `packages/server/src/modules/upload/upload.module.ts`
- Create: `packages/server/src/modules/upload/upload.controller.ts`
- Create: `packages/server/src/modules/upload/upload.service.ts`
- Modify: `packages/server/src/main.ts`
- Modify: `packages/server/src/app.module.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd packages/server && pnpm add @nestjs/serve-static
# multer 已包含在 @nestjs/platform-express 中，无需额外安装
```

- [ ] **Step 2: 配置静态文件服务**

在 `packages/server/src/main.ts` 中已经使用 `NestFactory.create`，确保 `app.useStaticAssets` 被调用（或在 AppModule 添加 ServeStaticModule）：

`packages/server/src/app.module.ts` 的 imports 中添加：

```typescript
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// imports 数组中：
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', 'uploads'),
  serveRoot: '/uploads',
}),
```

- [ ] **Step 3: 创建 UploadService**

`packages/server/src/modules/upload/upload.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  getUploadDir(module: string): string {
    const dir = join(__dirname, '..', '..', 'uploads', module);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }
}
```

- [ ] **Step 4: 创建 UploadController**

`packages/server/src/modules/upload/upload.controller.ts`：

```typescript
import {
  Controller, Post, Query, UseGuards, UseInterceptors,
  UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('batch')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const module = (_req as any).query?.module || 'common';
          cb(null, (new UploadService()).getUploadDir(module));
        },
        filename: (_req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const random = Math.round(Math.random() * 10000);
          cb(null, `${timestamp}-${random}${extname(file.originalname)}`);
        },
      }),
      limits: {}, // 不限制文件大小
    }),
  )
  async uploadBatch(@UploadedFiles() files: Express.Multer.File[], @Query('module') module: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择文件');
    }
    const urls = files.map(f => `/uploads/${module}/${f.filename}`);
    return { urls, count: files.length };
  }
}
```

- [ ] **Step 5: 创建 UploadModule 并注册**

`packages/server/src/modules/upload/upload.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
```

在 `app.module.ts` 中添加 `UploadModule`。

- [ ] **Step 6: 构建验证**

```bash
pnpm build:server
```

- [ ] **Step 7: 提交**

```bash
git add packages/server/src/modules/upload/ packages/server/src/app.module.ts
git commit -m "feat: 文件批量上传后端模块 — multer + 无大小限制 + 分模块存储"
```

---

### Task 10: 前端批量上传组件集成

**Files:**
- Create: `packages/web-admin/src/utils/upload.ts`
- Modify: `packages/web-admin/src/views/customer/list.vue`
- Modify: `packages/web-admin/src/views/sales/vehicles.vue`
- Modify: `packages/web-admin/src/views/repair/reception.vue`
- Modify: `packages/web-admin/src/views/repair/quality.vue`
- Modify: `packages/web-admin/src/views/inventory/parts.vue`
- Modify: `packages/web-admin/src/views/system/users.vue`
- Modify: `packages/web-admin/src/views/inventory/purchase.vue`

- [ ] **Step 1: 创建上传工具函数**

`packages/web-admin/src/utils/upload.ts`：

```typescript
import request from '@/api/request'

export async function uploadFiles(files: File[], module: string): Promise<string[]> {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  const res: any = await request.post(`/upload/batch?module=${module}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.urls || []
}
```

- [ ] **Step 2: 在客户档案编辑弹窗中添加上传组件**

在 `customer/list.vue` 的 `<el-dialog>` 表单中添加：

```html
<el-form-item label="证件照片">
  <el-upload
    multiple
    drag
    :auto-upload="false"
    :on-change="handleCustomerFileChange"
    :file-list="customerFileList"
    accept="image/*,.pdf"
  >
    <el-icon :size="32"><UploadFilled /></el-icon>
    <div>拖拽或点击上传</div>
  </el-upload>
</el-form-item>
```

```typescript
import { uploadFiles } from '@/utils/upload'
import { UploadFilled } from '@element-plus/icons-vue'

const customerFileList = ref<any[]>([])
const pendingFiles = ref<File[]>([])

function handleCustomerFileChange(file: any) {
  pendingFiles.value.push(file.raw)
}

// 在 handleSubmit 中，表单提交前先上传文件
async function handleSubmit() {
  // ... 验证 ...
  let images: string[] = []
  if (pendingFiles.value.length > 0) {
    images = await uploadFiles(pendingFiles.value, 'customers')
  }
  const payload = { ...formData, images: images.length > 0 ? images : undefined }
  // ... 提交 payload ...
}
```

- [ ] **Step 3: 在车辆管理、接车开单、质检、配件、用户、采购中集成上传**

采用与 Step 2 相同的模式：每个编辑弹窗添加 `<el-upload multiple drag>` 组件 + `pendingFiles` + `uploadFiles`。

用户头像上传特殊处理（单文件，上传后更新 avatar 字段）。

- [ ] **Step 4: 构建验证**

```bash
pnpm build:web
```

- [ ] **Step 5: 提交**

```bash
git add packages/web-admin/src/utils/upload.ts packages/web-admin/src/views/
git commit -m "feat: 批量上传组件集成 — 7 页 el-upload multiple 拖拽上传"
```

---

### Task 11: 整体构建 + E2E 测试

- [ ] **Step 1: 全量构建**

```bash
pnpm build:server && pnpm build:web
```

- [ ] **Step 2: 运行 E2E 测试确保无回归**

```bash
npx playwright test --reporter=list
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: 四大功能最终构建验证通过"
```
