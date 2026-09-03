export enum Role {
  PASSENGER = "PASSENGER",
  DRIVER = "DRIVER",
  CONDUCTOR = "CONDUCTOR",
  OPERATOR = "OPERATOR",
  ADMIN = "ADMIN",
}

export enum TransactionType {
  PAYMENT = "PAYMENT",
  TOPUP = "TOPUP",
  RECEIPT = "RECEIPT",
  WITHDRAWAL = "WITHDRAWAL",
  BONUS = "BONUS",
  REFUND = "REFUND",
  CONDUCTOR_PAYOUT = "CONDUCTOR_PAYOUT",
  TRANSFER_OUT = "TRANSFER_OUT",
  TRANSFER_IN = "TRANSFER_IN",
}

export enum TransactionStatus {
  COMPLETED = "COMPLETED",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

export enum WithdrawMethod {
  EXPRESS = "EXPRESS",
  IBAN = "IBAN",
}

export enum VehicleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}
