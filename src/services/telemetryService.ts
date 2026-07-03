import { storage } from '../storage';
const TELEMETRY_OPT_OUT_KEY = 'billdesk_telemetry_opt_out';

class TelemetryService {
  private isInitialized = false;
  private isOptedOut = false;

  constructor() {
    this.isOptedOut = storage.getBoolean(TELEMETRY_OPT_OUT_KEY) ?? false;
  }

  init() {
    if (this.isInitialized) return;
    
    // In production releases:
    // Sentry.init({ dsn: process.env.SENTRY_DSN });
    // PostHog.init(process.env.POSTHOG_API_KEY);
    
    this.isInitialized = true;
    this.logEvent('telemetry_initialized', { timestamp: new Date().toISOString() });
  }

  optOut(optOut: boolean) {
    this.isOptedOut = optOut;
    storage.set(TELEMETRY_OPT_OUT_KEY, optOut);
  }

  logEvent(eventName: string, properties?: Record<string, any>) {
    if (this.isOptedOut) return;
    
    // Console log events in development mode
    if (__DEV__) {
      console.log(`[Telemetry Event] ${eventName}:`, properties);
    }
    
    // In production releases, send to PostHog/Firebase:
    // posthog.capture(eventName, properties);
  }

  logError(error: Error, fatal = false) {
    if (this.isOptedOut) return;

    if (__DEV__) {
      console.error(`[Telemetry Error] ${fatal ? 'FATAL' : 'NON-FATAL'}:`, error);
    }

    // In production releases, send to Sentry/Crashlytics:
    // Sentry.captureException(error, { tags: { fatal: String(fatal) } });
  }

  logPageView(screenName: string) {
    this.logEvent('screen_view', { screenName });
  }
}

export const telemetry = new TelemetryService();
