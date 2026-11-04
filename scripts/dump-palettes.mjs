/**
 * 把要新增的四套浅色主题的真实色值 dump 成可直接粘进 src/skins.mjs 的数据。
 *
 * 其中 GitHub Light Gray 读的是本机已装的 VS Code 扩展（hyzeta.vscode-theme-github-light），
 * 其余三套从 npm 的 shiki 主题包取。
 *
 * 用法：node scripts/dump-palettes.mjs
 */
import { readFileSync } from 'node:fs'
import { analyzeTheme, collect, hex, parseJsonc, ratio } from './lib/survey-data.mjs'

const WANTED = ['catppuccin-latte', 'vitesse-light', 'snazzy-light']
const rows = (await collect()).filter((row) => WANTED.includes(row.id))

// 本机扩展里的 "Github Light Theme - Gray"（JSONC，带注释头与尾逗号）
const localPath =
  'C:/Users/Trosky/.vscode/extensions/hyzeta.vscode-theme-github-light-7.14.2/themes/Github-Light-Theme-Gray-color-theme.json'
const localTheme = parseJsonc(readFileSync(localPath, 'utf8'))
rows.push(analyzeTheme(localTheme, { id: 'github-light-gray', name: 'GitHub Light Gray', note: '本机扩展' }))

const keys = ['bg', 'plate', 'ink', 'muted', 'accent', 'onAccent', 'danger', 'success', 'warn', 'accent2']

for (const row of rows) {
  if (row.error) {
    console.log(`## ${row.name} —— 失败：${row.error}`)
    continue
  }
  console.log(`\n## ${row.name} (${row.id})`)
  console.log(
    `正文 ${ratio(row.metrics.body)} · 次级 ${ratio(row.metrics.secondary)} · 强调文字 ${ratio(row.metrics.accentText)} · 强调填充 ${ratio(row.metrics.accentFill)} · 按钮 ${ratio(row.metrics.buttonLabel)}`,
  )
  console.log(`改动量 ${row.total} · 底色彩度 ${row.bgChroma.toFixed(3)} · 平度 ${row.plateDelta.toFixed(2)}`)
  console.log('```js')
  const entries = keys.map((key) => `${key}: '${hex(row.palette[key])}'`).join(', ')
  console.log(entries)
  console.log('```')
  console.log(
    `语法色 keyword=${hex(row.syntax.keyword)} string=${hex(row.syntax.string)} fn=${hex(row.syntax.fn)} number=${hex(row.syntax.number)}`,
  )
}
