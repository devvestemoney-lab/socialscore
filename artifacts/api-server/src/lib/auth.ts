import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "zambia-credit-platform-secret-key-2024";
const JWT_EXPIRES_IN = "24h";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: { userId: string; email: string; role: string; tenantId?: string | null }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; email: string; role: string; tenantId?: string | null } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string; tenantId?: string | null };
  } catch {
    return null;
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
