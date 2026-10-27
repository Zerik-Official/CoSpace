import bcrypt from "bcryptjs";

/**
 * Hashes and compares passwords with bcrypt so no plain credential is ever
 * persisted or logged.
 */
export class PasswordHasher {
  /**
   * @param cost - bcrypt cost factor, higher values are slower but stronger.
   */
  constructor(private readonly cost: number = 10) {}

  /**
   * Derives a bcrypt hash from a plain password.
   *
   * @param plainPassword - Password typed by the user.
   * @returns The salted bcrypt hash.
   */
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.cost);
  }

  /**
   * Compares a plain password with a stored hash in constant time.
   *
   * @param plainPassword - Password typed by the user.
   * @param passwordHash - Hash stored in the database.
   * @returns True when the password matches the hash.
   */
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
