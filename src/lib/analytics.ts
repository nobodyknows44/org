/**
 * Analytics service — PostHog integration stub.
 *
 * In production, set NEXT_PUBLIC_POSTHOG_KEY in .env.local
 * and install posthog-js: npm install posthog-js
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
}

class Analytics {
  private initialized = false;
  private posthog: any = null;

  async init() {
    if (this.initialized || !POSTHOG_KEY || typeof window === 'undefined') return;

    try {
      // @ts-ignore - posthog-js is an optional dependency
      const posthog = (await import(/* webpackIgnore: true */ 'posthog-js')).default;
      posthog.init(POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
      });
      this.posthog = posthog;
      this.initialized = true;
    } catch {
      // PostHog not installed — analytics disabled
      console.debug('PostHog not available. Analytics disabled.');
    }
  }

  track(event: string, properties?: Record<string, unknown>) {
    if (!this.initialized || !this.posthog) return;
    this.posthog.capture(event, properties);
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    if (!this.initialized || !this.posthog) return;
    this.posthog.identify(userId, traits);
  }

  reset() {
    if (!this.initialized || !this.posthog) return;
    this.posthog.reset();
  }
}

// Singleton
export const analytics = new Analytics();

// Predefined events matching PRD Section 13
export const AnalyticsEvents = {
  DIAGRAM_CREATED: 'diagram_created',
  NODES_IMPORTED: 'nodes_imported',
  PDF_EXPORTED: 'pdf_exported',
  LAYOUT_APPLIED: 'layout_applied',
  COLLABORATION_SESSION_STARTED: 'collaboration_session_started',
  VERSION_RESTORED: 'version_restored',
  SHARE_LINK_CREATED: 'share_link_created',
  NODE_CREATED: 'node_created',
  EDGE_CREATED: 'edge_created',
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
} as const;
