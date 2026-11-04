/**
 * 主要流程检查：把生成的 client.js 真跑一遍。
 *
 * 验的是外壳与用户真正会在意的事：
 *   1. `window.__ModuleLoader__.load({ id, factory })` 的契约对得上；
 *   2. factory 返回 `{ name, inject, apply }`，`inject` 为空（否则会卡住外壳注入链）；
 *   3. 每种情况都把 126 个 token 以 `{ light, dark }` 一对字符串交出去；
 *   4. **不能自激**：外壳 presenter 的 `body.setAttribute('data-ds-dark-theme','')`
 *      即使值没变也会投递 mutation 记录；插件若因此在每次重绘时重新注册 token
 *      就会死循环（0.2.1 真实事故：单核 100%、内存 15GB）；
 *   5. **外观跟随皮肤**：选深色皮肤切深色，选浅色皮肤切浅色；拿不到 setTheme 时
 *      退化为"两侧同值"；
 *   6. **设置页那一行**：按官方插槽注册（`settings.general.item`），渲染色卡，
 *      点一张就换肤；
 *   7. Alt+K 轮换；
 *   8. 卸载清理：属性、样式表、token 层、设置行全部撤掉。
 *
 * 环境变量 DSH_THEME_CLIENT 可指向别的产物（用于验证本测试确实能报错）。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundlePath = process.env.DSH_THEME_CLIENT ?? join(root, 'client.js')
const source = readFileSync(bundlePath, 'utf8')

const failures = []
const ok = (condition, message) => {
  if (!condition) failures.push(message)
}

const VIEWPORT = { width: 1280, height: 800 }
/** mutation 通知预算：超过它说明插件在自激。 */
const NOTIFY_BUDGET = 500

const makeStyle = () => ({ setProperty() {}, removeProperty() {}, getPropertyValue: () => '' })

/**
 * 搭一个独立沙箱跑一遍 client.js。
 * @param {{ label: string, withSetTheme: boolean }} config
 */
function createHarness(config) {
  const state = {
    captured: null,
    disposed: 0,
    calls: [],
    overridden: 0,
    applied: 0,
    notify: 0,
    loopDetected: false,
    registered: [],
    unregistered: [],
    keyHandlers: [],
  }

  // ---- 极简 MutationObserver ----
  const observers = []
  class MutationObserverStub {
    constructor(callback) {
      this.callback = callback
      this.targets = new Set()
      this.filter = null
      observers.push(this)
    }
    observe(target, options) {
      this.targets.add(target)
      if (options?.attributeFilter) this.filter = options.attributeFilter
    }
    disconnect() {
      this.targets.clear()
    }
  }

  /** 真实语义：setAttribute 写同样的值也会投递 mutation 记录。 */
  const notifyAttribute = (target, name) => {
    for (const observer of observers) {
      if (!observer.targets.has(target)) continue
      if (observer.filter !== null && !observer.filter.includes(name)) continue
      if (state.notify >= NOTIFY_BUDGET) {
        state.loopDetected = true
        continue
      }
      state.notify += 1
      observer.callback([{ type: 'attributes', attributeName: name, target }])
    }
  }

  const makeElement = (tag = 'div') => ({
    tagName: String(tag).toUpperCase(),
    id: '',
    className: '',
    title: '',
    textContent: '',
    hidden: false,
    dataset: {},
    style: makeStyle(),
    children: [],
    _attrs: new Map(),
    _listeners: new Map(),
    setAttribute(name, value) {
      this._attrs.set(name, String(value))
      notifyAttribute(this, name)
    },
    getAttribute(name) {
      return this._attrs.has(name) ? this._attrs.get(name) : null
    },
    hasAttribute(name) {
      return this._attrs.has(name)
    },
    removeAttribute(name) {
      const existed = this._attrs.delete(name)
      if (existed) notifyAttribute(this, name)
    },
    addEventListener(type, handler) {
      this._listeners.set(type, handler)
    },
    removeEventListener(type) {
      this._listeners.delete(type)
    },
    append(...nodes) {
      this.children.push(...nodes)
    },
    remove() {
      this.removed = true
    },
    focus() {},
    querySelector() {
      return makeElement('span')
    },
    attachShadow() {
      const shadow = makeElement('#shadow-root')
      shadow.attachShadow = () => shadow
      return shadow
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 32, right: 100, bottom: 32 }
    },
  })

  const html = makeElement('html')
  const body = makeElement('body')
  const head = makeElement('head')
  const created = []

  const document = {
    documentElement: html,
    body,
    head,
    createElement(tag) {
      const element = makeElement(tag)
      created.push(element)
      return element
    },
    getElementById(id) {
      return created.find((element) => element.id === id && !element.removed) ?? null
    },
    addEventListener(type, handler) {
      if (type === 'keydown') state.keyHandlers.push(handler)
    },
    removeEventListener(type, handler) {
      if (type === 'keydown') {
        const index = state.keyHandlers.indexOf(handler)
        if (index >= 0) state.keyHandlers.splice(index, 1)
      }
    },
  }

  const store = new Map()
  const windowStub = {
    innerWidth: VIEWPORT.width,
    innerHeight: VIEWPORT.height,
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    addEventListener() {},
    removeEventListener() {},
    document,
    MutationObserver: MutationObserverStub,
  }

  let loaded = null
  windowStub.__ModuleLoader__ = {
    load(spec) {
      loaded = spec
    },
  }

  // ---- 模拟 ctx.theme 与 ui-layout 的 presenter ----
  let preference = 'system'
  const systemDark = false
  const overrides = new Map()
  const subscribers = []

  const colorScheme = () => {
    if (preference === 'dark') return 'dark'
    if (preference === 'light') return 'light'
    return systemDark ? 'dark' : 'light'
  }

  const buildSnapshot = () => {
    const tokens = {}
    for (const layer of overrides.values()) {
      for (const [name, pair] of Object.entries(layer.tokens)) {
        tokens[name] = colorScheme() === 'dark' ? pair.dark : pair.light
      }
    }
    return { preference, active: { colorScheme: colorScheme(), tokens } }
  }

  const presenter = (snapshot) => {
    state.applied += 1
    const scheme = snapshot.active.colorScheme
    if (scheme === 'dark') body.setAttribute('data-ds-dark-theme', '')
    else body.removeAttribute('data-ds-dark-theme')
    for (const [name, value] of Object.entries(snapshot.active.tokens)) body.style.setProperty(name, value)
  }
  subscribers.push(presenter)

  const publish = () => {
    const snapshot = buildSnapshot()
    for (const fn of subscribers) fn(snapshot)
  }

  const themeService = {
    overrideTokens(source, layer) {
      state.overridden += 1
      state.captured = layer
      overrides.set(source, { tokens: layer })
      publish()
      return () => {
        overrides.delete(source)
        state.disposed += 1
        publish()
      }
    },
  }
  if (config.withSetTheme) {
    themeService.setTheme = (id) => {
      state.calls.push(id)
      preference = id
      publish()
    }
  }

  // ---- 模拟 slots 服务（设置页插槽）----
  const slots = {
    register(options, component) {
      state.registered.push({ options, component })
      return () => state.unregistered.push(options.id)
    },
    inject(name, register) {
      const off = register()
      return () => {
        if (typeof off === 'function') off()
      }
    },
  }

  const services = { theme: themeService, slots }

  // ---- 模拟 react / react/jsx-runtime（外壳通过 require 提供）----
  const makeNode = (type, props) => ({ type, props: props ?? {} })
  const jsxRuntime = {
    jsx: (type, props) => makeNode(type, props),
    jsxs: (type, props) => makeNode(type, props),
    Fragment: 'Fragment',
  }
  const reactStub = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: (fn) => {
      const cleanup = fn()
      return cleanup
    },
  }
  const moduleRequire = (name) => {
    if (name === 'react') return reactStub
    if (name === 'react/jsx-runtime') return jsxRuntime
    throw new Error(`unexpected require: ${name}`)
  }

  const cleanups = []
  const ctx = {
    get: (name) => services[name],
    effect(fn) {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
      return () => cleanup?.()
    },
  }

  const sandbox = {
    window: windowStub,
    document,
    MutationObserver: MutationObserverStub,
    console,
    setTimeout,
    JSON,
  }
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })

  ok(loaded !== null, `[${config.label}] client.js 没有调用 window.__ModuleLoader__.load`)
  ok(loaded?.id === 'dsh-theme-material', `[${config.label}] load 的 id 不对：${loaded?.id}`)

  const mod = loaded.factory(moduleRequire)
  ok(mod?.name === 'themeMaterial', `[${config.label}] 插件名不对：${mod?.name}`)
  ok(Array.isArray(mod?.inject) && mod.inject.length === 0, `[${config.label}] inject 必须是空数组`)
  ok(typeof mod?.apply === 'function', `[${config.label}] apply 不是函数`)

  mod.apply(ctx)

  return { label: config.label, mod, windowStub, document, body, html, created, state, cleanups, store }
}

/** 校验一份 token 层：126 个键，每个值都是成对的非空字符串。 */
function checkLayer(harness, label) {
  const captured = harness.state.captured
  ok(captured !== null, `${harness.label}/${label}：没有调用 overrideTokens`)
  if (captured === null) return
  const names = Object.keys(captured)
  ok(names.length === 126, `${harness.label}/${label}：token 数是 ${names.length}，应为 126`)
  for (const [name, pair] of Object.entries(captured)) {
    if (pair === null || typeof pair !== 'object' || typeof pair === 'string') {
      failures.push(`${harness.label}/${label}：${name} 不是 { light, dark } 对象`)
      continue
    }
    if (typeof pair.light !== 'string' || pair.light === '') {
      failures.push(`${harness.label}/${label}：${name}.light 不合法`)
    }
    if (typeof pair.dark !== 'string' || pair.dark === '') {
      failures.push(`${harness.label}/${label}：${name}.dark 不合法`)
    }
  }
}

/** 遍历 jsx 树找节点。 */
const walk = (node, visit) => {
  if (node === null || typeof node !== 'object') return
  visit(node)
  const children = node.props?.children
  const list = Array.isArray(children) ? children.flat(Infinity) : children === undefined ? [] : [children]
  for (const child of list) walk(child, visit)
}

// ============================================================
// 场景 A：外壳提供 setTheme + slots + react
// ============================================================
const A = createHarness({ label: 'A', withSetTheme: true })
checkLayer(A, '挂载')

// ---- 死循环那条检查 ----
ok(!A.state.loopDetected, `A：检测到自激（mutation 通知超过 ${NOTIFY_BUDGET} 次）`)
ok(A.state.overridden <= 2, `A：overrideTokens 被调用 ${A.state.overridden} 次，挂载阶段应 <= 2（自激信号）`)
ok(A.state.notify <= 4, `A：body 属性 mutation 通知 ${A.state.notify} 次，应 <= 4`)

ok(A.html.getAttribute('data-dsh-material') === 'palenight', `A：默认皮肤不对：${A.html.getAttribute('data-dsh-material')}`)
ok(A.created.some((element) => element.tagName === 'STYLE' && element.id), 'A：没有注入氛围样式表')
ok(A.state.calls.includes('dark'), `A：挂载时没有把外观切到深色：${JSON.stringify(A.state.calls)}`)
ok(A.body.hasAttribute('data-ds-dark-theme'), 'A：挂载后 body 上没有深色标记')

// ---- 悬浮胶囊必须已经不存在 ----
ok(
  A.created.every((element) => element.id !== 'dsh-theme-material-rail'),
  'A：悬浮胶囊还在（应当已改成设置页入口）',
)

const handle = A.windowStub.__DSH_MATERIAL__
ok(handle !== undefined, 'A：没有暴露 __DSH_MATERIAL__ 调试句柄')
ok(handle?.skins.length === 8, `A：皮肤数不是 8，是 ${handle?.skins.length}`)
for (const id of ['palenight', 'ocean', 'darker', 'lighter', 'latte', 'vitesse', 'snazzy', 'github-gray']) {
  ok((handle?.skins ?? []).some((skin) => skin.id === id), `A：缺少皮肤 ${id}`)
}

// ---- 设置行注册 ----
ok(handle?.rowRegistered?.() === true, 'A：设置行没有注册成功')
ok(A.state.registered.length === 1, `A：设置行应当只注册一次，实际 ${A.state.registered.length} 次`)
const row = A.state.registered[0]
ok(row?.options?.name === 'settings.general.item', `A：插槽名不对：${row?.options?.name}`)
ok(row?.options?.id === 'material-theme', `A：设置行 id 不对：${row?.options?.id}`)
ok(row?.options?.order === 11, `A：设置行 order 应为 11（紧跟外观的 10），实际 ${row?.options?.order}`)
ok(typeof row?.component === 'function', 'A：设置行组件不是函数')

// 渲染它：应当出现 8 张色卡（旧产物没有设置行，这里整段跳过，让上面的断言去报错）
const tree = typeof row?.component === 'function' ? row.component({}) : null
const buttons = []
if (tree !== null) {
  walk(tree, (node) => {
    if (node.type === 'button') buttons.push(node)
  })
  ok(buttons.length === 8, `A：色卡数量应为 8，实际 ${buttons.length}`)

  // 行标题的文案：叫「主题」，不是「主题皮肤」
  const texts = []
  walk(tree, (node) => {
    if (typeof node.props?.children === 'string') texts.push(node.props.children)
  })
  ok(texts.includes('主题'), 'A：行标题应叫「主题」')
  ok(!texts.some((text) => text.includes('主题皮肤')), 'A：不应再出现「主题皮肤」字样')

  // 点一张色卡应当换肤
  const latteCard = buttons.find((button) => String(button.props.title ?? '').includes('Latte'))
  ok(latteCard !== undefined, 'A：没找到 Latte 的色卡')
  if (latteCard !== undefined) {
    latteCard.props.onClick()
    ok(handle.current() === 'latte', `A：点色卡后当前皮肤是 ${handle.current()}，应为 latte`)
    ok(A.html.getAttribute('data-dsh-material') === 'latte', 'A：点色卡后 html 属性没更新')
    ok(
      A.state.captured['--dsw-alias-bg-base'].light === '#EFF1F5',
      `A：latte 底色不对：${A.state.captured['--dsw-alias-bg-base'].light}`,
    )
    ok(!A.body.hasAttribute('data-ds-dark-theme'), 'A：选 latte（浅色皮肤）后 body 还挂着深色标记')
    ok(A.state.calls.includes('light'), `A：选 latte 没把外观切回浅色：${JSON.stringify(A.state.calls)}`)
  }
}

// ---- 换皮肤仍然只注册一次 token ----
const beforeCount = A.state.overridden
handle.apply('ocean')
ok(A.state.overridden === beforeCount + 1, `A：换皮肤应只注册一次 token，实际 ${A.state.overridden - beforeCount} 次`)
ok(A.state.captured['--dsw-alias-bg-base'].dark === '#0F111A', `A：ocean 深色底色不对：${A.state.captured['--dsw-alias-bg-base'].dark}`)
ok(A.store.get('dsh.theme-material.skin') === 'ocean', 'A：皮肤选择没写进 localStorage')
ok(!A.state.loopDetected, 'A：切换皮肤过程中出现自激')

// ---- Alt+K 已移除：不能再注册任何键盘监听 ----
ok(A.state.keyHandlers.length === 0, `A：仍注册了 ${A.state.keyHandlers.length} 个 keydown 监听（Alt+K 应当已移除）`)

// ---- 卸载清理 ----
const disposedBefore = A.state.disposed
for (const cleanup of A.cleanups) cleanup()
ok(A.html.getAttribute('data-dsh-material') === null, 'A：卸载后 data-dsh-material 还在')
ok(A.html.getAttribute('data-dsh-material-mode') === null, 'A：卸载后 data-dsh-material-mode 还在')
ok(A.state.disposed === disposedBefore + 1, `A：卸载后 token 层没释放（${disposedBefore} → ${A.state.disposed}）`)
ok(A.state.unregistered.includes('material-theme'), 'A：卸载后设置行没注销')

// ============================================================
// 场景 B：外壳没有 setTheme —— 必须退化成两侧同值
// ============================================================
const B = createHarness({ label: 'B', withSetTheme: false })
checkLayer(B, '挂载')

ok(!B.state.loopDetected, 'B：检测到自激（无 setTheme 路径）')
ok(
  B.state.captured['--dsw-alias-bg-base'].light === '#292D3E',
  `B：没有退化到两侧同值，light=${B.state.captured['--dsw-alias-bg-base'].light}`,
)
ok(
  B.state.captured['--dsw-alias-bg-base'].dark === '#292D3E',
  `B：深色侧不对：${B.state.captured['--dsw-alias-bg-base'].dark}`,
)
ok(B.state.calls.length === 0, 'B：没有 setTheme 却记到了调用')

B.windowStub.__DSH_MATERIAL__.apply('lighter')
ok(
  B.state.captured['--dsw-alias-bg-base'].light === '#FAFAFA',
  `B：素白浅色侧不对：${B.state.captured['--dsw-alias-bg-base'].light}`,
)
ok(
  B.state.captured['--dsw-alias-bg-base'].dark === '#212121',
  `B：匹配时不该继续强制，dark=${B.state.captured['--dsw-alias-bg-base'].dark}`,
)

if (failures.length > 0) {
  console.error(`主要流程检查未通过（${failures.length} 项）：`)
  for (const message of failures) console.error(`  - ${message}`)
  process.exit(1)
}
console.log(
  '主要流程检查通过：加载器契约 / factory 形状 / 126 token 成对 / 不会重复注册（按真实语义改的测试环境）/ ' +
    '外观跟随皮肤（含无 setTheme 退化）/ 设置行插槽注册与色卡点击 / 卸载清理',
)
