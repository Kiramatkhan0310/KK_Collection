import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { INITIAL_PROMOTIONS, SEEDED_PRODUCTS } from '../data/catalogData.ts';
import { InventoryEvent, Order, Product, Promotion, UserProfile } from '../types/index.ts';

export interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
}

export interface StoredReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  gateway: 'safepay_pakistan' | 'jazzcash' | 'easypaisa' | 'payfast';
  transactionReference: string;
  status: 'initiated' | 'completed' | 'failed' | 'signature_mismatch';
  signature: string;
  payerDetails?: {
    cardBrand?: string;
    last4?: string;
    accountNumber?: string;
  };
  createdAt: string;
  verifiedAt?: string;
}

export interface CourierTrackingCheckpoint {
  timestamp: string;
  status: string;
  location: string;
  remarks: string;
}

export interface CourierConsignment {
  consignmentNumber: string;
  courierName: 'TCS Express' | 'Leopards Courier' | 'Trax Logistics';
  orderId: string;
  orderNumber: string;
  destinationCity: string;
  destinationAddress: string;
  recipientName: string;
  recipientPhone: string;
  codAmount: number;
  weightKg: number;
  createdAt: string;
  currentStatus: 'booked' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned';
  checkpoints: CourierTrackingCheckpoint[];
}

export interface DatabaseSchema {
  products: Product[];
  orders: Order[];
  promotions: Promotion[];
  users: StoredUser[];
  inventoryEvents: InventoryEvent[];
  reviews: StoredReview[];
  payments: PaymentTransaction[];
  consignments: CourierConsignment[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

let isLocked = false;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
  const expected = Buffer.from(expectedHash, 'hex');
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters.`);
  }
  return value;
}

export const JWT_SECRET = requireSecret('JWT_SECRET');
export const PAYMENT_GATEWAY_SECRET = requireSecret('PAYMENT_GATEWAY_SECRET');

export function createAuthToken(
  user: { uid: string; email: string; role: 'customer' | 'admin'; displayName: string },
  expiresInSeconds: number = 14 * 24 * 60 * 60
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const iat = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ ...user, exp, iat })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyAuthToken(token: string): {
  uid: string;
  email: string;
  role: 'customer' | 'admin';
  displayName: string;
  exp?: number;
  iat?: number;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.initialize();
  }

  private initialize(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      } catch (err) {
        console.error('Failed to parse database.json, initializing a fresh database.', err);
      }
    }

    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (Boolean(initialAdminEmail) !== Boolean(initialAdminPassword)) {
      throw new Error('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must both be configured.');
    }

    const users: StoredUser[] = [];
    if (initialAdminEmail && initialAdminPassword) {
      if (initialAdminPassword.length < 12) {
        throw new Error('INITIAL_ADMIN_PASSWORD must contain at least 12 characters.');
      }

      const { salt, hash } = hashPassword(initialAdminPassword);
      const now = new Date().toISOString();
      users.push({
        uid: `usr-admin-${crypto.randomUUID()}`,
        email: initialAdminEmail,
        displayName: 'Store Administrator',
        role: 'admin',
        wishlist: [],
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: now,
        updatedAt: now
      });
    }

    const initialDb: DatabaseSchema = {
      products: SEEDED_PRODUCTS,
      orders: [],
      promotions: INITIAL_PROMOTIONS,
      users,
      inventoryEvents: [],
      reviews: [],
      payments: [],
      consignments: []
    };

    this.save(initialDb);
    return initialDb;
  }

  private save(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write database file', err);
    }
  }

  public async withLock<T>(fn: (db: DatabaseSchema) => Promise<T> | T): Promise<T> {
    while (isLocked) {
      await wait(10);
    }
    isLocked = true;
    try {
      const result = await fn(this.data);
      this.save(this.data);
      return result;
    } finally {
      isLocked = false;
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public resetCatalog(): Product[] {
    this.data.products = SEEDED_PRODUCTS;
    this.save(this.data);
    return this.data.products;
  }
}

export const db = new Database();
