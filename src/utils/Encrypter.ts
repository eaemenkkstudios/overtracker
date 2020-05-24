import crypto from 'crypto';

export interface Hash {
  salt: string;
  hash: string;
}

class Encrypter {
  /**
   * Generates a random number within the given range
   * @param min The minimum value the random number can be
   * @param max The maximum value the random number can be
   * @returns A generated number
   */
  public randomNumber(min: number, max: number): number {
    return Math.ceil(Math.random() * (max - min) + min);
  }

  /**
   * Generates a random string of the given length
   * @param length The length of the string
   * @returns The generated string
   */
  public randomString(length: number): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Generates a random hash
   * @param password The password to be hashed
   * @param salt Random string generated for the password
   * @returns The random hash
   */
  public sha256(password: string, salt: string): string {
    const hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('hex');
  }

  /**
   * Generates a salt string to the password and uses it
   * to create a random hash for the given password
   * @param password The password to be hashed
   * @returns An object containing the generated salt and
   * generated hash for the password
   */
  public hashPassword(password: string): Hash {
    const salt = this.randomString(16);
    return {
      salt,
      hash: this.sha256(password, salt),
    };
  }
}

export default new Encrypter();
