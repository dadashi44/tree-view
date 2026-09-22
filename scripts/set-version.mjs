/**
 * Ставит одну версию всем пакетам и чинит ссылки между ними.
 *
 * Зачем: пакеты зависят друг от друга (`@bigplay/tree-view` → core,
 * `@bigplay/tree-view-nuxt` → vue3). Если поднять версию только в одном месте,
 * в реестр уедет пакет со ссылкой на несуществующую версию соседа.
 *
 * Запуск: node scripts/set-version.mjs 0.2.0
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packages = ['core', 'vue3', 'vue2', 'nuxt']

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('Укажите версию: node scripts/set-version.mjs 0.2.0')
  process.exit(1)
}

// Имена своих пакетов — только их ссылки и трогаем.
const own = new Set(
  packages.map((name) => JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8')).name),
)

for (const name of packages) {
  const path = join(root, 'packages', name, 'package.json')
  const manifest = JSON.parse(readFileSync(path, 'utf8'))

  manifest.version = version

  for (const field of ['dependencies', 'peerDependencies']) {
    for (const dependency of Object.keys(manifest[field] ?? {})) {
      if (own.has(dependency)) manifest[field][dependency] = `^${version}`
    }
  }

  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`${manifest.name} → ${version}`)
}

console.log('\nДальше: npm install && npm run verify')
