import { randomBytes, scryptSync } from "node:crypto"

const password = process.argv.slice(2).join(" ")
if (!password) {
  console.error('Usage: npm run admin:hash -- "your strong password"')
  process.exitCode = 1
} else {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  console.log(`scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`)
}
