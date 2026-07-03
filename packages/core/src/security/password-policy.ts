import crypto from "node:crypto";

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  minStrength: number;
  historyCount: number;
  expiryDays: number;
}

const DEFAULT_CONFIG: PasswordPolicyConfig = {
  minLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSymbols: true,
  minStrength: 2,
  historyCount: 5,
  expiryDays: 90,
};

export interface PasswordStrengthResult {
  score: number;
  label: string;
  feedback: string[];
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: PasswordStrengthResult;
}

export class PasswordPolicyEngine {
  private config: PasswordPolicyConfig;

  constructor(config?: Partial<PasswordPolicyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getConfig(): PasswordPolicyConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<PasswordPolicyConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const strength = this.evaluateStrength(password);

    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (this.config.requireSymbols && !/[!@#$%^&*()_\-+=\[\]{}|;:,.<>?~]/.test(password)) {
      errors.push("Password must contain at least one symbol");
    }

    if (strength.score < this.config.minStrength) {
      errors.push("Password is too weak");
    }

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  }

  evaluateStrength(password: string): PasswordStrengthResult {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Mix uppercase and lowercase letters");
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add numbers");
    }

    if (/[!@#$%^&*()_\-+=\[\]{}|;:,.<>?~]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add symbols");
    }

    if (password.length > 20) score += 1;

    const hasRepeats = /(.)\1{2,}/.test(password);
    const hasSequential = this.hasSequentialChars(password);
    if (hasRepeats) {
      score -= 1;
      feedback.push("Avoid repeated characters");
    }
    if (hasSequential) {
      score -= 1;
      feedback.push("Avoid sequential characters");
    }

    score = Math.max(0, Math.min(4, score));

    const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

    return { score, label: labels[score], feedback };
  }

  private hasSequentialChars(password: string): boolean {
    const lower = password.toLowerCase();
    for (let i = 0; i < lower.length - 2; i++) {
      const c1 = lower.charCodeAt(i);
      const c2 = lower.charCodeAt(i + 1);
      const c3 = lower.charCodeAt(i + 2);
      if (c2 === c1 + 1 && c3 === c1 + 2) return true;
      if (c2 === c1 - 1 && c3 === c1 - 2) return true;
    }
    return false;
  }

  hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  isPasswordReused(password: string, history: string[]): boolean {
    const hash = this.hashPassword(password);
    return history.some((h) => h === hash);
  }

  isPasswordExpired(passwordChangedAt: Date | null): boolean {
    if (!passwordChangedAt) return true;
    const diff = Date.now() - passwordChangedAt.getTime();
    return diff > this.config.expiryDays * 24 * 60 * 60 * 1000;
  }
}

export const defaultPasswordPolicy = new PasswordPolicyEngine();
