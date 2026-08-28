export const OTP_CHALLENGE_REPOSITORY = Symbol("OTP_CHALLENGE_REPOSITORY");

export interface OtpChallengeRepository {
  create(input: {
    email: string;
    userId?: string;
    codeHash: string;
    purpose: string;
    expiresAt: Date;
  }): Promise<void>;

  findValid(input: {
    email: string;
    purpose: string;
    codeHash: string;
  }): Promise<{ id: string } | null>;

  consume(id: string): Promise<void>;
}
