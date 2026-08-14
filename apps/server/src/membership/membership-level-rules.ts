export interface MembershipLevelReward {
  points: number;
  coins: number;
  wineVouchers: number;
  monthlyTickets: number;
}

export interface MembershipLevelRule {
  code: string;
  level: number;
  name: string;
  threshold: number;
  reward: MembershipLevelReward;
}

export const MEMBERSHIP_LEVEL_RULES: readonly MembershipLevelRule[] = [
  { code: 'V1', level: 1, name: '尊荣白银', threshold: 0, reward: { points: 0, coins: 0, wineVouchers: 0, monthlyTickets: 0 } },
  { code: 'V2', level: 2, name: '奢华黄金', threshold: 1000, reward: { points: 10000, coins: 0, wineVouchers: 0, monthlyTickets: 0 } },
  { code: 'V3', level: 3, name: '高贵铂金', threshold: 3000, reward: { points: 20000, coins: 0, wineVouchers: 0, monthlyTickets: 0 } },
  { code: 'V4', level: 4, name: '巅峰钻石', threshold: 10000, reward: { points: 30000, coins: 0, wineVouchers: 1, monthlyTickets: 0 } },
  { code: 'V5', level: 5, name: '星耀黑金', threshold: 20000, reward: { points: 40000, coins: 100, wineVouchers: 1, monthlyTickets: 0 } },
  { code: 'V6', level: 6, name: '传奇大师', threshold: 30000, reward: { points: 50000, coins: 100, wineVouchers: 2, monthlyTickets: 0 } },
  { code: 'V7', level: 7, name: '耀金尊客', threshold: 40000, reward: { points: 60000, coins: 100, wineVouchers: 3, monthlyTickets: 1 } },
  { code: 'V8', level: 8, name: '至尊领主', threshold: 50000, reward: { points: 70000, coins: 200, wineVouchers: 5, monthlyTickets: 1 } },
  { code: 'V9', level: 9, name: '典藏尊主', threshold: 60000, reward: { points: 80000, coins: 300, wineVouchers: 6, monthlyTickets: 1 } },
  { code: 'V10', level: 10, name: '最强尊主', threshold: 70000, reward: { points: 100000, coins: 300, wineVouchers: 8, monthlyTickets: 1 } },
] as const;

export function getMembershipLevelRule(totalRechargeAmount: number): MembershipLevelRule {
  const amount = Math.max(0, Number(totalRechargeAmount || 0));
  return [...MEMBERSHIP_LEVEL_RULES]
    .reverse()
    .find((rule) => amount >= rule.threshold) || MEMBERSHIP_LEVEL_RULES[0];
}

export function getMembershipLevelNumber(code?: string | null): number {
  return MEMBERSHIP_LEVEL_RULES.find((rule) => rule.code === code)?.level || 1;
}

export function getMembershipLevelRuleByCode(code?: string | null): MembershipLevelRule {
  const level = getMembershipLevelNumber(code);
  return MEMBERSHIP_LEVEL_RULES.find((rule) => rule.level === level) || MEMBERSHIP_LEVEL_RULES[0];
}

/** 历史/人工 V 等级是最低等级基线，累计充值只能让会员升级，不能将其降级。 */
export function getEffectiveMembershipLevelRule(
  totalRechargeAmount: number,
  storedLevelCode?: string | null,
): MembershipLevelRule {
  const rechargeRule = getMembershipLevelRule(totalRechargeAmount);
  const storedRule = getMembershipLevelRuleByCode(storedLevelCode);
  return storedRule.level >= rechargeRule.level ? storedRule : rechargeRule;
}

export function getStoredMembershipLevelRule(code?: string | null): MembershipLevelRule | null {
  return MEMBERSHIP_LEVEL_RULES.find((rule) => rule.code === code) || null;
}

export function getMembershipRewardBaselineLevel(code?: string | null): number {
  // VP is a historical special level outside the V1-V10 recharge ladder.
  if (code === 'VP') return MEMBERSHIP_LEVEL_RULES.length;
  return getMembershipLevelNumber(code);
}

export function formatMembershipBenefits(rule: MembershipLevelRule): string {
  const parts: string[] = [];
  if (rule.reward.points) parts.push(`${rule.reward.points}积分`);
  if (rule.reward.coins) parts.push(`${rule.reward.coins}金币`);
  if (rule.reward.wineVouchers) parts.push(`${rule.reward.wineVouchers}张酒券`);
  if (rule.reward.monthlyTickets) parts.push(`${rule.reward.monthlyTickets}张月赛门票`);
  return parts.length ? `升级赠送${parts.join('、')}` : '暂无升级奖励';
}
