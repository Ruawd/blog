import { createHmac } from "node:crypto"

import { getDatabase } from "@/db"

let schemaReady = false
let checks = 0

function ensureSchema() {
  const db = getDatabase()
  if (!schemaReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS request_rate_limits (
        action TEXT NOT NULL,
        actor_hash TEXT NOT NULL,
        window_started INTEGER NOT NULL,
        attempts INTEGER NOT NULL,
        PRIMARY KEY (action, actor_hash)
      );
      CREATE INDEX IF NOT EXISTS request_rate_limits_window_idx
        ON request_rate_limits (window_started);
    `)
    schemaReady = true
  }
  return db
}

function actorHash(action: string, actor: string): string {
  const secret = process.env.SESSION_SECRET || "local-rate-limit-secret"
  return createHmac("sha256", secret).update(`${action}:${actor}`).digest("hex")
}

export function consumeRateLimit(options: {
  action: string
  actor: string
  limit: number
  windowMs: number
}): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const db = ensureSchema()
  const now = Date.now()
  const hash = actorHash(options.action, options.actor)
  const current = db.prepare(`
    SELECT window_started AS windowStarted, attempts
    FROM request_rate_limits WHERE action = ? AND actor_hash = ? LIMIT 1
  `).get(options.action, hash) as { windowStarted: number; attempts: number } | undefined

  let windowStarted = current?.windowStarted || now
  let attempts = current?.attempts || 0
  if (!current || now - windowStarted >= options.windowMs) {
    windowStarted = now
    attempts = 0
  }

  if (attempts >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((options.windowMs - (now - windowStarted)) / 1000)),
      remaining: 0,
    }
  }

  attempts += 1
  db.prepare(`
    INSERT INTO request_rate_limits (action, actor_hash, window_started, attempts)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(action, actor_hash) DO UPDATE SET
      window_started = excluded.window_started,
      attempts = excluded.attempts
  `).run(options.action, hash, windowStarted, attempts)

  checks += 1
  if (checks % 200 === 0) {
    db.prepare("DELETE FROM request_rate_limits WHERE window_started < ?")
      .run(now - 7 * 24 * 60 * 60_000)
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, options.limit - attempts),
  }
}
