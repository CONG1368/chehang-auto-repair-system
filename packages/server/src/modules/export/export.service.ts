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
        { header: '单价', key: 'price', width: 10 },
        { header: '当前库存', key: 'currentStock', width: 10 },
        { header: '安全库存', key: 'safetyStock', width: 10 },
      ];
      sheet.addRows(data.map((d: any) => ({ ...d, categoryName: d.category?.name, currentStock: d.stock?.quantity ?? 0 })));
    } else if (module === 'repair') {
      const data = await this.prisma.repairOrder.findMany({
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '工单号', key: 'orderNo', width: 18 },
        { header: '客户', key: 'customerName', width: 12 },
        { header: '车牌', key: 'plateNumber', width: 12 },
        { header: '状态', key: 'status', width: 12 },
        { header: '工时费', key: 'totalLaborFee', width: 10 },
        { header: '配件费', key: 'totalPartFee', width: 10 },
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
      sheet.addRows(data.map((d: any) => ({
        ...d, customerName: d.customer?.name, salePrice: Number(d.salePrice),
      })));
    } else if (module === 'leads') {
      const data = await this.prisma.salesLead.findMany({
        include: {
          customer: true,
          user: { select: { id: true, realName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '客户姓名', key: 'customerName', width: 12 },
        { header: '电话', key: 'phone', width: 15 },
        { header: '意向车型', key: 'intendedVehicle', width: 20 },
        { header: '预算(¥)', key: 'budget', width: 12 },
        { header: '来源', key: 'source', width: 10 },
        { header: '负责员工', key: 'salesName', width: 12 },
        { header: '意向等级', key: 'intentLevel', width: 10 },
        { header: '状态', key: 'status', width: 10 },
        { header: '下次跟进时间', key: 'nextFollowAt', width: 18 },
        { header: '创建时间', key: 'createdAt', width: 18 },
      ];
      sheet.addRows(data.map((d: any) => ({
        customerName: d.customer?.name ?? '-',
        phone: d.customer?.phone ?? '-',
        intendedVehicle: d.intentModel ?? '-',
        intentLevel: d.intent ?? '-',
        salesName: d.user?.realName ?? '-',
        source: d.source ?? '-',
        budget: d.budget != null ? Number(d.budget) : null,
        status: d.status ?? '-',
        nextFollowAt: d.nextFollowAt,
        createdAt: d.createdAt,
      })));
    } else if (module === 'vehicles') {
      const data = await this.prisma.vehicleInfo.findMany({
        where: { status: 1 },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '品牌', key: 'brand', width: 12 },
        { header: '车系', key: 'series', width: 12 },
        { header: '车型', key: 'model', width: 15 },
        { header: '年款', key: 'yearModel', width: 8 },
        { header: '颜色', key: 'color', width: 10 },
        { header: '指导价(¥)', key: 'guidePrice', width: 12 },
        { header: '销售价(¥)', key: 'salePrice', width: 12 },
        { header: '库存状态', key: 'stockStatus', width: 10 },
        { header: '创建时间', key: 'createdAt', width: 18 },
      ];
      sheet.addRows(data.map((d: any) => ({
        ...d,
        guidePrice: Number(d.guidePrice),
        salePrice: Number(d.salePrice),
      })));
    } else if (module === 'delivery') {
      const data = await this.prisma.salesOrder.findMany({
        where: { status: '已签约' },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '订单号', key: 'orderNo', width: 18 },
        { header: '客户', key: 'customerName', width: 12 },
        { header: '车辆信息', key: 'vehicleInfo', width: 20 },
        { header: '销售价(¥)', key: 'salePrice', width: 12 },
        { header: '定金(¥)', key: 'deposit', width: 12 },
        { header: '交车日期', key: 'deliveryDate', width: 12 },
        { header: '创建时间', key: 'createdAt', width: 18 },
      ];
      sheet.addRows(data.map((d: any) => ({
        ...d,
        customerName: d.customer?.name,
        salePrice: Number(d.salePrice),
        deposit: d.deposit != null ? Number(d.deposit) : 0,
        deliveryDate: d.deliveryDate || '待交车',
      })));
    } else if (module === 'beauty') {
      // 美容预约导出
      const data = await this.prisma.beautyAppointment.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '客户姓名', key: 'customerName', width: 12 },
        { header: '服务类型', key: 'serviceType', width: 15 },
        { header: '总金额', key: 'totalAmount', width: 12 },
        { header: '状态', key: 'status', width: 10 },
        { header: '开始时间', key: 'startTime', width: 20 },
        { header: '创建时间', key: 'createdAt', width: 20 },
      ];
      sheet.addRows(data.map((d: any) => ({
        ...d,
        customerName: d.customer?.name,
        totalAmount: Number(d.totalAmount),
      })));
    } else if (module === 'finance') {
      // 财务收款导出
      const data = await this.prisma.paymentRecord.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '支付单号', key: 'paymentNo', width: 20 },
        { header: '客户姓名', key: 'customerName', width: 12 },
        { header: '类型', key: 'type', width: 12 },
        { header: '金额', key: 'amount', width: 12 },
        { header: '支付方式', key: 'paymentMethod', width: 12 },
        { header: '状态', key: 'status', width: 10 },
        { header: '收款时间', key: 'createdAt', width: 20 },
      ];
      sheet.addRows(data.map((d: any) => ({
        ...d,
        customerName: d.customer?.name,
        amount: Number(d.amount),
      })));
    } else if (module === 'inventory_stock') {
      // 库存导出
      const data = await this.prisma.part.findMany({
        where: { status: 1 },
        include: { category: true, stock: true },
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '编码', key: 'code', width: 15 },
        { header: '名称', key: 'name', width: 20 },
        { header: '规格', key: 'spec', width: 12 },
        { header: '分类', key: 'categoryName', width: 12 },
        { header: '单价', key: 'price', width: 10 },
        { header: '库存量', key: 'quantity', width: 10 },
        { header: '安全库存', key: 'safetyStock', width: 10 },
        { header: '库位', key: 'shelfLocation', width: 12 },
      ];
      sheet.addRows(data.map((d: any) => ({
        ...d,
        categoryName: d.category?.name,
        price: Number(d.price),
        quantity: d.stock?.quantity ?? 0,
      })));
    } else if (module === 'beauty_cards') {
      // 会员卡导出
      const data = await this.prisma.memberCard.findMany({
        orderBy: { createdAt: 'desc' },
      });
      sheet.columns = [
        { header: '卡号', key: 'cardNo', width: 18 },
        { header: '名称', key: 'name', width: 15 },
        { header: '等级', key: 'level', width: 8 },
        { header: '折扣', key: 'discount', width: 8 },
        { header: '最低充值', key: 'minRecharge', width: 12 },
        { header: '状态', key: 'status', width: 8 },
      ];
      sheet.addRows(data.map((d: any) => ({
        ...d,
        discount: Number(d.discount),
        minRecharge: Number(d.minRecharge),
        status: d.status === 1 ? '启用' : '禁用',
      })));
    } else if (module === 'report') {
      // 报表汇总：收入、支出、应收、应付
      const [payments, expenses, receivables, payables] = await Promise.all([
        this.prisma.paymentRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
        this.prisma.expenseRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
        this.prisma.receivable.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
        this.prisma.payable.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
      ]);

      sheet.columns = [
        { header: '类型', key: 'type', width: 12 },
        { header: '金额', key: 'amount', width: 12 },
        { header: '描述', key: 'description', width: 30 },
        { header: '状态', key: 'status', width: 10 },
        { header: '日期', key: 'createdAt', width: 20 },
      ];

      const rows: any[] = [];
      for (const p of payments) {
        rows.push({ type: '收入', amount: p.amount, description: p.remark || '收款', status: p.paymentMethod || '-', createdAt: p.createdAt });
      }
      for (const e of expenses) {
        rows.push({ type: '支出', amount: e.amount, description: e.description || e.category || '', status: e.category || '-', createdAt: e.createdAt });
      }
      for (const r of receivables) {
        rows.push({ type: '应收', amount: r.amount, description: r.source || `应收-${r.sourceNo}` || '', status: r.status, createdAt: r.createdAt });
      }
      for (const p of payables) {
        rows.push({ type: '应付', amount: p.amount, description: p.source || `应付-${p.sourceNo}` || '', status: p.status, createdAt: p.createdAt });
      }
      sheet.addRows(rows);
    } else {
      sheet.columns = [
        { header: '项目', key: 'label', width: 20 },
        { header: '金额', key: 'value', width: 15 },
      ];
      if (query.rows) {
        try {
          const parsed = JSON.parse(query.rows);
          if (Array.isArray(parsed)) {
            sheet.addRows(parsed);
          }
        } catch {
          // 忽略无效的 JSON 输入
        }
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${module}_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }
}
