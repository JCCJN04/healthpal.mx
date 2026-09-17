import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return null
  }
}

// Argument passed explicitly (e.g. "staging", "main") or inferred from git branch
const targetBranch = process.argv[2] || getGitBranch()

let sourceEnv = null
let envLabel = ''

if (targetBranch === 'staging') {
  sourceEnv = '.env.staging'
  envLabel = 'STAGING / PRE-PROD'
} else if (
  targetBranch === 'main' ||
  targetBranch === 'master' ||
  targetBranch === 'prod' ||
  targetBranch === 'production'
) {
  sourceEnv = '.env.production'
  envLabel = 'PRODUCCIÓN'
}

// If we are on a feature branch, don't automatically overwrite unless an explicit argument was given
if (!sourceEnv) {
  process.exit(0)
}

const sourcePath = path.join(ROOT, sourceEnv)
const destPath = path.join(ROOT, '.env')

if (fs.existsSync(sourcePath)) {
  fs.copyFileSync(sourcePath, destPath)
  console.log(
    `\x1b[32m✔ [ENV Switcher]\x1b[0m Rama: \x1b[36m${targetBranch}\x1b[0m -> Activado entorno \x1b[33m${envLabel}\x1b[0m (${sourceEnv} -> .env)`
  )
} else {
  console.log(
    `\x1b[33m⚠ [ENV Switcher]\x1b[0m Rama: \x1b[36m${targetBranch}\x1b[0m detectada, pero aún no existe el archivo \x1b[31m${sourceEnv}\x1b[0m.`
  )
  console.log(
    `   Crea el archivo ${sourceEnv} con las credenciales de ${envLabel} para que se sincronice automáticamente.`
  )
}
