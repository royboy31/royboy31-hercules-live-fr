// GA4 lead tracking.
// Pushed only once /api/contact has confirmed the submission, never on click,
// so the counts match the forms actually delivered.
// Spec: PLANS/HERCULES_TRACKING_EVENT_SPEC_2026_09_01.md §2

export type LeadType = 'contact' | 'express_delivery';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const pushed = new Set<LeadType>();

export function pushGenerateLead(leadType: LeadType): void {
  if (typeof window === 'undefined' || pushed.has(leadType)) return;
  pushed.add(leadType);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'generate_lead', lead_type: leadType });
}
