# 四大功能设计文档

**日期**: 2026-05-20  
**状态**: 设计已确认，待实现

---

## 一、消息通知中心

### 1.1 数据库

新增 `Notification` 表（Prisma schema）：

```prisma
model Notification {
  id         Int       @id @default(autoincrement())
  userId     Int?      @map("user_id")
  type       String    @default("system")   // repair | stock | customer | system | beauty
  title      String
  content    String    @db.Text
  targetType String?   @map("target_type") // repair_order | sales_lead | part | customer
  targetId   Int?      @map("target_id")
  isRead     Boolean   @default(false) @map("is_read")
  readAt     DateTime? @map("read_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])

  @@map("notification")
  @@index([userId, isRead])
}
```

### 1.2 后端 API

| 端点 | 说明 |
|------|------|
| `GET /notifications?page=&pageSize=&type=&isRead=` | 分页列表（当前用户） |
| `GET /notifications/unread-count` | 未读数量 |
| `PUT /notifications/:id/read` | 标记单条已读 |
| `PUT /notifications/read-all` | 全部已读 |

### 1.3 WsGateway 改造

- 推送时同步写入 Notification 表
- 从全局广播改为按 userId 定向推送

### 1.4 前端

- **顶栏铃铛图标**：MainLayout header 右侧，用户头像左侧，带未读角标
- **下拉面板**：点击铃铛弹出，展示最近 5 条消息，支持点击跳转、全部已读、查看全部
- **消息中心页面** (`/notifications`)：左侧菜单入口，支持按类型筛选、分页、点击跳转目标
- **点击跳转规则**：

| targetType | 跳转行为 |
|-----------|---------|
| repair_order | router.push /repair/orders → 打开工单详情抽屉 |
| part | router.push /inventory/parts?keyword=xxx |
| customer | router.push /customer/list → 打开客户详情抽屉 |
| (空) | 弹窗展示公告全文 |

---

## 二、导出功能

### 2.1 技术选型

- **后端生成**：`exceljs` 生成 Excel，服务端渲染 PDF
- 新建 `ExportModule` / `ExportController` / `ExportService`

### 2.2 API

| 端点 | 说明 |
|------|------|
| `GET /export/excel?module=&type=&startDate=&endDate=&keyword=` | 导出 Excel |
| `GET /export/pdf?module=&type=&startDate=&endDate=&keyword=` | 导出 PDF |

`module` 取值：`report` | `customers` | `parts` | `repair` | `sales`

### 2.3 覆盖页面

| 页面 | PDF | Excel |
|------|-----|-------|
| 对账报表 (finance/reports) | ✅ | ✅ |
| 利润分析 (finance/profit) | ✅ | ✅ |
| 销售分析 (report/sales) | ✅ | ✅ |
| 维修分析 (report/repair) | ✅ | ✅ |
| 财务分析 (report/finance) | ✅ | ✅ |
| 数据大屏 (report/overview) | ✅ | — |
| 客户档案 (customer/list) | — | ✅ |
| 配件库存 (inventory/parts) | — | ✅ |
| 维修工单 (repair/orders) | — | ✅ |
| 销售订单 (sales/orders) | — | ✅ |

### 2.4 前端按钮

- 报表页面：操作栏右侧放「导出Excel」「导出PDF」两个按钮
- 列表页面：操作栏右侧放「导出Excel」按钮

---

## 三、打印功能

### 3.1 技术选型

- `print-js` 调起浏览器打印
- 每个票据独立打印模板组件（Vue SFC）

### 3.2 覆盖场景

| 页面 | 打印内容 | 触发方式 |
|------|---------|---------|
| 接车开单 (repair/reception) | 接车委托单 | 创建成功后弹出 |
| 工单详情 (repair/orders) | 维修施工单 | 详情抽屉底部按钮 |
| 质检交车 (repair/quality) | 质检报告+交车单 | 操作列按钮 |
| 销售订单 (sales/orders) | 销售合同/报价单 | 编辑弹窗底部 |
| 收银台 (finance/cashier) | 收款收据 | 收款成功后弹出 |
| 采购管理 (inventory/purchase) | 采购单 | 编辑弹窗底部 |
| 对账报表 (finance/reports) | 对账单 | 操作栏按钮 |

### 3.3 打印模板结构

每张票据用独立 Vue 组件，通过 `print-js` 以 iframe 方式打印，CSS `@media print` 控制 A4 布局。

---

## 四、文件上传功能

### 4.1 技术选型

- **后端**：`@nestjs/platform-express` + `multer`
- **存储**：本地 `uploads/{module}/` 目录
- **静态访问**：`ServeStaticModule` 映射 `/uploads` 路径
- **前端**：`el-upload` 组件，`multiple` 批量模式，支持拖拽+粘贴
- **限制**：不限制单文件大小

### 4.2 API

| 端点 | 说明 |
|------|------|
| `POST /upload/batch?module=customers\|vehicles\|repair\|quality\|parts\|purchase` | 批量上传 |

返回格式：
```json
{
  "urls": ["/uploads/vehicles/xxx.jpg", "/uploads/vehicles/yyy.jpg"],
  "count": 2
}
```

### 4.3 覆盖场景

| 页面 | 上传内容 | DB字段 |
|------|---------|--------|
| 客户档案 | 身份证/行驶证 | `images Json` |
| 车辆管理 | 外观/内饰照片 | `images Json` |
| 接车开单 | 故障部位照片 | `images Json` |
| 质检交车 | 质检照片 | `checkImages Json` |
| 配件管理 | 配件实物图 | `images Json` |
| 用户管理 | 头像 | `avatar String` (已存在) |
| 采购管理 | 合同/发票扫描件 | `attachments Json` |

### 4.4 Prisma 新增字段

```prisma
// Customer
images     Json?    // 证件照片列表
// VehicleInfo  
images     Json?    // 车辆照片列表
// RepairOrder
images     Json?    // 故障照片列表
checkImages Json?   // 质检照片列表
// Part
images     Json?    // 配件照片列表
// PurchaseOrder
attachments Json?   // 采购附件列表
```

---

## 实现顺序

1. 消息通知中心（WebSocket 已就绪，最快见效）
2. 导出功能（报表占位按钮已存在）
3. 打印功能（工单打印高频需求）
4. 文件上传（需新增 DB 字段和 multer 配置）
