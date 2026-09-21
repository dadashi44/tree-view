/**
 * Проверяет, что всё, на что ссылается package.json, действительно лежит в dist.
 *
 * Зачем: самая частая ошибка при публикации — `main` указывает на файл,
 * которого нет (или `types` ведёт за пределы пакета). Тогда библиотека
 * «ставится», но падает при первом require или не даёт типов.
 *
 * Запуск: npm run check:packaging (после сборки).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packages = ['core', 'vue3', 'vue2', 'nuxt']
const problems = []

/** Достаёт все относительные пути из поля exports любой вложенности. */
function collectPaths(value, found = []) {
  if (typeof value === 'string') {
    if (value.startsWith('.')) found.push(value)
    return found
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) collectPaths(nested, found)
  }
  return found
}

for (const name of packages) {
  const directory = join(root, 'packages', name)
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))

  const targets = new Set([
    manifest.main,
    manifest.module,
    manifest.types,
    ...collectPaths(manifest.exports),
  ].filter(Boolean))

  for (const target of targets) {
    if (!existsSync(join(directory, target))) {
      problems.push(`${manifest.name}: в package.json указан ${target}, но файла нет`)
    }
  }

  // Типы не должны уводить за пределы опубликованных файлов.
  if (manifest.types && existsSync(join(directory, manifest.types))) {
    const declaration = readFileSync(join(directory, manifest.types), 'utf8')
    if (/from '\.\.\//.test(declaration)) {
      problems.push(`${manifest.name}: ${manifest.types} ссылается наружу пакета (..\/)`)
    }
  }
}

if (problems.length > 0) {
  console.error('Проблемы упаковки:\n' + problems.map((line) => `  • ${line}`).join('\n'))
  process.exit(1)
}

console.log(`Упаковка в порядке: проверено пакетов — ${packages.length}`)
