import bcrypt from "bcryptjs";

/**
 * Securely hashes a password using bcrypt
 * @param password The plain text password to hash
 * @returns The hashed password
 */
export function saltAndHashPassword(password: string): string {
  // Generate a salt
  const salt = bcrypt.genSaltSync(10);

  // Hash the password with the salt
  const hash = bcrypt.hashSync(password, salt);

  return hash;
}
