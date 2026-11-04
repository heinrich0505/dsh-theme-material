/**
 * 推导：10 个输入色 -> 外壳读取的 126 个配色 token。
 *
 * 规则按"角色"写，不写死颜色，所以每套皮肤都继承同一套对比度行为：
 * 正文对页面、强调色当文字、按钮文字压在填充上，达不到门槛就往黑/白推，
 * 而不是原样发出去。
 *
 * 这里另外做了一件 Material 专属的事：`signature === 'material'` 时
 * 关掉外壳的毛玻璃与半透明菜单，改成实心平面。Material Theme 的身份
 * 就是"平"，留着 blur 就不像它了。
 */
import { alpha, contrast, darken, ensureContrast, flatten, lighten, mix } from './color.mjs'
import { TOKEN_NAMES } from './tokens.mjs'

/** @typedef {import('./skins.mjs').Palette} Palette */

/**
 * 推导一种外观下的全部 token。
 * @param {Palette} palette
 * @param {{ dark: boolean, signature?: string }} options
 * @returns {Record<string, string>}
 */
export function deriveTokens(palette, options) {
  const dark = options.dark
  const signature = options.signature ?? 'plain'
  const flat = signature === 'material'
  const { bg, plate, ink, muted, accent, onAccent, danger, success, warn, accent2 } = palette

  // Material 的描边比 Atlas 那种"纸感"更软，深色下略提一点即可。
  const lineScale = dark ? 1.15 : 1
  // 平底皮肤没有阴影帮忙分层，交互色要稍微更实一点才看得出来。
  const tint = flat ? 1.15 : 1

  // 文字角色：正文 7:1，次级 4.5:1，其余递减但不隐形。
  const primary = ensureContrast(ink, bg, 7)
  const secondary = ensureContrast(muted, bg, 4.5)
  const tertiary = ensureContrast(mix(muted, bg, 0.18), bg, 3)
  const caption = ensureContrast(mix(muted, bg, 0.34), bg, 3)
  const dimmed = mix(bg, ink, 0.22)

  // 强调色既当文字（链接、选中项）又当填充（主按钮），各自要单独保证。
  const accentFill = ensureContrast(accent, bg, 3)
  const accentText = ensureContrast(accent, bg, 4.5)
  const accentHover = dark ? lighten(accentFill, 0.08) : darken(accentFill, 0.07)
  const onAccentSafe = ensureContrast(onAccent, accentFill, 4.5)

  // 状态色。
  const error = ensureContrast(danger, bg, 3)
  const ok = ensureContrast(success, bg, 3)
  const warning = ensureContrast(warn, bg, 3)
  // Material 的"完成"是紫色，不用蓝色。
  const done = ensureContrast(accent2, bg, 3)

  const layer2 = plate
  const layer3 = dark ? mix(plate, '#ffffff', 0.05) : mix(plate, '#000000', 0.03)
  const overlay = dark ? mix(plate, '#ffffff', 0.075) : mix(plate, '#000000', 0.04)
  const subtle = (amount) => mix(bg, ink, amount)
  const stroke = (amount) => alpha(ink, Math.min(0.9, amount * lineScale))

  // 输入框在 Material 里是有方向的：深色版比底亮一档（浮起），
  // 浅色版比底暗一档（凹陷）。这正好也是 Material 的经典手感。
  const inputFill = dark ? layer2 : mix(bg, ink, 0.05)

  // Material 的选区不是强调色：Palenight 是偏蓝的紫，Lighter 是青绿。
  const selection = dark ? alpha(accent2, 0.32) : alpha(accent, 0.30)

  // 装饰插画的层次：surface 比 backing 亮，inset/阴影与 backing 同调。
  const illoBacking = dark ? mix(bg, '#000000', 0.2) : mix(bg, ink, 0.04)
  const illoSurface = dark ? mix(bg, ink, 0.12) : '#FFFFFF'

  /** @type {Record<string, string>} */
  const tokens = {
    '--dsw-alias-bg-base': bg,
    '--dsw-alias-bg-layer-1': bg,
    '--dsw-alias-bg-layer-2': layer2,
    '--dsw-alias-bg-layer-3': layer3,
    '--dsw-alias-bg-overlay': overlay,
    '--dsw-alias-bg-module-platform': layer2,
    '--dsw-alias-bg-multi-select': alpha(accentText, 0.14 * tint),
    '--dsw-alias-bg-skeleton': stroke(dark ? 0.1 : 0.07),
    '--dsw-alias-bg-document-preview': dark ? darken(bg, 0.02) : mix(bg, '#000000', 0.03),
    '--dsw-alias-bg-document-selection': selection,
    '--dsw-alias-bg-mask-1': alpha('#000000', dark ? 0.55 : 0.32),
    '--dsw-alias-bg-mask-2': alpha('#000000', dark ? 0.24 : 0.14),
    '--dsw-alias-bg-mask-3': alpha('#000000', dark ? 0.7 : 0.3),
    '--dsw-alias-bg-mask-photo': alpha('#000000', 0.88),
    '--dsw-alias-bg-mask-drop': alpha(layer2, dark ? 0.78 : 0.72),

    '--dsw-alias-label-primary': primary,
    '--dsw-alias-label-primary-bluish': mix(primary, accentText, 0.18),
    '--dsw-alias-label-primary-dimmed': mix(primary, bg, 0.12),
    '--dsw-alias-label-primary-foreground': onAccentSafe,
    '--dsw-alias-label-primary-inverted': onAccentSafe,
    '--dsw-alias-label-secondary': secondary,
    '--dsw-alias-label-tertiary': tertiary,
    '--dsw-alias-label-caption': caption,
    '--dsw-alias-label-dimmed': dimmed,
    '--dsw-alias-label-document-preview': secondary,
    '--dsw-alias-label-deep-diving': accentText,
    '--dsw-alias-label-deep-diving-shimmer': alpha(accentText, 0.5),
    '--dsw-alias-label-shimmer': alpha(dark ? '#ffffff' : '#000000', 0.3),
    '--dsw-alias-menu-icon': mix(primary, accentText, 0.12),

    '--dsw-alias-border-l1': stroke(0.07),
    '--dsw-alias-border-l2': stroke(0.11),
    '--dsw-alias-border-l2-darkmode-thin': stroke(0.1),
    '--dsw-alias-border-l3': stroke(0.16),
    '--dsw-alias-border-l4': stroke(0.24),
    '--dsw-alias-border-inverted': alpha(dark ? '#ffffff' : '#000000', 0.06),
    '--dsw-alias-border-inverted2': alpha(dark ? '#ffffff' : '#000000', 0.09),

    '--dsw-alias-brand-primary': primary,
    '--dsw-alias-brand-primary-invert': bg,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': accentText,
    '--dsw-alias-brand-text': primary,
    '--dsw-alias-link': accentText,

    '--dsw-alias-state-business-primary': accentText,
    '--dsw-alias-state-business-tertiary': alpha(accentText, (dark ? 0.18 : 0.11) * tint),
    '--dsw-alias-state-done-primary': done,
    '--dsw-alias-state-error-primary': error,
    '--dsw-alias-state-error-secondary': mix(error, bg, 0.35),
    '--dsw-alias-state-success-primary': ok,
    '--dsw-alias-state-success-secondary': mix(ok, bg, 0.35),
    '--dsw-alias-state-success-tertiary': alpha(ok, dark ? 0.18 : 0.11),
    '--dsw-alias-state-warn-label': warning,
    '--dsw-alias-state-warn-primary': warning,
    '--dsw-alias-state-warn-secondary': mix(warning, bg, 0.32),
    '--dsw-alias-state-warn-tertiary': alpha(warning, dark ? 0.18 : 0.11),
    '--dsw-alias-state-idle-primary': mix(secondary, bg, 0.5),

    '--dsw-alias-interactive-bg-hover': alpha(accentText, (dark ? 0.12 : 0.065) * tint),
    '--dsw-alias-interactive-bg-active': alpha(accentText, (dark ? 0.19 : 0.11) * tint),
    '--dsw-alias-interactive-bg-hover-accent': alpha(accentText, (dark ? 0.24 : 0.15) * tint),
    '--dsw-alias-interactive-bg-hover-danger': alpha(error, dark ? 0.16 : 0.07),
    '--dsw-alias-interactive-bg-hover-solid': layer3,

    '--dsw-alias-button-contrast-fill': primary,
    '--dsw-alias-button-elevated-fill': layer2,
    '--dsw-alias-button-floating-fill': layer2,
    '--dsw-alias-button-floating-hover': layer3,
    '--dsw-alias-button-ghost-active-border': stroke(0.26),
    '--dsw-alias-button-ghost-active-fill': alpha(ink, 0.07),
    '--dsw-alias-button-ghost-active-hover': alpha(ink, 0.1),
    '--dsw-alias-button-info-fill': accentFill,
    '--dsw-alias-button-info-hover': accentHover,
    '--dsw-alias-button-primary-fill': accentFill,
    '--dsw-alias-button-primary-hover': accentHover,
    '--dsw-alias-button-primary-dimmed': alpha(accentFill, (dark ? 0.24 : 0.14) * tint),
    '--dsw-alias-button-tool-bar-fill': alpha(ink, dark ? 0.5 : 0.58),
    '--dsw-alias-button-tool-bar-fill-invisible': alpha(ink, dark ? 0.22 : 0.28),
    '--dsw-alias-button-tool-bar-hover': alpha(ink, dark ? 0.62 : 0.7),

    '--dsw-alias-markdown-citation': subtle(0.045),
    '--dsw-alias-markdown-code-block': subtle(0.055),
    '--dsw-alias-markdown-code-block-banner': subtle(0.03),
    '--dsw-alias-markdown-code-segment-selected': layer2,
    '--dsw-alias-markdown-code-segment-unselected': subtle(0.04),
    '--dsw-alias-markdown-inline-code': subtle(0.075),
    '--dsw-alias-markdown-placeholder': ensureContrast(mix(muted, bg, 0.5), bg, 3),
    '--dsw-alias-markdown-tag': subtle(0.065),

    '--dsw-alias-turn-trigger-bg': subtle(0.05),
    '--dsw-alias-turn-trigger-bg-hover': alpha(ink, 0.08),

    '--dsw-alias-scrollbar-bg-l1': alpha(ink, 0.16),
    '--dsw-alias-scrollbar-bg-l2': alpha(ink, 0.22),
    '--dsw-alias-scrollbar-hover-l1': alpha(ink, 0.26),
    '--dsw-alias-scrollbar-hover-l2': alpha(ink, 0.34),

    '--dsw-alias-code-diff-added': alpha(ok, dark ? 0.16 : 0.12),
    '--dsw-alias-code-diff-deleted': alpha(error, dark ? 0.14 : 0.1),
    '--dsw-alias-file-diff-added-bg': alpha(ok, dark ? 0.18 : 0.12),
    '--dsw-alias-file-diff-added-gutter': alpha(ok, dark ? 0.1 : 0.07),
    '--dsw-alias-file-diff-added-marker': ok,
    '--dsw-alias-file-diff-deleted-bg': alpha(error, dark ? 0.16 : 0.1),
    '--dsw-alias-file-diff-deleted-gutter': alpha(error, dark ? 0.09 : 0.06),
    '--dsw-alias-file-diff-deleted-marker': error,

    '--dsw-alias-illustration-background': bg,
    '--dsw-alias-illustration-backing': illoBacking,
    '--dsw-alias-illustration-surface': illoSurface,
    '--dsw-alias-illustration-inset': illoBacking,
    '--dsw-alias-illustration-shadow': alpha(illoBacking, 0.55),
    '--dsw-alias-illustration-detail': accentText,

    '--dsw-alias-switch-thumb': dark ? mix(plate, '#ffffff', 0.55) : '#ffffff',
    '--dsw-alias-toast-bg': layer3,
    '--dsw-alias-toast-label': primary,
    '--dsw-alias-tooltip-bg': layer3,
    '--dsw-alias-tooltip-key-bg': mix(layer3, '#ffffff', dark ? 0.14 : 0.5),

    '--dsw-alias-settings-card-fill': layer2,
    '--dsw-alias-settings-card-stroke': stroke(0.12),
    '--dsw-alias-onboarding-accent': accentText,
    '--dsw-alias-onboarding-card-fill': layer2,
    '--dsw-alias-onboarding-checkbox-border': stroke(0.28),
    '--dsw-alias-onboarding-secondary-fill': layer3,

    // 平面化：菜单实心、不做毛玻璃。Material Theme 里没有 blur。
    '--dsw-alias-menu-group-header-fill': layer2,
    '--dsw-menu-surface-fill': layer2,
    '--dsw-menu-backdrop-filter': 'none',

    '--dsw-specific-menu': layer2,
    '--dsw-specific-selector': layer3,
    '--dsw-specific-sidebar-fill': subtle(dark ? 0.02 : 0.015),
    '--dsw-specific-sidebar-nav-item-active': alpha(accentText, (dark ? 0.16 : 0.1) * tint),
    '--dsw-specific-sidebar-nav-item-active-accent': accentText,
    '--dsw-specific-input-major': inputFill,
    '--dsw-specific-login-input': dark ? mix(plate, '#000000', 0.18) : mix(bg, ink, 0.035),
    '--dsw-specific-bubble': mix(layer2, accentText, 0.04),
    '--dsw-specific-bubble-highlight': alpha(accentText, (dark ? 0.14 : 0.1) * tint),
    '--dsw-specific-tip': layer3,
  }

  // 列表就是契约：外壳读的 token 一个都不能丢。
  for (const name of TOKEN_NAMES) {
    if (!(name in tokens)) throw new Error(`deriveTokens: missing ${name}`)
  }
  for (const name of Object.keys(tokens)) {
    if (!TOKEN_NAMES.includes(name)) throw new Error(`deriveTokens: unknown token ${name}`)
  }
  return tokens
}

/** 推导一套皮肤的深浅两版。 */
export function deriveSkin(skin) {
  return {
    light: deriveTokens(skin.light, { dark: false, signature: skin.signature }),
    dark: deriveTokens(skin.dark, { dark: true, signature: skin.signature }),
  }
}

/** `npm run verify` 打印的实测数字。 */
export function contrastReport(skin) {
  const rows = []
  for (const mode of ['light', 'dark']) {
    const palette = skin[mode]
    const tokens = deriveTokens(palette, {
      dark: mode === 'dark',
      signature: skin.signature,
    })
    rows.push({
      mode,
      body: contrast(tokens['--dsw-alias-label-primary'], palette.bg),
      secondary: contrast(tokens['--dsw-alias-label-secondary'], palette.bg),
      accentText: contrast(tokens['--dsw-alias-state-business-primary'], palette.bg),
      accentFill: contrast(tokens['--dsw-alias-button-primary-fill'], palette.bg),
      buttonLabel: contrast(
        tokens['--dsw-alias-label-primary-foreground'],
        tokens['--dsw-alias-button-primary-fill'],
      ),
      border: contrast(flatten(tokens['--dsw-alias-border-l3'], palette.bg), palette.bg),
    })
  }
  return rows
}
