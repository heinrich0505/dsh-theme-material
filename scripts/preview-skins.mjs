/**
 * 用包里真实的皮肤数据渲染 DSH 界面预览（按 token 语义重建，不是真窗口截图）。
 *
 * 用法：
 *   node scripts/preview-skins.mjs                 # 默认预览浅色皮肤
 *   node scripts/preview-skins.mjs latte vitesse   # 指定皮肤 id
 * 产出 survey/skin-preview.html
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveSkin } from '../src/derive.mjs'
import { getSkin, SKINS } from '../src/skins.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_IDS = ['latte', 'vitesse', 'snazzy', 'github-gray']
const ids = process.argv.slice(2).filter((id) => SKINS.some((skin) => skin.id === id))
const targets = (ids.length > 0 ? ids : DEFAULT_IDS).map((id) => getSkin(id))

/** 每套皮肤渲染一张卡：浅色侧（浅色皮肤）或深色侧（深色皮肤）。 */
const card = (skin) => {
  const both = deriveSkin(skin)
  const mode = skin.native === 'light' ? 'light' : 'dark'
  const tokens = both[mode]
  const palette = skin[mode]
  const t = (name) => tokens[name]
  const darkText = mode === 'dark'

  // 截图用（BARE）时去掉标题行：README 里每张图上面已经有小标题，标题会重复
  const head = bare
    ? ''
    : `<div class="head">
    <div class="title"><b>${skin.name.zh}</b><span>${skin.name.en} · ${mode === 'light' ? '浅色' : '深色'}</span></div>
    <div class="meta">${skin.material.en}</div>
  </div>`

  return `
<section class="theme">
  ${head}
  <div class="swatches">
    ${[['底', palette.bg], ['面', palette.plate], ['正文', palette.ink], ['注释', palette.muted], ['强调', palette.accent], ['次色', palette.accent2]]
      .map(([label, color]) => `<span class="sw"><i style="background:${color}"></i><b>${label}</b><em>${color}</em></span>`)
      .join('')}
  </div>
  <div class="win" style="background:${palette.bg};color:${t('--dsw-alias-label-primary')};border-color:${t('--dsw-alias-border-l2')}">
    <aside style="background:${t('--dsw-specific-sidebar-fill')};border-right:1px solid ${t('--dsw-alias-border-l1')}">
      <div class="brand" style="color:${t('--dsw-alias-label-primary')}">HARNESS</div>
      <div class="nav on" style="background:${t('--dsw-specific-sidebar-nav-item-active')};color:${t('--dsw-specific-sidebar-nav-item-active-accent')};box-shadow:inset 2px 0 0 ${t('--dsw-specific-sidebar-nav-item-active-accent')}">新对话</div>
      <div class="nav" style="color:${t('--dsw-alias-label-secondary')}">历史记录</div>
      <div class="nav" style="color:${t('--dsw-alias-label-secondary')}">技能</div>
      <div class="nav" style="color:${t('--dsw-alias-label-caption')}">设置</div>
      <div class="railnote" style="color:${t('--dsw-alias-label-caption')}">设置 → 通用 → 主题</div>
    </aside>
    <main>
      <div class="topbar" style="border-bottom:1px solid ${t('--dsw-alias-border-l1')};color:${t('--dsw-alias-label-secondary')}">
        <span>会话 · ${skin.name.zh}</span>
        <span class="pill" style="background:${t('--dsw-alias-state-business-tertiary')};color:${t('--dsw-alias-state-business-primary')}">运行中</span>
      </div>
      <div class="msgs">
        <div class="user" style="background:${t('--dsw-specific-bubble')};color:${t('--dsw-alias-label-primary')}">这套配色看着怎么样？</div>
        <div class="ai" style="color:${t('--dsw-alias-label-primary')}">底 ${palette.bg}、面 ${palette.plate}，强调色取自 <a style="color:${t('--dsw-alias-link')}">${palette.accent}</a>。</div>
        <div class="tool" style="background:${t('--dsw-alias-bg-layer-2')};border:1px solid ${t('--dsw-alias-border-l2')}">
          <div class="tool-h" style="color:${t('--dsw-alias-label-secondary')}">编辑 <span style="color:${t('--dsw-alias-label-primary')}">README.md</span></div>
          <div class="tool-b">
            <span style="color:${t('--dsw-alias-file-diff-added-marker')}">+1</span>
            <span style="color:${t('--dsw-alias-file-diff-deleted-marker')}">−0</span>
            <span style="color:${t('--dsw-alias-label-caption')}">已应用</span>
          </div>
        </div>
        <pre style="background:${t('--dsw-alias-markdown-code-block')};border:1px solid ${t('--dsw-alias-border-l1')}"><span style="color:${t('--dsw-alias-state-business-primary')}">const</span> skin = <span style="color:${t('--dsw-alias-state-success-primary')}">'${skin.id}'</span>
<span style="color:${t('--dsw-alias-link')}">apply</span>(skin)  <span style="color:${t('--dsw-alias-label-caption')}">// 配色已生效</span></pre>
        <div class="acts">
          <button style="background:${t('--dsw-alias-button-primary-fill')};color:${t('--dsw-alias-label-primary-foreground')}">全部接受</button>
          <button class="ghost" style="color:${t('--dsw-alias-label-secondary')};border:1px solid ${t('--dsw-alias-border-l2')}">拒绝</button>
          <span class="badge" style="background:${t('--dsw-alias-state-success-tertiary')};color:${t('--dsw-alias-state-success-primary')}">成功</span>
          <span class="badge" style="background:${t('--dsw-alias-state-error-secondary')};color:${t('--dsw-alias-state-error-primary')}">错误</span>
          <span class="badge" style="background:${t('--dsw-alias-state-warn-tertiary')};color:${t('--dsw-alias-state-warn-primary')}">警告</span>
        </div>
      </div>
      <div class="composer" style="background:${t('--dsw-specific-input-major')};border:1px solid ${t('--dsw-alias-border-l3')}">
        <span style="color:${t('--dsw-alias-markdown-placeholder')}">输入消息…</span>
        <span class="send" style="background:${t('--dsw-alias-button-primary-fill')};color:${t('--dsw-alias-label-primary-foreground')}">↑</span>
      </div>
    </main>
  </div>
</section>`
}

const bare = process.env.BARE === '1' || process.argv.includes('--bare')

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>新增皮肤预览</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: ${bare ? '0' : '26px 24px 40px'}; background: ${bare ? '#fff' : '#eeeff1'}; color: #16161a;
    font: 13px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  h1 { margin: 0 0 18px; font-size: 18px; }
  .grid { display: ${bare ? 'block' : 'grid'}; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .theme { background: #fff; border: ${bare ? '0' : '1px solid rgba(0,0,0,.1)'}; border-radius: ${bare ? '0' : '12px'}; padding: 12px 13px 13px; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
  .title b { font-size: 14px; } .title span { margin-left: 7px; font-size: 11.5px; color: #74747d; }
  .meta { font-size: 10px; color: #8a8a93; }
  .swatches { display: flex; gap: 5px; margin-bottom: 10px; }
  .sw { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 9.5px; color: #6b6b74; }
  .sw i { display: block; width: 100%; height: 20px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); }
  .sw b { font-weight: 600; color: #3d3d45; } .sw em { font-style: normal; font-family: ui-monospace, Consolas, monospace; font-size: 9px; }
  .win { display: grid; grid-template-columns: 108px 1fr; border: 1px solid; border-radius: 10px; overflow: hidden; font-size: 11.5px; }
  aside { display: flex; flex-direction: column; gap: 1px; padding: 9px 7px; }
  .brand { font-size: 10px; font-weight: 700; letter-spacing: .09em; padding: 0 4px 8px; }
  .nav { padding: 5px 7px; border-radius: 5px; font-size: 11px; } .nav.on { font-weight: 600; }
  .railnote { margin-top: auto; padding: 8px 4px 0; font-size: 9.5px; }
  main { display: flex; flex-direction: column; min-width: 0; }
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 7px 11px; font-size: 10.5px; }
  .pill { padding: 2px 7px; border-radius: 999px; font-size: 9.5px; }
  .msgs { display: flex; flex-direction: column; gap: 8px; padding: 11px; }
  .user { align-self: flex-end; max-width: 80%; padding: 6px 10px; border-radius: 9px; }
  .ai { padding: 0 2px; } .ai a { text-decoration: underline; text-underline-offset: 2px; }
  .tool { border-radius: 7px; padding: 7px 9px; } .tool-h { font-size: 10.5px; margin-bottom: 3px; }
  .tool-b { display: flex; gap: 10px; font-size: 10.5px; font-family: ui-monospace, Consolas, monospace; }
  pre { margin: 0; padding: 8px 10px; border-radius: 7px; font-size: 10.5px; line-height: 1.65;
    font-family: ui-monospace, Consolas, monospace; overflow: hidden; }
  .acts { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
  .acts button { border: 0; border-radius: 6px; padding: 5px 11px; font: inherit; font-weight: 600; font-size: 10.5px; }
  .acts .ghost { background: transparent; font-weight: 500; }
  .badge { padding: 2px 7px; border-radius: 5px; font-size: 9.5px; }
  .composer { margin: 0 11px 11px; display: flex; align-items: center; justify-content: space-between;
    padding: 7px 9px; border-radius: 8px; }
  .send { width: 18px; height: 18px; border-radius: 5px; display: grid; place-items: center; font-size: 11px; }
</style></head>
<body>
${bare ? '' : '<h1>皮肤一览（按包内真实 token 渲染）</h1>'}
<div class="grid">
${targets.map(card).join('\n')}
</div>
</body></html>
`

const outDir = join(root, 'survey')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'skin-preview.html')
writeFileSync(outPath, html, 'utf8')
console.log(`预览页：${outPath}`)
console.log(`皮肤：${targets.map((skin) => skin.id).join(', ')}`)
