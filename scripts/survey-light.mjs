/**
 * 浅色主题考察：把候选主题的真实色值灌进本包的推导引擎，看它们扛不扛得住验收门槛。
 *
 * 只读分析，不改包里的任何皮肤。
 *
 * 数据来源：npm 上 @shikijs/themes 的官方 TextMate 转换包（VS Code 主题的忠实转换），
 * 从 unpkg 拉取后在本地解析，缓存到 .survey-cache/。
 *
 * 用法：node scripts/survey-light.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrast, parse } from '../src/color.mjs'
import { deriveTokens } from '../src/derive.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, '.survey-cache')
if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })

const VERSION = '3.0.0'

/** 候选：shiki 主题 id + 展示名 + 一句话印象 */
const CANDIDATES = [
  { id: 'material-theme-lighter', name: 'Material Lighter', note: '本包浅色基线（Material 唯一浅色）' },
  { id: 'light-plus', name: 'Light+ (VS Code 默认)', note: '行业默认参照，几乎人人认得' },
  { id: 'github-light', name: 'GitHub Light', note: 'Primer 体系，克制、中性' },
  { id: 'github-light-high-contrast', name: 'GitHub Light HC', note: '同一套设计的高对比版' },
  { id: 'one-light', name: 'One Light (Atom)', note: '经典编辑器浅色，蓝紫强调' },
  { id: 'min-light', name: 'Min Light', note: '几乎单色，靠灰阶分层' },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', note: '柔和马卡龙色，近年流行' },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', note: '暖玫瑰底，文艺向' },
  { id: 'solarized-light', name: 'Solarized Light', note: '低对比经典，米黄底' },
  { id: 'kanagawa-lotus', name: 'Kanagawa Lotus', note: '日式水墨感，暖米底' },
  { id: 'snazzy-light', name: 'Snazzy Light', note: '高饱和强调色，活泼' },
  { id: 'vitesse-light', name: 'Vitesse Light', note: '极简，彩度很低' },
  { id: 'everforest-light', name: 'Everforest Light', note: '低对比暖绿，护眼向' },
]

const fetchTheme = async (id) => {
  const cached = join(cacheDir, `${id}.mjs`)
  if (existsSync(cached)) return readFileSync(cached, 'utf8')
  const url = `https://unpkg.com/@shikijs/themes@${VERSION}/dist/${id}.mjs`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${id}`)
  const text = await response.text()
  writeFileSync(cached, text, 'utf8')
  return text
}

/** 从 `export default Object.freeze(JSON.parse("<escaped json>"))` 里取出对象。 */
const parseTheme = (source) => {
  const match = /JSON\.parse\(\s*("(?:[^"\\]|\\.)*")\s*\)/s.exec(source)
  if (!match) throw new Error('没找到 JSON.parse 载荷')
  return JSON.parse(JSON.parse(match[1]))
}

/** 从 tokenColors 里按 scope 找颜色。 */
const scopeColor = (theme, ...scopes) => {
  for (const scope of scopes) {
    for (const rule of theme.tokenColors ?? []) {
      const list = Array.isArray(rule.scope) ? rule.scope : String(rule.scope ?? '').split(',')
      const hit = list.some((item) => String(item).trim().startsWith(scope))
      if (hit && rule.settings?.foreground) return rule.settings.foreground
    }
  }
  return null
}

/** 相对亮度差 / 色相距离这类"平不平"的粗略度量。 */
const chroma = (hex) => {
  const { r, g, b } = parse(hex)
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255
}

const hue = (hex) => {
  const { r, g, b } = parse(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return Math.round((h * 60 + 360) % 360)
}

/** 把一份 VS Code 主题映射成本包的 10 个输入色。 */
const toPalette = (theme) => {
  const colors = theme.colors ?? {}
  const bg = colors['editor.background']
  const ink = colors['editor.foreground']
  if (!bg || !ink) return null

  // plate：优先输入框（Material 的"高出一档的面"），退回侧栏
  const plate = colors['input.background'] ?? colors['sideBar.background'] ?? bg
  // muted：注释色，退回行号
  const muted =
    scopeColor(theme, 'comment') ??
    colors['editorLineNumber.activeForeground'] ??
    colors['sideBar.foreground'] ??
    ink
  // accent：主题真正拿来做"选中/链接/进度"的那个色
  const accent =
    colors['progressBar.background'] ??
    colors['textLink.foreground'] ??
    colors['activityBarBadge.background'] ??
    scopeColor(theme, 'entity.name.function') ??
    ink
  const danger = colors['terminal.ansiRed'] ?? scopeColor(theme, 'invalid') ?? '#E53935'
  const success = colors['terminal.ansiGreen'] ?? scopeColor(theme, 'string') ?? '#91B859'
  const warn = colors['terminal.ansiYellow'] ?? scopeColor(theme, 'constant.numeric') ?? '#E2931D'
  const accent2 = colors['terminal.ansiMagenta'] ?? colors['terminal.ansiBlue'] ?? accent

  return { bg, plate, ink, muted, accent, onAccent: '#FFFFFF', danger, success, warn, accent2 }
}

const FLOORS = [
  ['body', 7, '正文'],
  ['secondary', 4.5, '次级'],
  ['accentText', 4.5, '强调文字'],
  ['accentFill', 3, '强调填充'],
  ['buttonLabel', 4.5, '按钮文字'],
]

const rows = []
for (const candidate of CANDIDATES) {
  try {
    const theme = parseTheme(await fetchTheme(candidate.id))
    const palette = toPalette(theme)
    if (palette === null) {
      rows.push({ ...candidate, error: '缺 editor.background / foreground' })
      continue
    }
    const tokens = deriveTokens(palette, { dark: false, signature: 'material' })
    const m = {
      body: contrast(tokens['--dsw-alias-label-primary'], palette.bg),
      secondary: contrast(tokens['--dsw-alias-label-secondary'], palette.bg),
      accentText: contrast(tokens['--dsw-alias-state-business-primary'], palette.bg),
      accentFill: contrast(tokens['--dsw-alias-button-primary-fill'], palette.bg),
      buttonLabel: contrast(tokens['--dsw-alias-label-primary-foreground'], tokens['--dsw-alias-button-primary-fill']),
    }
    const failed = FLOORS.filter(([key, floor]) => m[key] < floor).map(([key]) => key)
    rows.push({
      ...candidate,
      palette,
      tokens,
      metrics: m,
      failed,
      // 原样对比度（不经过硬化）：看这个主题本身是不是"低对比取向"
      rawBody: contrast(palette.ink, palette.bg),
      rawSecondary: contrast(palette.muted, palette.bg),
      rawAccent: contrast(palette.accent, palette.bg),
      bgChroma: chroma(palette.bg),
      bgHue: hue(palette.bg),
      plateDelta: contrast(palette.plate, palette.bg),
    })
  } catch (error) {
    rows.push({ ...candidate, error: error.message })
  }
}

const fmt = (n) => (n === undefined ? '—' : `${n.toFixed(2)}:1`)
const hex = (value) => (value ? value.toUpperCase().slice(0, 7) : '—')

console.log('\n## 原始底色（不经硬化，看主题本来有多淡）\n')
console.log('| 主题 | 底色 | 正文 | 注释 | 强调 | 原本正文对比 | 原本次级对比 | 底色彩度 |')
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
for (const row of rows) {
  if (row.error) {
    console.log(`| ${row.name} | 取色失败：${row.error} | | | | | | |`)
    continue
  }
  console.log(
    `| ${row.name} | \`${hex(row.palette.bg)}\` | \`${hex(row.palette.ink)}\` | \`${hex(row.palette.muted)}\` | \`${hex(row.palette.accent)}\` | ${fmt(row.rawBody)} | ${fmt(row.rawSecondary)} | ${row.bgChroma.toFixed(3)} |`,
  )
}

console.log('\n## 灌进本包引擎后（经对比度硬化）\n')
console.log('| 主题 | 次级(原→硬化) | 链接(原→硬化) | 主按钮填充 | 正文 | 判定 | 平度 |')
console.log('| --- | --- | --- | --- | --- | --- | --- |')
for (const row of rows) {
  if (row.error) continue
  const tokens = row.tokens
  console.log(
    `| ${row.name} | \`${hex(row.palette.muted)}\` → \`${hex(tokens['--dsw-alias-label-secondary'])}\` | \`${hex(row.palette.accent)}\` → \`${hex(tokens['--dsw-alias-state-business-primary'])}\` | \`${hex(tokens['--dsw-alias-button-primary-fill'])}\` | ${fmt(row.metrics.body)} | ${row.failed.length === 0 ? '✓ 全过' : row.failed.join('、')} | ${row.plateDelta.toFixed(2)} |`,
  )
}

console.log('\n门槛：正文 ≥7:1，次级 ≥4.5:1，强调文字 ≥4.5:1，强调填充 ≥3:1，按钮文字 ≥4.5:1')
console.log('平度 = plate 与 bg 的对比度，越接近 1 越"平"（Material 的取向）')

// ---- 改动量：引擎把这个主题"掰"了多少 ----
const rgbDistance = (a, b) => {
  const x = parse(a)
  const y = parse(b)
  return Math.round(Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b))
}

console.log('\n## 引擎改动量（越大说明原主题性格被改得越多）\n')
console.log('| 主题 | 次级位移 | 强调位移 | 综合 | 评价 |')
console.log('| --- | --- | --- | --- | --- |')
const scored = rows
  .filter((row) => !row.error)
  .map((row) => {
    const secondaryShift = rgbDistance(row.palette.muted, row.tokens['--dsw-alias-label-secondary'])
    const accentShift = rgbDistance(row.palette.accent, row.tokens['--dsw-alias-state-business-primary'])
    return { ...row, secondaryShift, accentShift, total: secondaryShift + accentShift }
  })
  .sort((a, b) => a.total - b.total)

for (const row of scored) {
  const verdict = row.total <= 40 ? '几乎原样' : row.total <= 110 ? '轻改' : row.total <= 200 ? '中改' : '改动很大'
  console.log(
    `| ${row.name} | ${row.secondaryShift} | ${row.accentShift} | ${row.total} | ${verdict} |`,
  )
}

// ---- 生成可视化对比页 ----
const tokenOf = (row, name) => row.tokens[name]
const cards = scored
  .map((row) => {
    const t = (name) => tokenOf(row, name)
    const linkRatio = contrast(t('--dsw-alias-link'), row.palette.bg).toFixed(2)
    return `
  <section class="card">
    <header>
      <h2>${row.name}</h2>
      <p>${row.note}</p>
    </header>
    <div class="chips">
      <span class="chip" style="background:${row.palette.bg}">底<br>${hex(row.palette.bg)}</span>
      <span class="chip" style="background:${row.palette.plate};color:${t('--dsw-alias-label-primary')}">面<br>${hex(row.palette.plate)}</span>
      <span class="chip" style="background:${row.palette.ink}">正文<br>${hex(row.palette.ink)}</span>
      <span class="chip" style="background:${row.palette.muted}">注释<br>${hex(row.palette.muted)}</span>
      <span class="chip" style="background:${row.palette.accent}">强调<br>${hex(row.palette.accent)}</span>
    </div>
    <div class="mock" style="background:${row.palette.bg};color:${t('--dsw-alias-label-primary')};border-color:${t('--dsw-alias-border-l2')}">
      <div class="bubble" style="background:${t('--dsw-specific-bubble')};color:${t('--dsw-alias-label-primary')}">
        这个气泡用的是 label-primary / bubble 两个 token
      </div>
      <div class="bubble" style="background:${t('--dsw-specific-input-major')};color:${t('--dsw-alias-label-secondary')};border:1px solid ${t('--dsw-alias-border-l2')}">
        次级文字应该在这个亮度（${t('--dsw-alias-label-secondary')}）
      </div>
      <div class="code" style="background:${t('--dsw-alias-markdown-code-block')};color:${t('--dsw-alias-label-primary')}">
        <code>const light = '${row.id}'</code>
      </div>
      <div class="row">
        <a style="color:${t('--dsw-alias-link')}">链接 ${linkRatio}:1</a>
        <button style="background:${t('--dsw-alias-button-primary-fill')};color:${t('--dsw-alias-label-primary-foreground')}">主按钮</button>
        <span class="badge" style="background:${t('--dsw-alias-state-success-tertiary')};color:${t('--dsw-alias-state-success-primary')}">成功</span>
        <span class="badge" style="background:${t('--dsw-alias-state-error-secondary')};color:${t('--dsw-alias-state-error-primary')}">错误</span>
        <span class="badge" style="background:${t('--dsw-alias-state-warn-tertiary')};color:${t('--dsw-alias-state-warn-primary')}">警告</span>
      </div>
    </div>
    <footer>
      正文 ${row.metrics.body.toFixed(2)}:1 · 次级 ${row.metrics.secondary.toFixed(2)}:1 ·
      改动量 ${row.total}（${row.secondaryShift}/${row.accentShift}）
    </footer>
  </section>`
  })
  .join('\n')

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>浅色主题考察 · dsh-theme-material</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 32px 28px 56px; background: #f2f2f3; color: #1b1b1f;
    font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .lede { margin: 0 0 24px; color: #5b5b64; max-width: 780px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(430px, 1fr)); gap: 18px; }
  .card { background: #fff; border: 1px solid rgba(0,0,0,.1); border-radius: 12px; padding: 14px 16px 10px;
    box-shadow: 0 1px 2px rgba(0,0,0,.05); display: flex; flex-direction: column; gap: 10px; }
  header h2 { margin: 0; font-size: 15px; }
  header p { margin: 2px 0 0; font-size: 12px; color: #6b6b74; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { flex: 1 1 0; min-width: 62px; border-radius: 6px; padding: 6px 6px; font-size: 10px; line-height: 1.35;
    text-align: center; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); color: #111; }
  .mock { border-radius: 10px; padding: 10px; border: 1px solid; display: flex; flex-direction: column; gap: 8px; }
  .bubble { border-radius: 8px; padding: 7px 9px; font-size: 12px; }
  .code { border-radius: 6px; padding: 7px 9px; font-size: 12px; }
  .code code { font-family: ui-monospace, "SF Mono", Consolas, monospace; }
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
  .row a { text-decoration: underline; text-underline-offset: 2px; }
  .row button { border: 0; border-radius: 6px; padding: 5px 12px; font: inherit; font-weight: 600; cursor: default; }
  .badge { border-radius: 5px; padding: 3px 7px; font-size: 11px; }
  footer { font-size: 11px; color: #6b6b74; }
</style>
</head>
<body>
<h1>浅色主题考察</h1>
<p class="lede">
  每一格都用本包的推导引擎把该主题的原始色值算成 126 个 token，再按 DSH 的用法摆出来：
  气泡、输入面、代码块、链接、主按钮、成功/错误/警告三态。
  色块上的文字就是 token 的真实取值。<strong>改动量</strong> = 引擎为了达标把这个主题的注释色与强调色推离原色多少（RGB 距离）。
</p>
<div class="grid">
${cards}
</div>
</body>
</html>
`

const outDir = join(root, 'survey')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'light-themes.html')
writeFileSync(outPath, html, 'utf8')
console.log(`\n可视化对比页：${outPath}`)
