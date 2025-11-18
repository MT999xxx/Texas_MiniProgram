import { DataSource } from 'typeorm';
import { databaseConfig } from '../src/config/database.config';

const AppDataSource = new DataSource(databaseConfig as any);

async function seed() {
  await AppDataSource.initialize();

  console.log('🌱 开始初始化种子数据...');

  // 1. 清理现有数据（开发环境）
  console.log('📝 清理现有数据...');
  const queryRunner = AppDataSource.createQueryRunner();

  await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
  await queryRunner.query('TRUNCATE TABLE loyalty_transactions');
  await queryRunner.query('TRUNCATE TABLE order_items');
  await queryRunner.query('TRUNCATE TABLE orders');
  await queryRunner.query('TRUNCATE TABLE reservations');
  await queryRunner.query('TRUNCATE TABLE menu_items');
  await queryRunner.query('TRUNCATE TABLE menu_categories');
  await queryRunner.query('TRUNCATE TABLE members');
  await queryRunner.query('TRUNCATE TABLE membership_levels');
  await queryRunner.query('TRUNCATE TABLE tables');
  await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');

  // 2. 创建会员等级
  console.log('👥 创建会员等级...');
  await queryRunner.query(`
    INSERT INTO membership_levels (id, level, name, min_points, discount, benefits, created_at, updated_at) VALUES
    (UUID(), 1, '普通会员', 0, 0, '基础会员权益', NOW(), NOW()),
    (UUID(), 2, '银卡会员', 500, 5, '95折优惠、生日礼品', NOW(), NOW()),
    (UUID(), 3, '金卡会员', 2000, 10, '9折优惠、优先预约', NOW(), NOW()),
    (UUID(), 4, '白金会员', 5000, 15, '85折优惠、专属活动', NOW(), NOW()),
    (UUID(), 5, '钻石会员', 10000, 20, '8折优惠、贵宾服务', NOW(), NOW())
  `);

  // 3. 创建桌位
  console.log('🎲 创建桌位...');
  await queryRunner.query(`
    INSERT INTO tables (id, name, category, capacity, status, is_active, created_at, updated_at) VALUES
    (UUID(), '主赛桌A1', 'MAIN', 10, 'AVAILABLE', 1, NOW(), NOW()),
    (UUID(), '主赛桌A2', 'MAIN', 10, 'AVAILABLE', 1, NOW(), NOW()),
    (UUID(), '主赛桌B1', 'MAIN', 9, 'RESERVED', 1, NOW(), NOW()),
    (UUID(), '副赛桌C1', 'SIDE', 6, 'AVAILABLE', 1, NOW(), NOW()),
    (UUID(), '副赛桌C2', 'SIDE', 6, 'IN_USE', 1, NOW(), NOW()),
    (UUID(), '副赛桌D1', 'SIDE', 8, 'AVAILABLE', 1, NOW(), NOW()),
    (UUID(), '餐饮区E1', 'DINING', 4, 'AVAILABLE', 1, NOW(), NOW()),
    (UUID(), '餐饮区E2', 'DINING', 4, 'AVAILABLE', 1, NOW(), NOW())
  `);

  // 4. 创建菜单分类
  console.log('📋 创建菜单分类...');
  await queryRunner.query(`
    INSERT INTO menu_categories (id, name, sort, created_at, updated_at) VALUES
    (UUID(), '经典', 1, NOW(), NOW()),
    (UUID(), '无酒精', 2, NOW(), NOW()),
    (UUID(), '啤酒', 3, NOW(), NOW()),
    (UUID(), '小吃', 4, NOW(), NOW()),
    (UUID(), '酒水套餐', 5, NOW(), NOW()),
    (UUID(), '积分商城', 6, NOW(), NOW())
  `);

  // 获取分类ID
  const categories = await queryRunner.query('SELECT id, name FROM menu_categories');
  const categoryMap: Record<string, string> = {};
  categories.forEach((cat: any) => {
    categoryMap[cat.name] = cat.id;
  });

  // 5. 创建菜品
  console.log('🍸 创建菜品...');
  const menuItems = [
    // 经典
    { category: '经典', name: '古典', description: '威士忌|橙皮|樱桃|橙子', price: 68, stock: 50 },
    { category: '经典', name: '金汤力', description: '杜松子|奎宁|姜片|柠檬', price: 68, stock: 50 },
    { category: '经典', name: '自由古巴', description: '朗姆|青柠|可乐', price: 68, stock: 50 },
    { category: '经典', name: '曼哈顿', description: '黑麦威士忌|橙皮|樱桃|橙子', price: 68, stock: 50 },

    // 无酒精
    { category: '无酒精', name: '长岛冰茶', description: '<伏特加|白朗姆|金酒|龙舌兰|橙皮|柠檬汁> 20%vol', price: 68, stock: 50 },
    { category: '无酒精', name: '威士忌酸', description: '19世纪美国酒吧热门，矿工用威士忌混合柠檬汁生姜酒和苦精> 20%vol', price: 68, stock: 30 },

    // 啤酒
    { category: '啤酒', name: '教士', description: '德国进口小麦啤酒', price: 45, stock: 100 },
    { category: '啤酒', name: '1664', description: '法国进口啤酒', price: 38, stock: 100 },

    // 小吃
    { category: '小吃', name: '炸鸡翅', description: '香脆多汁，配蜂蜜芥末酱', price: 38, stock: 50 },
    { category: '小吃', name: '薯条', description: '比利时式炸薯条', price: 28, stock: 50 },
    { category: '小吃', name: '洋葱圈', description: '外酥里嫩', price: 32, stock: 50 },

    // 酒水套餐
    { category: '酒水套餐', name: '双人套餐', description: '2杯鸡尾酒+1份小吃', price: 158, stock: 20 },
    { category: '酒水套餐', name: '聚会套餐', description: '4杯鸡尾酒+2份小吃+1桶啤酒', price: 398, stock: 10 }
  ];

  for (const item of menuItems) {
    await queryRunner.query(`
      INSERT INTO menu_items (id, category_id, name, description, price, stock, status, created_at, updated_at)
      VALUES (UUID(), ?, ?, ?, ?, ?, 'ON_SALE', NOW(), NOW())
    `, [categoryMap[item.category], item.name, item.description, item.price, item.stock]);
  }

  // 6. 创建测试会员
  console.log('👤 创建测试会员...');
  const levelV1 = await queryRunner.query('SELECT id FROM membership_levels WHERE level = 1 LIMIT 1');
  await queryRunner.query(`
    INSERT INTO members (id, level_id, name, phone, points, total_spent, created_at, updated_at)
    VALUES
    (UUID(), ?, '测试用户001', '13800138000', 1280, 5680, NOW(), NOW()),
    (UUID(), ?, '测试用户002', '13800138001', 850, 3200, NOW(), NOW()),
    (UUID(), ?, '测试用户003', '13800138002', 2350, 8900, NOW(), NOW())
  `, [levelV1[0].id, levelV1[0].id, levelV1[0].id]);

  console.log('✅ 种子数据初始化完成！');

  // 显示统计信息
  const stats = await queryRunner.query(`
    SELECT
      (SELECT COUNT(*) FROM tables) as tables_count,
      (SELECT COUNT(*) FROM menu_categories) as categories_count,
      (SELECT COUNT(*) FROM menu_items) as items_count,
      (SELECT COUNT(*) FROM membership_levels) as levels_count,
      (SELECT COUNT(*) FROM members) as members_count
  `);

  console.log('\n📊 数据统计:');
  console.log(`  - 桌位: ${stats[0].tables_count}`);
  console.log(`  - 菜单分类: ${stats[0].categories_count}`);
  console.log(`  - 菜品: ${stats[0].items_count}`);
  console.log(`  - 会员等级: ${stats[0].levels_count}`);
  console.log(`  - 会员: ${stats[0].members_count}`);

  await queryRunner.release();
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ 种子数据初始化失败:', error);
  process.exit(1);
});