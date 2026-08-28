export const OTP_SENDER = Symbol("OTP_SENDER");

export interface OtpSenderPort {
  send(email: string, code: string, purpose: string): Promise<void>;
}
