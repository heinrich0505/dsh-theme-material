/**
 * 浅色主题考察的公共取数层。
 *
 * 从 npm 上 @shikijs/themes 的官方 TextMate 转换包取真实主题色值，
 * 映射成本包的 10 个输入色，再用本包引擎算成 126 个 token 并测对比度。
 *
 * 只读分析，不参与打包。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrast, parse } from '../../src/color.mjs'
import { deriveTokens } from '../../src/derive.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const cacheDir = join(root, '.survey-cache')
const VERSION = '3.0.0'

/** 候选：shiki 主题 id + 展示名 + 一句话印象 */
export const CANDIDATES = [
  { id: 'material-theme-lighter', name: 'Material Lighter', note: '本包浅色基线' },
  { id: 'light-plus', name: 'Light+', note: 'VS Code 默认' },
  { id: 'github-light', name: 'GitHub Light', note: '克制中性' },
  { id: 'github-light-high-contrast', name: 'GitHub Light HC', note: '同款高对比' },
  { id: 'one-light', name: 'One Light', note: '编辑器经典' },
  { id: 'min-light', name: 'Min Light', note: '几乎单色' },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', note: '柔和马卡龙' },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', note: '暖玫瑰' },
  { id: 'solarized-light', name: 'Solarized Light', note: '低对比经典' },
  { id: 'kanagawa-lotus', name: 'Kanagawa Lotus', note: '宣纸墨色' },
  { id: 'snazzy-light', name: 'Snazzy Light', note: '高饱和' },
  { id: 'vitesse-light', name: 'Vitesse Light', note: '极简低彩' },
  { id: 'everforest-light', name: 'Everforest Light', note: '护眼暖绿' },
]

const fetchTheme = async (id) => {
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
  const cached = join(cacheDir, `${id}.mjs`)
  if (existsSync(cached)) return readFileSync(cached, 'utf8')
  const response = await fetch(`https://unpkg.com/@shikijs/themes@${VERSION}/dist/${id}.mjs`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const text = await response.text()
  writeFileSync(cached, text, 'utf8')
  return text
}

/** 从 `export default Object.freeze(JSON.parse("<escaped json>"))` 取对象。 */
const parseTheme = (source) => {
  const match = /JSON\.parse\(\s*("(?:[^"\\]|\\.)*")\s*\)/s.exec(source)
  if (!match) throw new Error('没找到 JSON.parse 载荷')
  return JSON.parse(JSON.parse(match[1]))
}

/**
 * 解析 JSONC（VS Code 主题文件允许注释和尾逗号）。
 * 逐字符扫描，跳过字符串内部的 // 与 /*，避免把色值里的斜杠当注释。
 */
export const parseJsonc = (text) => {
  let out = ''
  let inString = false
  let inLine = false
  let inBlock = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (inLine) {
      if (char === '\n') {
        inLine = false
        out += char
      }
      continue
    }
    if (inBlock) {
      if (char === '*' && next === '/') {
        inBlock = false
        index += 1
      }
      continue
    }
    if (inString) {
      out += char
      if (char === '\\') {
        index += 1
        out += text[index] ?? ''
        continue
      }
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      out += char
      continue
    }
    if (char === '/' && next === '/') {
      inLine = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      inBlock = true
      index += 1
      continue
    }
    out += char
  }
  // 去掉尾逗号
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

/** 按 scope 前缀找 token 颜色。 */const scopeColor = (theme, ...scopes) => {
  for (const scope of scopes) {
    for (const rule of theme.tokenColors ?? []) {
      const list = Array.isArray(rule.scope) ? rule.scope : String(rule.scope ?? '').split(',')
      if (list.some((item) => String(item).trim().startsWith(scope)) && rule.settings?.foreground) {
        return rule.settings.foreground
      }
    }
  }
  return null
}

export const chroma = (hex) => {
  const { r, g, b } = parse(hex)
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255
}

/** 把一份 VS Code 主题映射成本包的 10 个输入色 + 语法色。 */
const toPalette = (theme) => {
  const colors = theme.colors ?? {}
  const bg = colors['editor.background']
  const ink = colors['editor.foreground']
  if (!bg || !ink) return null

  const plate = colors['input.background'] ?? colors['sideBar.background'] ?? bg
  const muted =
    scopeColor(theme, 'comment') ??
    colors['editorLineNumber.activeForeground'] ??
    colors['sideBar.foreground'] ??
    ink
  const accent =
    colors['progressBar.background'] ??
    colors['textLink.foreground'] ??
    colors['activityBarBadge.background'] ??
    scopeColor(theme, 'entity.name.function') ??
    ink

  const palette = {
    bg,
    plate,
    ink,
    muted,
    accent,
    onAccent: '#FFFFFF',
    danger: colors['terminal.ansiRed'] ?? scopeColor(theme, 'invalid') ?? '#E53935',
    success: colors['terminal.ansiGreen'] ?? scopeColor(theme, 'string') ?? '#91B859',
    warn: colors['terminal.ansiYellow'] ?? scopeColor(theme, 'constant.numeric') ?? '#E2931D',
    accent2: colors['terminal.ansiMagenta'] ?? colors['terminal.ansiBlue'] ?? accent,
  }

  const syntax = {
    keyword: scopeColor(theme, 'keyword') ?? palette.accent2,
    string: scopeColor(theme, 'string') ?? palette.success,
    fn: scopeColor(theme, 'entity.name.function') ?? palette.accent,
    number: scopeColor(theme, 'constant.numeric') ?? palette.warn,
    comment: scopeColor(theme, 'comment') ?? palette.muted,
    type: scopeColor(theme, 'entity.name.type', 'support.type') ?? palette.warn,
  }

  return { palette, syntax }
}

const FLOORS = [
  ['body', 7],
  ['secondary', 4.5],
  ['accentText', 4.5],
  ['accentFill', 3],
  ['buttonLabel', 4.5],
]

const rgbDistance = (a, b) => {
  const x = parse(a)
  const y = parse(b)
  return Math.round(Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b))
}

/**
 * 把一份已解析的 VS Code 主题分析成一行结果（映射 + 推导 + 度量）。
 * @param {object} theme 主题 JSON
 * @param {{ id: string, name: string, note?: string }} meta 标识
 */
export function analyzeTheme(theme, meta) {
  const mapped = toPalette(theme)
  if (mapped === null) return { ...meta, error: '缺 editor.background / foreground' }
  const { palette, syntax } = mapped
  const tokens = deriveTokens(palette, { dark: false, signature: 'material' })
  const metrics = {
    body: contrast(tokens['--dsw-alias-label-primary'], palette.bg),
    secondary: contrast(tokens['--dsw-alias-label-secondary'], palette.bg),
    accentText: contrast(tokens['--dsw-alias-state-business-primary'], palette.bg),
    accentFill: contrast(tokens['--dsw-alias-button-primary-fill'], palette.bg),
    buttonLabel: contrast(tokens['--dsw-alias-label-primary-foreground'], tokens['--dsw-alias-button-primary-fill']),
  }
  const secondaryShift = rgbDistance(palette.muted, tokens['--dsw-alias-label-secondary'])
  const accentShift = rgbDistance(palette.accent, tokens['--dsw-alias-state-business-primary'])
  return {
    ...meta,
    palette,
    syntax,
    tokens,
    metrics,
    failed: FLOORS.filter(([key, floor]) => metrics[key] < floor).map(([key]) => key),
    rawBody: contrast(palette.ink, palette.bg),
    bgChroma: chroma(palette.bg),
    plateDelta: contrast(palette.plate, palette.bg),
    secondaryShift,
    accentShift,
    total: secondaryShift + accentShift,
  }
}

/** 采集全部候选。 */
export async function collect() {
  const rows = []
  for (const candidate of CANDIDATES) {
    try {
      const theme = parseTheme(await fetchTheme(candidate.id))
      rows.push(analyzeTheme(theme, candidate))
    } catch (error) {
      rows.push({ ...candidate, error: error.message })
    }
  }
  return rows
}

export const hex = (value) => (value ? `#${String(value).replace('#', '').slice(0, 6).toUpperCase()}` : '—')
export const ratio = (n) => (n === undefined ? '—' : `${n.toFixed(2)}:1`)
