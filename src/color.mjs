/**
 * 色彩运算：只输出纯 CSS 值（不透明用 hex，半透明用 rgba），
 * 浏览器端不需要颜色解析器。
 */

/** 解析 `#rgb` / `#rrggbb` / `#rrggbbaa` 或 `rgb[a](...)` 为 {r,g,b,a}。 */
export function parse(input) {
  const value = String(input).trim()
  if (value.startsWith('rgb')) {
    const n = value.replace(/[^0-9.,]/g, '').split(',').map(Number)
    return { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a: n[3] ?? 1 }
  }
  let hex = value.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  const int = Number.parseInt(hex.slice(0, 6), 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
    a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
  }
}

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
const hex2 = (n) => clamp(n).toString(16).padStart(2, '0')

/** {r,g,b} -> `#rrggbb`。 */
export function toHex(color) {
  return `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}`
}

/** 线性插值：t=0 取 a，t=1 取 b。 */
export function mix(a, b, t) {
  const x = parse(a)
  const y = parse(b)
  return toHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  })
}

/** 同一个颜色的 alpha 版本，输出 rgba() 字符串。 */
export function alpha(color, value) {
  const c = parse(color)
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${Number(value.toFixed(3))})`
}

/** 朝白色靠。 */
export function lighten(color, amount) {
  return mix(color, '#ffffff', amount)
}

/** 朝黑色靠。 */
export function darken(color, amount) {
  return mix(color, '#000000', amount)
}

/** 把半透明色压到不透明底上，用来测量眼睛实际收到的颜色。 */
export function flatten(color, background) {
  const fg = parse(color)
  if (fg.a >= 1) return toHex(fg)
  const back = parse(background)
  return toHex({
    r: fg.r * fg.a + back.r * (1 - fg.a),
    g: fg.g * fg.a + back.g * (1 - fg.a),
    b: fg.b * fg.a + back.b * (1 - fg.a),
  })
}

/** WCAG 2.x 相对亮度。 */
export function luminance(color) {
  const { r, g, b } = parse(color)
  const channel = (n) => {
    const s = n / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 对比度，恒 >= 1。 */
export function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * 把前景往黑或白推，直到对背景达到 minimum。
 * 这样皮肤可以写自己喜欢的色相，落到按钮填充/正文时仍然可读。
 *
 * 两个方向都试，取先达标的那条。只按背景亮度挑方向是错的：
 * Material 的按钮是"近黑文字压在中等亮度的青绿上"，那种背景下
 * 往白推只会越推越糊，往黑推一步就够了。
 */
export function ensureContrast(foreground, background, minimum) {
  if (contrast(foreground, background) >= minimum) return foreground

  const attempt = (toward) => {
    let result = foreground
    for (let step = 1; step <= 20; step += 1) {
      result = mix(foreground, toward, step * 0.05)
      if (contrast(result, background) >= minimum) return { result, steps: step }
    }
    return null
  }

  const towardBlack = attempt('#000000')
  const towardWhite = attempt('#ffffff')
  if (towardBlack !== null && towardWhite !== null) {
    return towardBlack.steps <= towardWhite.steps ? towardBlack.result : towardWhite.result
  }
  if (towardBlack !== null) return towardBlack.result
  if (towardWhite !== null) return towardWhite.result

  // 两边都够不着：退回对比度更高的那一端，而不是原样发一个不可读的值。
  const black = mix(foreground, '#000000', 1)
  const white = mix(foreground, '#ffffff', 1)
  return contrast(black, background) >= contrast(white, background) ? black : white
}
