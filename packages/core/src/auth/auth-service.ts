import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@nodepress/db";
import { CapabilityService } from "./capability-service.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  private prisma: PrismaClient;
  private capabilities: CapabilityService;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.capabilities = new CapabilityService();

    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!secret || secret === "nodepress-secret") {
      throw new Error(
        "JWT_SECRET environment variable must be set and must not be the default value"
      );
    }
    if (!refreshSecret || refreshSecret === "nodepress-refresh-secret") {
      throw new Error(
        "JWT_REFRESH_SECRET environment variable must be set and must not be the default value"
      );
    }
    this.jwtSecret = secret;
    this.jwtRefreshSecret = refreshSecret;
  }

  /**
   * Authenticate a user with email and password.
   */
  async login(input: LoginInput): Promise<{ user: TokenPayload; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password.");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password.");
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user: payload,
      tokens: this.generateTokens(payload),
    };
  }

  /**
   * Register a new user.
   */
  async register(input: RegisterInput): Promise<{ user: TokenPayload; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new Error("A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: "SUBSCRIBER",
      },
    });

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user: payload,
      tokens: this.generateTokens(payload),
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as TokenPayload;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    return this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Verify an access token and return its payload.
   */
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  /**
   * Generate access and refresh token pair.
   */
  private generateTokens(payload: TokenPayload): AuthTokens {
    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN ?? "900", 10);

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn,
      issuer: process.env.JWT_ISSUER ?? "nodepress",
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: "7d",
      issuer: process.env.JWT_ISSUER ?? "nodepress",
    });

    return { token, refreshToken, expiresIn };
  }

  getCapabilityService(): CapabilityService {
    return this.capabilities;
  }
}
