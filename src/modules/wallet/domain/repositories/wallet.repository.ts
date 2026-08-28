import type {
  TransactionStatus,
  TransactionType,
  WithdrawMethod,
} from "../../../../shared/domain/types/enums";

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");

export interface LedgerTransactionRecord {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  status: TransactionStatus;
  reference: string;
  vehiclePlate: string | null;
  createdAt: Date;
}

export interface WalletSnapshot {
  balance: number;
  transactions: LedgerTransactionRecord[];
}

export interface TopUpRequestRecord {
  id: string;
  amount: number;
  entity: string;
  reference: string;
  status: TransactionStatus;
  createdAt: Date;
}

export interface PaymentResultRecord {
  balanceAfter: number;
  transaction: LedgerTransactionRecord;
}

export interface PayTripResultRecord extends PaymentResultRecord {
  driverId: string;
  driverBalance: number;
  receiptReference: string;
}

export interface WalletRepository {
  getSnapshot(userId: string, limit?: number): Promise<WalletSnapshot | null>;
  countTransactions(): Promise<number>;
  createTopUpRequest(
    userId: string,
    input: { amount: number; entity: string; reference: string },
  ): Promise<TopUpRequestRecord>;
  confirmTopUp(userId: string, reference: string): Promise<PaymentResultRecord>;
  payTrip(input: {
    passengerId: string;
    amount: number;
    qrCode?: string;
    vehiclePlate?: string;
    paymentRef: string;
    receiptRef: string;
  }): Promise<PayTripResultRecord>;
  withdraw(input: {
    userId: string;
    amount: number;
    method: WithdrawMethod;
    expressPhone?: string;
    iban?: string;
    bankName?: string;
    reference: string;
    title: string;
  }): Promise<PaymentResultRecord>;
}
