const LIVE_SITE_ORIGIN = "https://chat.maximumaiconsulting.com";

export function liveCheckoutUrl(plan: string): string {
  const params = new URLSearchParams({ plan });
  return `${LIVE_SITE_ORIGIN}/checkout?${params.toString()}`;
}

export function openLiveCheckout(plan: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(liveCheckoutUrl(plan));
}

export function shouldUseLiveCheckoutOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.origin !== LIVE_SITE_ORIGIN;
}

export function liveUrlForCurrentPath(): string {
  if (typeof window === "undefined") return LIVE_SITE_ORIGIN;
  return `${LIVE_SITE_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
}