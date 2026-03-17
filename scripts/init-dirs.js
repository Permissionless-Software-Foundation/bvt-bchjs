import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const REQUIRED_DIRS = ['uut', 'private', 'bkup']

for (const dir of REQUIRED_DIRS) {
  mkdirSync(join(process.cwd(), dir), { recursive: true })
}
