-- CreateTable
CREATE TABLE `sys_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `real_name` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `avatar` VARCHAR(255) NULL,
    `role_id` INTEGER NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_user_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `permissions` JSON NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `gender` TINYINT NULL,
    `birthday` DATETIME(3) NULL,
    `address` VARCHAR(200) NULL,
    `member_card_no` VARCHAR(50) NULL,
    `member_level` TINYINT NULL DEFAULT 0,
    `points` INTEGER NOT NULL DEFAULT 0,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_spent` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `visit_count` INTEGER NOT NULL DEFAULT 0,
    `last_visit_at` DATETIME(3) NULL,
    `tags` VARCHAR(200) NULL,
    `source` VARCHAR(50) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `remark` VARCHAR(500) NULL,
    `images` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_vehicle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `plate_number` VARCHAR(20) NOT NULL,
    `brand` VARCHAR(50) NOT NULL,
    `series` VARCHAR(50) NULL,
    `model` VARCHAR(100) NULL,
    `year` VARCHAR(10) NULL,
    `vin` VARCHAR(50) NULL,
    `engine_no` VARCHAR(50) NULL,
    `color` VARCHAR(20) NULL,
    `mileage` INTEGER NULL DEFAULT 0,
    `purchase_date` DATETIME(3) NULL,
    `insurance_due` DATETIME(3) NULL,
    `inspection_due` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `follow_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `next_follow_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_card` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `card_no` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `level` TINYINT NOT NULL,
    `discount` DECIMAL(3, 2) NOT NULL,
    `min_recharge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `member_card_card_no_key`(`card_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_card_recharge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `part_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `parent_id` INTEGER NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `contact` VARCHAR(50) NULL,
    `phone` VARCHAR(20) NULL,
    `address` VARCHAR(200) NULL,
    `bank_account` VARCHAR(50) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `part` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `spec` VARCHAR(50) NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT '个',
    `category_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `cost` DECIMAL(10, 2) NOT NULL,
    `safety_stock` INTEGER NOT NULL DEFAULT 10,
    `max_stock` INTEGER NOT NULL DEFAULT 100,
    `shelf_location` VARCHAR(50) NULL,
    `images` JSON NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `part_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `part_stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `part_id` INTEGER NOT NULL,
    `warehouse` VARCHAR(50) NOT NULL DEFAULT '默认仓库',
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `locked_qty` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `part_stock_part_id_key`(`part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `part_id` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `before_qty` INTEGER NOT NULL,
    `after_qty` INTEGER NOT NULL,
    `related_no` VARCHAR(50) NULL,
    `operator` VARCHAR(50) NULL,
    `remark` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(50) NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `applicant_id` INTEGER NOT NULL,
    `attachments` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_order_order_no_key`(`order_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_order_id` INTEGER NOT NULL,
    `part_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(50) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `vehicle_id` INTEGER NULL,
    `plate_number` VARCHAR(20) NOT NULL,
    `vehicle_model` VARCHAR(100) NULL,
    `mileage` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `fault_desc` VARCHAR(1000) NULL,
    `check_result` VARCHAR(500) NULL,
    `total_labor_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_part_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `final_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `advisor_id` INTEGER NOT NULL,
    `est_complete_time` DATETIME(3) NULL,
    `actual_complete_time` DATETIME(3) NULL,
    `delivery_method` VARCHAR(20) NULL,
    `images` JSON NULL,
    `check_images` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `repair_order_order_no_key`(`order_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_order_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `repair_order_id` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `labor_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `part_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatch_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `repair_order_id` INTEGER NOT NULL,
    `technician_id` INTEGER NOT NULL,
    `standard_hours` DECIMAL(5, 1) NULL,
    `actual_hours` DECIMAL(5, 1) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'assigned',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_check` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `repair_order_id` INTEGER NOT NULL,
    `checker_id` INTEGER NOT NULL,
    `items_checked` JSON NULL,
    `road_test` VARCHAR(20) NULL,
    `is_passed` TINYINT NOT NULL DEFAULT 1,
    `remark` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `quality_check_repair_order_id_key`(`repair_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `brand` VARCHAR(50) NOT NULL,
    `series` VARCHAR(50) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `year_model` VARCHAR(10) NULL,
    `config` VARCHAR(200) NULL,
    `color` VARCHAR(50) NULL,
    `vin` VARCHAR(50) NULL,
    `guide_price` DECIMAL(12, 2) NOT NULL,
    `sale_price` DECIMAL(12, 2) NOT NULL,
    `min_price` DECIMAL(12, 2) NOT NULL,
    `stock_status` VARCHAR(20) NOT NULL DEFAULT 'in_stock',
    `location` VARCHAR(100) NULL,
    `images` JSON NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_info_vin_key`(`vin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NULL,
    `user_id` INTEGER NOT NULL,
    `source` VARCHAR(50) NULL,
    `intent` VARCHAR(20) NULL,
    `intent_model` VARCHAR(100) NULL,
    `budget` DECIMAL(12, 2) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'new',
    `next_follow_at` DATETIME(3) NULL,
    `remark` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_follow_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `next_follow_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(50) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `vehicle_id` INTEGER NOT NULL,
    `sale_price` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `insurance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `accessories` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `service_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `deposit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `payment_method` VARCHAR(20) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `delivery_date` DATETIME(3) NULL,
    `sales_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sales_order_order_no_key`(`order_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beauty_service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `duration` INTEGER NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beauty_package` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `original_price` DECIMAL(10, 2) NOT NULL,
    `package_price` DECIMAL(10, 2) NOT NULL,
    `items` JSON NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beauty_appointment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `vehicle_id` INTEGER NULL,
    `service_type` VARCHAR(30) NOT NULL,
    `items` JSON NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `assigned_to` INTEGER NULL,
    `start_time` DATETIME(3) NULL,
    `end_time` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_no` VARCHAR(50) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `repair_order_id` INTEGER NULL,
    `sales_order_id` INTEGER NULL,
    `type` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(20) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
    `operator_id` INTEGER NOT NULL,
    `remark` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_record_payment_no_key`(`payment_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receivable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `due_date` DATETIME(3) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `source` VARCHAR(30) NOT NULL,
    `source_no` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplier_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `due_date` DATETIME(3) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `source` VARCHAR(30) NOT NULL,
    `source_no` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(200) NULL,
    `operator_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_no` VARCHAR(50) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `related_no` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'issued',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoice_record_invoice_no_key`(`invoice_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'system',
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `target_type` VARCHAR(30) NULL,
    `target_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_user_id_is_read_idx`(`user_id`, `is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `module` VARCHAR(30) NOT NULL,
    `target_id` INTEGER NULL,
    `target_name` VARCHAR(100) NULL,
    `detail` TEXT NULL,
    `ip` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sys_user` ADD CONSTRAINT `sys_user_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_vehicle` ADD CONSTRAINT `customer_vehicle_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_record` ADD CONSTRAINT `follow_record_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_record` ADD CONSTRAINT `follow_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_card_recharge` ADD CONSTRAINT `member_card_recharge_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `part` ADD CONSTRAINT `part_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `part_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `part` ADD CONSTRAINT `part_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `part_stock` ADD CONSTRAINT `part_stock_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `part`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_record` ADD CONSTRAINT `stock_record_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `part`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_item` ADD CONSTRAINT `purchase_order_item_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_item` ADD CONSTRAINT `purchase_order_item_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `part`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_order` ADD CONSTRAINT `repair_order_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_order` ADD CONSTRAINT `repair_order_advisor_id_fkey` FOREIGN KEY (`advisor_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_order_item` ADD CONSTRAINT `repair_order_item_repair_order_id_fkey` FOREIGN KEY (`repair_order_id`) REFERENCES `repair_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_record` ADD CONSTRAINT `dispatch_record_repair_order_id_fkey` FOREIGN KEY (`repair_order_id`) REFERENCES `repair_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_record` ADD CONSTRAINT `dispatch_record_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_check` ADD CONSTRAINT `quality_check_repair_order_id_fkey` FOREIGN KEY (`repair_order_id`) REFERENCES `repair_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_lead` ADD CONSTRAINT `sales_lead_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_lead` ADD CONSTRAINT `sales_lead_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_follow_record` ADD CONSTRAINT `lead_follow_record_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `sales_lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_follow_record` ADD CONSTRAINT `lead_follow_record_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order` ADD CONSTRAINT `sales_order_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_order` ADD CONSTRAINT `sales_order_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle_info`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beauty_appointment` ADD CONSTRAINT `beauty_appointment_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_record` ADD CONSTRAINT `payment_record_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_record` ADD CONSTRAINT `payment_record_repair_order_id_fkey` FOREIGN KEY (`repair_order_id`) REFERENCES `repair_order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receivable` ADD CONSTRAINT `receivable_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable` ADD CONSTRAINT `payable_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_record` ADD CONSTRAINT `invoice_record_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

