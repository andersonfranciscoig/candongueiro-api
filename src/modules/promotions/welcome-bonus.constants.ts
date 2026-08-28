export const WELCOME_BONUS_AMOUNT = 1_000;
export const WELCOME_BONUS_PASSENGER_LIMIT = 15;

export type WelcomeBonusResult =
  | { granted: false }
  | {
      granted: true;
      amount: number;
      rank: number;
      balanceAfter: number;
      notificationId: string;
      reference: string;
    };
