import * as Sentry from "@sentry/node";

export function initServerObservability() {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1
  });
}

export function captureServerError(error: unknown) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error);
}
