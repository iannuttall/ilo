import { execFileSync, spawnSync } from 'node:child_process'

const forbidden = [
  'STRIPE_SECRET_KEY',
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'RESEND_API_KEY',
  'SOCIAL_TOKEN_SECRET',
]

const tracked = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter((file) => file && file !== 'scripts/security-secrets.mjs')

if (tracked.length === 0) process.exit(0)

const result = spawnSync(
  'rg',
  [
    '--line-number',
    '--no-heading',
    '--fixed-strings',
    ...forbidden.flatMap((value) => ['-e', value]),
    ...tracked,
  ],
  {
    encoding: 'utf8',
  },
)

if (result.status === 0 && result.stdout.trim()) {
  process.stderr.write(result.stdout)
  process.exit(1)
}

if (result.status !== 0 && result.status !== 1) {
  process.stderr.write(result.stderr)
  process.exit(result.status ?? 1)
}
