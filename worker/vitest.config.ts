import { defineConfig } from 'vitest/config'

// Plain Node vitest (no @cloudflare/vitest-pool-workers): the modules under test
// (gamification, password, jwt) are pure Web Crypto/JS with no D1/KV/R2 bindings,
// and Node 24+ has native Web Crypto, so workerd simulation isn't required here.
// (vitest-pool-workers also has a known module-resolution bug with spaces in the
// absolute project path, which this project's directory contains.)
export default defineConfig({
  test: {
    environment: 'node',
  },
})
