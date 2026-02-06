// @ts-nocheck - Sentry BrowserTracing type issue
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://ce970e832683f2a35589782817b9edce@o450926477023641.ingest.sentry.io/451082553164800',
  environment:
    process.env.NODE_ENV === 'production' ? 'production' : 'development',
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
  beforeSend(event, hint) {
    if (process.env.NODE_ENV === 'development') {
      if (event.level !== 'error') {
        return null;
      }
    }
    return event;
  },
});
