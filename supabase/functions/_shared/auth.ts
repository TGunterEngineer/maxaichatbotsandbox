// Shared auth helpers for edge functions.

export function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Authorizes a server-to-server caller by requiring the bearer token to match
// either the actual SUPABASE_SERVICE_ROLE_KEY or a pre-shared CRON_SECRET.
// Unlike payload-only JWT inspection, this validates the real secret value,
// so forged tokens with a {"role":"service_role"} claim cannot pass.
export function isServiceRole(req: Request): boolean {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return false
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (serviceKey && timingSafeEqual(token, serviceKey)) return true
  if (cronSecret && timingSafeEqual(token, cronSecret)) return true
  return false
}
