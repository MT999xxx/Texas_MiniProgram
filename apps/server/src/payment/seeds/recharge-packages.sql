-- 插入充值套餐数据
INSERT INTO recharge_packages (id, name, description, price, points, bonus_points, discount_rate, is_active, sort_order, created_at, updated_at) VALUES
('pkg_001', '小试身手', '新手必备积分套餐', 9.90, 100, 10, 0.99, true, 1, NOW(), NOW()),
('pkg_002', '轻松游戏', '适合轻度玩家的积分套餐', 29.90, 300, 50, 0.95, true, 2, NOW(), NOW()),
('pkg_003', '畅快体验', '热门积分套餐，性价比之选', 68.00, 700, 150, 0.90, true, 3, NOW(), NOW()),
('pkg_004', '超值大礼包', '大额充值专享超值优惠', 128.00, 1500, 400, 0.85, true, 4, NOW(), NOW()),
('pkg_005', 'VIP豪华包', '尊贵VIP专属积分套餐', 288.00, 3500, 1000, 0.80, true, 5, NOW(), NOW()),
('pkg_006', '至尊王者包', '顶级积分套餐，豪华享受', 588.00, 7500, 2500, 0.75, true, 6, NOW(), NOW());

-- 更新套餐描述，添加更多详细信息
UPDATE recharge_packages SET description = '入门级积分套餐，适合新用户体验游戏，赠送额外10积分' WHERE id = 'pkg_001';
UPDATE recharge_packages SET description = '精选积分套餐，适合日常游戏娱乐，享受5%额外奖励' WHERE id = 'pkg_002';
UPDATE recharge_packages SET description = '热销积分套餐，游戏体验更畅快，享受10%额外奖励' WHERE id = 'pkg_003';
UPDATE recharge_packages SET description = '超值积分大礼包，大额充值专享15%额外奖励' WHERE id = 'pkg_004';
UPDATE recharge_packages SET description = 'VIP豪华积分套餐，尊享20%额外奖励，专属客服' WHERE id = 'pkg_005';
UPDATE recharge_packages SET description = '至尊王者积分套餐，享受25%额外奖励，专属特权' WHERE id = 'pkg_006';