-- 泰州车行维修厂部综合管理系统 - 数据库初始化脚本
CREATE DATABASE IF NOT EXISTS auto_repair DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE auto_repair;

-- 系统用户表
CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `real_name` VARCHAR(50) NOT NULL COMMENT '真实姓名',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0禁用,1启用',
  `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户';

-- 角色表
CREATE TABLE IF NOT EXISTS `sys_role` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(50) NOT NULL COMMENT '角色编码',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '角色描述',
  `permissions` JSON DEFAULT NULL COMMENT '权限JSON',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0禁用,1启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色';

-- 插入默认角色
INSERT INTO `sys_role` (`name`, `code`, `description`, `permissions`) VALUES
('超级管理员', 'admin', '系统最高权限', '["*"]'),
('店长/经理', 'manager', '查看所有数据和管理权限', '["dashboard","sales","repair","beauty","finance","inventory","customer","report"]'),
('销售顾问', 'sales_consultant', '负责整车销售', '["sales","customer:view"]'),
('服务顾问', 'service_advisor', '负责维修接车和客户服务', '["repair","customer:view"]'),
('维修技师', 'technician', '负责车辆维修', '["repair:view","repair:update"]'),
('配件管理员', 'inventory_keeper', '负责配件库存管理', '["inventory"]'),
('财务人员', 'finance_staff', '负责收银和财务报表', '["finance","report:view"]');

-- 插入默认管理员 (密码: admin123)
INSERT INTO `sys_user` (`username`, `password`, `real_name`, `phone`, `role_id`) VALUES
('admin', '$2b$10$rQq4S5GJqY7kZxMwGN8C8eY0O5K0x7R5XqjZyNhE5U8aBtKdJvX3m', '系统管理员', '13800000000', 1);
