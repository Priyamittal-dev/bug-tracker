type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  event?: string;
  errorCode?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "sessiontoken",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "privatekey",
  "pan",
  "cvc",
  "cvv",
  "accountnumber",
  "routingnumber",
  "iban",
]);

function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

class StructuredLogger {
  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(context ? sanitize(context) : {}),
    };
    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatLog("info", message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog("warn", message, context));
  }

  error(message: string, context?: LogContext) {
    console.error(this.formatLog("error", message, context));
  }
}

export const logger = new StructuredLogger();
