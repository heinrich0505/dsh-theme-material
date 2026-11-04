/**
 * 浏览器半边。
 *
 * 三件事，都可回滚：
 *   1. 通过 `ctx.theme.overrideTokens` 换掉当前皮肤的别名 token 层；
 *      外壳没有主题服务时，退化成一张作用域限定的样式表；
 *   2. 把换肤入口放回它该在的地方 —— 设置页「通用」里的一行色卡
 *      （外壳的 `settings.general.item` 插槽，官方「外观」行用的同一个）；
 *   3. 快捷键 Alt+K 轮换，给熟手用。
 *
 * 不写宿主状态：皮肤选择是浏览器本地偏好，和外壳自己的字体选择一个性质。
 *
 * 为什么不再有悬浮胶囊：曾经为它实现了拖动、位置记忆、越界夹回、归位一整套，
 * 复杂度全是"没地方放控件"逼出来的。搬进设置页之后这一整套连同它的 bug 面
 * 一起消失。
 */

const SOURCE = 'dsh-theme-material'
const STYLE_ID = 'dsh-theme-material/styles'
const KEY_SKIN = 'dsh.theme-material.skin'
/** 设置行在「通用」里的排序：官方「外观」是 10，紧挨着它。 */
const ROW_ORDER = 11
const ROW_ID = 'material-theme'
/** 等外壳把 slots 服务挂上来的最大帧数，约 2 秒。拿不到就静默放弃（只留快捷键）。 */
const MAX_ROW_ATTEMPTS = 120

const read = (key) => {
  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    return null
  }
}

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    /* 隐私模式：这次会话照用，只是不记住 */
  }
}

/**
 * 氛围层。Material 的身份是"平"，所以这里刻意什么都不画：
 * 不铺渐变、不加光晕，只把选区与焦点环接到 token 上，
 * 保证它们跟着皮肤的强调色走。
 */
const SIGNATURE_CSS = `
html[data-dsh-material] body {
  background-image: none;
}
html[data-dsh-material] ::selection {
  background: var(--dsw-alias-bg-document-selection);
}
html[data-dsh-material] :focus-visible {
  outline-color: var(--dsw-alias-state-business-primary);
}
${ROW_CSS}`

/** 外壳没有主题服务时的退路：把同样的 token 写进一张作用域样式表。 */
const fallbackCss = (light, dark) => {
  const block = (selector, table) =>
    `${selector} {\n${Object.entries(table).map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`
  return [
    block('html body:not([data-ds-dark-theme])', light),
    block('html body[data-ds-dark-theme]', dark),
  ].join('\n')
}

/**
 * @param {object} ctx cordis 客户端上下文
 * @param {{ skins: object[], getSkin: (id: string) => object, deriveSkin: (skin: object) => object, defaultSkin: string, moduleRequire?: Function, createSettingsRow?: Function }} core
 */
export function applyMaterial(ctx, core) {
  const { skins, getSkin, deriveSkin, defaultSkin, createSettingsRow } = core

  const stored = read(KEY_SKIN)
  let activeId = skins.some((skin) => skin.id === stored) ? stored : defaultSkin

  const doc = document
  const html = doc.documentElement
  const current = () => getSkin(activeId)
  const isDark = () => doc.body !== null && doc.body.hasAttribute('data-ds-dark-theme')
  const mode = () => (isDark() ? 'dark' : 'light')

  /**
   * 等外壳有 <body> 再动手。浏览器半边可能在只有 head 的时候就被应用，
   * 这时读 doc.body 会抛错并拖垮整个 bundle，所以挂载等 DOMContentLoaded。
   */
  const whenBody = (fn) => {
    if (doc.body !== null) {
      fn()
      return () => {}
    }
    const onReady = () => fn()
    doc.addEventListener('DOMContentLoaded', onReady, { once: true })
    return () => doc.removeEventListener('DOMContentLoaded', onReady)
  }

  // ---- token 层 ----
  let disposeTokens = () => {}
  // `ctx.get` 读服务但不在 inject 里声明它。直接读 ctx.theme 会在
  // strict injection 的外壳上抛错，而且 typeof 里面也会抛，整个插件就没了。
  const discoverService = (name) => {
    if (!ctx) return undefined
    try {
      if (typeof ctx.get === 'function') return ctx.get(name)
      return ctx[name]
    } catch (error) {
      return undefined
    }
  }

  const seeded = discoverService('theme')
  let themeSvc = seeded && typeof seeded.overrideTokens === 'function' ? seeded : null
  /** 切不动外壳外观时强行接管的那一侧（'dark' / 'light' / null = 按外壳外观取值）。 */
  let forcedBoth = null

  /**
   * 交给外壳的 token 层：每个值都是 { light, dark } 一对。
   * 只有拿不到 `setTheme` 的外壳才会把原生侧写进两侧。
   */
  const tokenLayer = () => {
    const both = deriveSkin(current())
    const forced = forcedBoth
    return Object.fromEntries(
      Object.keys(both.light).map((name) => {
        if (forced === 'dark') return [name, { light: both.dark[name], dark: both.dark[name] }]
        if (forced === 'light') return [name, { light: both.light[name], dark: both.light[name] }]
        return [name, { light: both.light[name], dark: both.dark[name] }]
      }),
    )
  }

  const applyTokens = () => {
    disposeTokens()
    disposeTokens = () => {}
    if (themeSvc !== null) {
      try {
        disposeTokens = themeSvc.overrideTokens(SOURCE, tokenLayer()) ?? (() => {})
        doc.getElementById('dsh-theme-material/fallback')?.remove()
        return
      } catch (error) {
        // 会拒绝这层的服务不比没有服务强：退回作用域样式表。
        themeSvc = null
      }
    }
    const both = deriveSkin(current())
    let tag = doc.getElementById('dsh-theme-material/fallback')
    if (tag === null) {
      tag = doc.createElement('style')
      tag.id = 'dsh-theme-material/fallback'
      doc.head.append(tag)
    }
    tag.textContent = fallbackCss(both.light, both.dark)
  }

  /**
   * 最近一次真正注册出去的 token 层指纹 —— 防死循环的闸门，别拿掉。
   *
   * `paint()` 会被外观观察者反复触发，而每次注册 token 都会让外壳 publish 一次快照；
   * presenter 应用快照时执行 `body.setAttribute('data-ds-dark-theme','')`，
   * 按 DOM 规范**同值也会投递 mutation 记录**，于是观察者再 paint —— 自激成死循环
   * （0.2.1 的真实事故：单核 100%，渲染进程涨到 15GB）。
   *
   * 指纹只由"皮肤 + 是否强制某一侧"决定：token 本身成对，外观翻转由外壳自己选值。
   */
  let appliedKey = null

  const applyTokensIfChanged = () => {
    const key = `${activeId}|${forcedBoth ?? 'auto'}`
    if (key === appliedKey) return
    appliedKey = key
    applyTokens()
  }

  /**
   * 让外壳外观跟着皮肤走：皮肤带 `native`，深色皮肤的深色侧才是它的样子。
   * 只切一次、只在不一致时切；之后用户仍可手动改回，我们不去抢。
   */
  const syncAppearance = () => {
    const skin = current()
    const wantDark = skin.native !== 'light'
    if (isDark() === wantDark) {
      if (forcedBoth !== null) {
        forcedBoth = null
        applyTokensIfChanged()
      }
      return
    }
    if (themeSvc === null) {
      const late = discoverService('theme')
      if (late !== null && late !== undefined) themeSvc = late
    }
    if (themeSvc !== null && typeof themeSvc.setTheme === 'function') {
      try {
        themeSvc.setTheme(wantDark ? 'dark' : 'light')
        return
      } catch (error) {
        /* 外壳拒绝了这个偏好：退到下面的补丁层 */
      }
    }
    if (forcedBoth !== (wantDark ? 'dark' : 'light')) {
      forcedBoth = wantDark ? 'dark' : 'light'
      applyTokensIfChanged()
    }
  }

  const paint = () => {
    const skin = current()
    // 主题服务可能晚到：每次重绘再探一次。补上时必须清指纹，
    // 否则 fallback 样式表会一直卡着不迁回 token 层。
    if (themeSvc === null) {
      const late = discoverService('theme')
      if (late && typeof late.overrideTokens === 'function') {
        themeSvc = late
        appliedKey = null
      }
    }
    html.setAttribute('data-dsh-material', skin.id)
    html.setAttribute('data-dsh-material-mode', mode())
    // 关键：外观翻转不重新注册 token（成对值由外壳自己挑），
    // 否则会经由 presenter 的 setAttribute 触发自身观察者，形成死循环。
    applyTokensIfChanged()
  }

  // ---- 选择与订阅 ----
  let debugHandle = null
  const listeners = new Set()
  const subscribe = (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
  const notify = () => {
    for (const fn of listeners) {
      try {
        fn()
      } catch (error) {
        /* 单个订阅者出错不影响其他人 */
      }
    }
  }

  const select = (id) => {
    if (!skins.some((skin) => skin.id === id)) return
    activeId = id
    write(KEY_SKIN, id)
    syncAppearance()
    paint()
    notify()
  }

  // ---- 设置页那一行 ----
  let rowRegistered = false
  let disposeRow = () => {}

  /** React 与 jsx runtime 由外壳的模块加载器提供，本包不需要构建工具。 */
  const loadReact = () => {
    const request = core.moduleRequire
    if (typeof request !== 'function' || typeof createSettingsRow !== 'function') return null
    try {
      return { React: request('react'), runtime: request('react/jsx-runtime') }
    } catch (error) {
      return null
    }
  }

  const registerRow = () => {
    if (rowRegistered) return true
    const slots = discoverService('slots')
    if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return false
    const react = loadReact()
    if (react === null || !react.React || !react.runtime) return false
    try {
      const Row = createSettingsRow(react.React, react.runtime, {
        skins,
        currentId: () => activeId,
        select,
        subscribe,
      })
      const scope = slots.inject('settings.general.item', () => {
        const unregister = slots.register(
          { name: 'settings.general.item', id: ROW_ID, order: ROW_ORDER },
          Row,
        )
        const inner = typeof unregister === 'function' ? unregister : () => {}
        disposeRow = () => {
          inner()
          disposeRow = () => {}
        }
        return unregister
      })
      if (typeof scope === 'function') {
        const previous = disposeRow
        disposeRow = () => {
          previous()
          scope()
          disposeRow = () => {}
        }
      }
      rowRegistered = true
      return true
    } catch (error) {
      return false
    }
  }

  // 氛围样式表归插件所有：跟着 fiber 一起移除。
  ctx.effect(() => {
    const tag = doc.createElement('style')
    tag.id = STYLE_ID
    tag.textContent = SIGNATURE_CSS
    doc.head.append(tag)
    return () => tag.remove()
  }, 'material: signature')

  // 设置行：slots 服务可能晚于本插件挂上，重试有限帧后放弃（只留快捷键）。
  ctx.effect(() => {
    let cancelled = false
    let attempts = 0
    const tick = () => {
      if (cancelled || rowRegistered) return
      if (registerRow()) return
      if (attempts >= MAX_ROW_ATTEMPTS) return
      attempts += 1
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick)
      else if (typeof setTimeout === 'function') setTimeout(tick, 16)
    }
    tick()
    return () => {
      cancelled = true
      disposeRow()
    }
  }, 'material: settings row')

  // 深浅切换只影响喂给 token 层的那一版色，不改变选中的皮肤。
  ctx.effect(() => {
    const observer = new MutationObserver(() => paint())
    const attach = () => {
      const options = { attributes: true, attributeFilter: ['data-ds-dark-theme'] }
      observer.observe(doc.documentElement, options)
      observer.observe(doc.body, options)
    }
    const cancel = whenBody(attach)
    return () => {
      cancel()
      observer.disconnect()
    }
  }, 'material: appearance observer')

  // 卸载必须把页面擦干净：属性、退路样式表、token 层、设置行都是我们的。
  ctx.effect(() => () => {
    disposeTokens()
    disposeTokens = () => {}
    doc.getElementById('dsh-theme-material/fallback')?.remove()
    html.removeAttribute('data-dsh-material')
    html.removeAttribute('data-dsh-material-mode')
    if (debugHandle !== null && window.__DSH_MATERIAL__ === debugHandle) {
      try {
        delete window.__DSH_MATERIAL__
      } catch (error) {
        window.__DSH_MATERIAL__ = undefined
      }
    }
  }, 'material: page cleanup')

  paint()

  // 恢复上次选中的皮肤时也要把外观摆正。
  syncAppearance()

  // 调试/自动化句柄。
  try {
    debugHandle = {
      skins: skins.map((skin) => ({ id: skin.id, name: skin.name, native: skin.native })),
      apply: select,
      current: () => activeId,
      rowRegistered: () => rowRegistered,
    }
    window.__DSH_MATERIAL__ = debugHandle
  } catch (error) {
    debugHandle = null
  }
}
