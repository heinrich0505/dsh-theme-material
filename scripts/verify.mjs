/**
 * 验收：token 完整性 + 对比度门槛。
 *
 * 这里不"看颜色顺不顺眼"，只量三件事：
 *   1. 每套皮肤两种外观都推导出完整的 token 表，不多不少；
 *   2. 正文/次级文字/强调色/按钮文字达到声明的 WCAG 下限；
 *   3. 若能找到本机装的外壳主题包，就把对方的实际 token 名单拉出来对一遍，
 *      确认没有漏掉外壳会读、我们不认识的 token。
 *
 * 任一条不过就以非零码退出。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { contrastReport, deriveSkin } from '../src/derive.mjs'
import { SKINS } from '../src/skins.mjs'
import { TOKEN_NAMES } from '../src/tokens.mjs'

const failures = []
const fail = (message) => failures.push(message)

// ---- 1. token 完整性 ----
for (const skin of SKINS) {
  const both = deriveSkin(skin)
  for (const mode of ['light', 'dark']) {
    const table = both[mode]
    const names = Object.keys(table)
    if (names.length !== TOKEN_NAMES.length) {
      fail(`${skin.id}/${mode}: 推导出 ${names.length} 个 token，契约是 ${TOKEN_NAMES.length}`)
    }
    for (const name of TOKEN_NAMES) {
      if (!(name in table)) fail(`${skin.id}/${mode}: 缺 ${name}`)
    }
    for (const [name, value] of Object.entries(table)) {
      if (typeof value !== 'string' || value.trim() === '') {
        fail(`${skin.id}/${mode}: ${name} 的值不是非空字符串`)
      }
    }
  }
}

// ---- 2. 对比度门槛 ----
const FLOORS = [
  ['body', 7, '正文 WCAG AAA'],
  ['secondary', 4.5, '次级文字 WCAG AA'],
  ['accentText', 4.5, '强调色当文字'],
  ['accentFill', 3, '强调色当填充'],
  ['buttonLabel', 4.5, '按钮文字压在填充上'],
]

const rows = []
for (const skin of SKINS) {
  for (const row of contrastReport(skin)) {
    rows.push({ skin, ...row })
    for (const [key, floor, label] of FLOORS) {
      if (row[key] < floor) {
        fail(`${skin.id}/${row.mode}: ${label} ${row[key].toFixed(2)}:1 < ${floor}:1`)
      }
    }
  }
}

// ---- 3. 与外壳实际 token 名单对账（找到才做）----
const candidates = [
  process.env.DSH_UI_THEME_CLIENT,
  process.env.APPDATA
    ? join(process.env.APPDATA, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-client-ui-theme', 'lib', 'client.js')
    : undefined,
].filter(Boolean)

const shellClient = candidates.find((path) => existsSync(path))
let reconciliation = '未找到本机外壳主题包，跳过对账（可用 DSH_UI_THEME_CLIENT 指定路径）'
if (shellClient) {
  const css = readFileSync(shellClient, 'utf8')
  const declared = new Set()
  for (const match of css.matchAll(/(--dsw-(?:alias|specific|menu)-[a-z0-9-]+)\s*:/g)) {
    declared.add(match[1])
  }
  const missing = [...declared].filter((name) => !TOKEN_NAMES.includes(name))
  const extra = TOKEN_NAMES.filter((name) => !declared.has(name))
  reconciliation = `外壳声明 ${declared.size} 个配色 token；我们漏 ${missing.length}、多 ${extra.length}`
  for (const name of missing) fail(`外壳声明但我们没有：${name}`)
  for (const name of extra) fail(`我们有但外壳未声明：${name}`)
}

// ---- 报告 ----
console.log(`\n皮肤 ${SKINS.length} 套 · token 契约 ${TOKEN_NAMES.length} 个\n`)
const head = ['皮肤', '外观', '正文', '次级', '强调文字', '强调填充', '按钮文字', '描边']
console.log(head.join('\t'))
for (const row of rows) {
  console.log(
    [
      row.skin.id,
      row.mode,
      `${row.body.toFixed(2)}:1`,
      `${row.secondary.toFixed(2)}:1`,
      `${row.accentText.toFixed(2)}:1`,
      `${row.accentFill.toFixed(2)}:1`,
      `${row.buttonLabel.toFixed(2)}:1`,
      `${row.border.toFixed(2)}:1`,
    ].join('\t'),
  )
}
console.log(`\n对账：${reconciliation}\n`)

if (failures.length > 0) {
  console.error(`验收未通过（${failures.length} 项）：`)
  for (const message of failures) console.error(`  - ${message}`)
  process.exit(1)
}
console.log('验收通过。')
