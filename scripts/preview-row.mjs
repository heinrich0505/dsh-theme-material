/**
 * 生成设置行预览页：同一份行样式、同一份皮肤数据，放在两个不同宽度的面板里，
 * 用来核对"左右布局"在宽窄窗口下是否都成立。
 *
 * 产出的 HTML 打开后由 CDN 上的真 React 渲染组件，所以它验的是真组件 + 真 CSS。
 *
 * 用法：node scripts/preview-row.mjs → survey/row-preview.html
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROW_CSS } from '../src/row-css.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 面板模拟用的 token 值（取素白那一组）
const TOKENS = `
    --dsw-alias-label-primary: #1b1b1f;
    --dsw-alias-label-secondary: #5b5b64;
    --dsw-alias-label-tertiary: #8a8a93;
    --dsw-alias-border-l1: rgba(0,0,0,.08);
    --dsw-alias-border-l2: rgba(0,0,0,.12);
    --dsw-alias-border-l3: rgba(0,0,0,.2);
    --dsw-alias-state-business-primary: #0071e3;
`

const shellRow = (title, desc, value) => `
  <div class="shellRow">
    <div>
      <div class="shellLabel">${title}</div>
      <div class="shellDesc">${desc}</div>
    </div>
    <div class="shellValue">${value}</div>
  </div>`

const panel = (id, title, width) => `
<div class="stage">
  <div class="stageLabel">${title}</div>
  <div class="panel" id="${id}" style="max-width: ${width}px">
    <div class="appearance">
      <div class="shellLabel">外观</div>
      <div class="cubes">
        <div class="cube">☀ 浅色</div>
        <div class="cube cubeOn">☾ 深色</div>
        <div class="cube">▢ 跟随系统</div>
      </div>
    </div>
    <div class="mount" data-mount="${id}"></div>
    ${shellRow('字号大小', '仅影响会话内容的字号', '14 px ⌄')}
    ${shellRow('工作步骤展示', '选择希望看到多少工具调用细节', '简洁 ⌄')}
  </div>
</div>`

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>设置行 · 宽窄两种宽度</title>
<style>
  :root {${TOKENS}    --dsw-alias-bg-base: #fff; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 22px 26px 40px; background: #f2f2f3; color: var(--dsw-alias-label-primary);
    font: 14px/22px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .stage { margin-bottom: 26px; }
  .stageLabel { margin: 0 0 8px 2px; font-size: 11.5px; color: #8a8a93; }
  .panel { background: #fff; border-radius: 12px; padding: 0 18px 4px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }

  /* 外壳自己的行样式（取自 ui-settings-general 编译产物），用作上下邻居 */
  .shellRow {
    display: flex; justify-content: space-between; align-items: center; gap: 24px;
    padding: 16px 0; border-bottom: .5px solid var(--dsw-alias-border-l2);
  }
  .shellLabel { color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 20px; }
  .shellDesc { color: var(--dsw-alias-label-secondary); margin-top: 4px; font-size: 12px; line-height: 18px; }
  .shellValue { color: var(--dsw-alias-label-secondary); font-size: 14px; }
  .appearance { display: flex; flex-direction: column; gap: 12px; padding: 16px 0; border-bottom: .5px solid var(--dsw-alias-border-l2); }
  .cubes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .cube {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 18px 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; font-size: 14px;
  }
  .cubeOn { border-color: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-state-business-primary); }

  /* 被测插件注入的那份样式，原样照搬 */
  ${ROW_CSS}
</style>
</head>
<body>
${panel('wide', '宽面板（约 900px，常见桌面窗口）', 900)}
${panel('narrow', '窄面板（约 520px，窗口被拖窄）', 520)}

<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script>
const captured = []
const themeService = { overrideTokens() { return () => {} }, setTheme() {} }
const slots = {
  register(options, component) { captured.push({ options, component }); return () => {} },
  inject(name, register) { register(); return () => {} },
}
const ctx = {
  get: (name) => (name === 'theme' ? themeService : name === 'slots' ? slots : undefined),
  effect(fn) { const c = fn(); return c },
}
const jsxRuntime = {
  jsx: (type, props) => React.createElement(type, props),
  jsxs: (type, props) => React.createElement(type, props),
  Fragment: React.Fragment,
}
let loaded = null
window.__ModuleLoader__ = { load(spec) { loaded = spec } }
localStorage.setItem('dsh.theme-material.skin', 'palenight')
</script>
<script src="../client.js"></script>
<script>
const mod = loaded.factory((name) => {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return jsxRuntime
  throw new Error('unexpected require: ' + name)
})
mod.apply(ctx)
const row = captured[0]
for (const mount of document.querySelectorAll('[data-mount]')) {
  if (!row) { mount.textContent = '设置行没有注册'; continue }
  ReactDOM.createRoot(mount).render(React.createElement(row.component, {}))
}
window.__ROW__ = row ? row.options.id + '@' + row.options.order : 'none'
</script>
</body>
</html>
`

const outDir = join(root, 'survey')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'row-preview.html'), html, 'utf8')
console.log('预览页：survey/row-preview.html')
