// Intentionally a no-op. The app should never display "test mode" copy in any
// surface a real customer might see — once we publish, everything is live.
// Kept as an exported component so existing imports don't break.
export function PaymentTestModeBanner() {
  return null;
}
