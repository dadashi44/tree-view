/**
 * Публикует пакет, если такой версии ещё нет в реестре.
 *
 * Зачем: повторный запуск релизного workflow (перезапуск упавшего шага,
 * заново поставленный тег) утыкается в «You cannot publish over the previously
 * published versions» и красит весь прогон в красный, хотя делать уже нечего.
 * С этой проверкой повтор просто пропускает то, что уже уехало.
 *
 * Запуск: node scripts/publish-if-new.mjs core
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const folder = process.argv[2]

if (!folder) {
  console.error('Укажите папку пакета: node scripts/publish-if-new.mjs core')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(join(root, 'packages', folder, 'package.json'), 'utf8'))
const { name, version } = manifest

/** Версия из реестра или пустая строка, если её там нет. */
function publishedVersion() {
  try {
    return execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    // Пакета нет в реестре вовсе — это первый релиз, публикуем.
    return ''
  }
}

if (publishedVersion() === version) {
  console.log(`${name}@${version} уже в реестре — пропускаем`)
  process.exit(0)
}

console.log(`Публикую ${name}@${version}`)
execFileSync('npm', ['publish', '--workspace', name], { cwd: root, stdio: 'inherit' })
