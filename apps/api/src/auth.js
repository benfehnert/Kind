import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_EXPIRY = "7d";
const REFRESH_TOKEN_BYTES = 48;

function base64Url(buffer) {
  return buffer.toString("base64url");
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${base64Url(salt)}:${base64Url(hash)}`;
}

export function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(":")) {
    return false;
  }
  const [saltText, hashText] = passwordHash.split(":");
  const salt = Buffer.from(saltText, "base64url");
  const storedHash = Buffer.from(hashText, "base64url");
  const computedHash = crypto.scryptSync(password, salt, 64);
  if (storedHash.length !== computedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(storedHash, computedHash);
}

export function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing");
  }
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing");
  }
  return jwt.verify(token, secret);
}

export function createRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
