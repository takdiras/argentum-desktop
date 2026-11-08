// Cross-platform launcher for the package.json scripts that need BACKEND_URL.
//
//   bun scripts/desktop.mjs web dev|build     Vite for the vendored web client, with
//                                             BACKEND_URL passed on as VITE_BACKEND_URL
//   bun scripts/desktop.mjs tauri dev|build   `tauri dev|build`, BACKEND_URL defaulting to prod
//
// This exists because `VAR=value command` is shell syntax that Windows cmd.exe, which `npm run`
// uses there (including for tauri's beforeBuildCommand), does not understand. Setting the
// variable here works the same everywhere.

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const webClient = join(root, 'vendor', 'argentum-engine', 'web-client')
const DEFAULT_BACKEND_URL = 'https://magic.wingedsheep.com'

const [target, mode] = process.argv.slice(2)

const commands = {
  web: {
    // An unset BACKEND_URL stays unset: that is the same-origin build, as upstream does it.
    dev: ['x', '--bun', 'vite', '--host', '127.0.0.1', '--port', '1420', '--strictPort'],
    build: ['x', '--bun', 'vite', 'build'],
  },
  tauri: {
    dev: ['run', 'tauri', 'dev'],
    build: ['run', 'tauri', 'build'],
  },
}

const args = commands[target]?.[mode]
if (!args) {
  console.error('usage: desktop.mjs <web|tauri> <dev|build>')
  process.exit(2)
}

const env = { ...process.env }
if (target === 'tauri') {
  env.BACKEND_URL ||= DEFAULT_BACKEND_URL
} else if (env.BACKEND_URL !== undefined) {
  env.VITE_BACKEND_URL = env.BACKEND_URL
} else {
  delete env.VITE_BACKEND_URL
}

// process.execPath is bun itself, so nothing is looked up on PATH and no shell is involved.
const result = spawnSync(process.execPath, args, {
  cwd: target === 'web' ? webClient : root,
  env,
  stdio: 'inherit',
})
if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}
process.exit(result.status ?? 1)
