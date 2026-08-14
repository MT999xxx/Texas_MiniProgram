export const COIN_RECHARGE_PACKAGES = [
  { id: 'coin-500', amount: 500, baseCoins: 500, bonusCoins: 60, coins: 560, bonusPoints: 30000, label: '500元' },
  { id: 'coin-1000', amount: 1000, baseCoins: 1000, bonusCoins: 150, coins: 1150, bonusPoints: 80000, label: '1000元' },
  { id: 'coin-2000', amount: 2000, baseCoins: 2000, bonusCoins: 400, coins: 2400, bonusPoints: 200000, label: '2000元' },
  { id: 'coin-5000', amount: 5000, baseCoins: 5000, bonusCoins: 1000, coins: 6000, bonusPoints: 600000, label: '5000元' },
] as const;

export const WINE_VOUCHER_VALID_DAYS = 15;
export const WINE_VOUCHER_PURCHASE_BONUS_POINTS = 8000;
export const MONTHLY_REBUY_WINE_VOUCHER_BONUS_POINTS = 15000;
export const WEEKLY_REBUY_WINE_VOUCHER_BONUS_POINTS = 10000;
export const DAILY_REBUY_WINE_VOUCHER_BONUS_POINTS = 10000;
export const POINTS_PER_CONSUMED_COIN = 50;

export const WINE_VOUCHER_PACKAGES = [
  {
    id: 'monthly-free-flow',
    name: '月赛畅饮券',
    price: 138,
    voucherCount: 1,
    bonusPoints: WINE_VOUCHER_PURCHASE_BONUS_POINTS,
    validDays: WINE_VOUCHER_VALID_DAYS,
    description: '15天有效，购买赠送8000积分',
  },
  {
    id: 'sng-wine-set',
    name: 'SNG酒券套餐',
    price: 78,
    voucherCount: 1,
    bonusPoints: WINE_VOUCHER_PURCHASE_BONUS_POINTS,
    validDays: WINE_VOUCHER_VALID_DAYS,
    description: '15天有效，购买赠送8000积分',
  },
  {
    id: 'budweiser-duo',
    name: '百威啤酒2瓶',
    price: 99,
    voucherCount: 1,
    bonusPoints: WINE_VOUCHER_PURCHASE_BONUS_POINTS,
    validDays: WINE_VOUCHER_VALID_DAYS,
    description: '15天有效，购买赠送8000积分',
  },
  {
    id: 'cocktail-single',
    name: '鸡尾酒一杯',
    price: 99,
    voucherCount: 1,
    bonusPoints: WINE_VOUCHER_PURCHASE_BONUS_POINTS,
    validDays: WINE_VOUCHER_VALID_DAYS,
    description: '15天有效，购买赠送8000积分',
  },
] as const;

export type CoinRechargePackage = (typeof COIN_RECHARGE_PACKAGES)[number];
export type WineVoucherPackage = (typeof WINE_VOUCHER_PACKAGES)[number];

export function getCoinRechargePackage(amount: number): CoinRechargePackage | null {
  return COIN_RECHARGE_PACKAGES.find((item) => item.amount === Number(amount)) || null;
}

export function getCoinRechargePackageFromCents(amountInCents: number): CoinRechargePackage | null {
  return getCoinRechargePackage(Number(amountInCents) / 100);
}

export function getWineVoucherPackage(packageId: string): WineVoucherPackage | null {
  return WINE_VOUCHER_PACKAGES.find((item) => item.id === packageId) || null;
}

export function getWineVoucherExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + WINE_VOUCHER_VALID_DAYS * 24 * 60 * 60 * 1000);
}

export function getEffectiveWineVoucherBatchExpiresAt(batch: {
  createdAt?: Date | string;
  expiresAt?: Date | string;
}): Date {
  const expiresAt = new Date(batch.expiresAt || 0);
  const createdAt = new Date(batch.createdAt || 0);
  if (Number.isNaN(expiresAt.getTime()) || Number.isNaN(createdAt.getTime())) {
    return expiresAt;
  }

  const requiredExpiresAt = getWineVoucherExpiresAt(createdAt);
  return expiresAt < requiredExpiresAt ? requiredExpiresAt : expiresAt;
}

export function getCoinConsumptionBonusPoints(coins: number): number {
  return Math.floor(Number(coins || 0) * POINTS_PER_CONSUMED_COIN);
}

export type WineVoucherMenuItemBenefits = {
  bonusPoints: number;
  voucherCount: number;
};

export function getWineVoucherMenuItemBenefits(
  item: { name?: string; category?: { name?: string } },
): WineVoucherMenuItemBenefits {
  if (!isWineVoucherMenuItem(item)) {
    return { bonusPoints: 0, voucherCount: 0 };
  }

  const itemName = item.name || '';
  const normalizedName = itemName.toLowerCase();
  const isRebuy = itemName.includes('补码');

  if (itemName.includes('月赛')) {
    return isRebuy
      ? { bonusPoints: MONTHLY_REBUY_WINE_VOUCHER_BONUS_POINTS, voucherCount: 1 }
      : { bonusPoints: 0, voucherCount: 0 };
  }

  if (itemName.includes('周赛')) {
    return isRebuy
      ? { bonusPoints: WEEKLY_REBUY_WINE_VOUCHER_BONUS_POINTS, voucherCount: 1 }
      : { bonusPoints: 0, voucherCount: 0 };
  }

  if (normalizedName.includes('sng')) {
    return { bonusPoints: 0, voucherCount: 0 };
  }

  if (itemName.includes('日常赛') && isRebuy) {
    return { bonusPoints: DAILY_REBUY_WINE_VOUCHER_BONUS_POINTS, voucherCount: 1 };
  }

  return { bonusPoints: WINE_VOUCHER_PURCHASE_BONUS_POINTS, voucherCount: 1 };
}

export function isNoBonusWineVoucherMenuItem(
  item: { name?: string; category?: { name?: string } },
): boolean {
  const benefits = getWineVoucherMenuItemBenefits(item);
  return benefits.bonusPoints === 0 && benefits.voucherCount === 0;
}

export function getWineVoucherMenuItemBonusPoints(item: { name?: string; category?: { name?: string } }): number {
  return getWineVoucherMenuItemBenefits(item).bonusPoints;
}

export function isWineVoucherGrantableMenuItem(item: { name?: string; category?: { name?: string } }): boolean {
  return getWineVoucherMenuItemBenefits(item).voucherCount > 0;
}

export function isWineVoucherMenuItem(item: { name?: string; category?: { name?: string } }): boolean {
  const categoryName = item.category?.name || '';
  const itemName = item.name || '';
  return (
    categoryName.includes('积分加油站') ||
    categoryName.includes('积分商城') ||
    itemName.includes('酒券') ||
    itemName.includes('酒卷') ||
    itemName.includes('畅饮券')
  );
}
