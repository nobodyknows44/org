/**
 * Error monitoring — Sentry integration stub.
 *
 * In production:
 * 1. Install: npm install @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 * 3. Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 *
 * This module provides a fallback when Sentry is not installed.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

class ErrorMonitor {
  private initialized = false;
  private sentry: any = null;

  async init() {
    if (this.initialized || !SENTRY_DSN || typeof window === 'undefined') return;

    try {
      // @ts-ignore - @sentry/nextjs is an optional dependency
      const Sentry = await import(/* webpackIgnore: true */ '@sentry/nextjs');
      Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.05,
        replaysOnErrorSampleRate: 1.0,
      });
      this.sentry = Sentry;
      this.initialized = true;
    } catch {
      console.debug('Sentry not available. Error monitoring disabled.');
    }
  }

  captureException(error: Error, context?: Record<string, unknown>) {
    if (this.initialized && this.sentry) {
      this.sentry.captureException(error, { extra: context });
    } else {
      console.error('[Error Monitor]', error, context);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (this.initialized && this.sentry) {
      this.sentry.captureMessage(message, level);
    } else {
      console.log(`[Error Monitor][${level}]`, message);
    }
  }

  setUser(user: { id: string; email?: string }) {
    if (this.initialized && this.sentry) {
      this.sentry.setUser(user);
    }
  }
}

export const errorMonitor = new ErrorMonitor();
