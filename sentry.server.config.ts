import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://ce970e832683f2a35589782817b9edce@o450926477023641.ingest.sentry.io/451082553164800',
  environment:
    process.env.NODE_ENV === 'production' ? 'production' : 'development',
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  // Note: Some integrations may not be available in server-side config
  integrations: [],
  beforeSend(event, hint) {
    // Don't send certain errors to Sentry
    if (process.env.NODE_ENV === 'development') {
      if (event.level !== 'error') {
        return null;
      }
    }

    event.release = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
    if (!event.tags) {
      event.tags = { env: process.env.NODE_ENV || 'unknown' };
    } else if (Array.isArray(event.tags)) {
      (event.tags as string[]).push(`env:${process.env.NODE_ENV}`);
    } else {
      event.tags.env = process.env.NODE_ENV || 'unknown';
    }
    return event;
  },
});

export { Sentry };
