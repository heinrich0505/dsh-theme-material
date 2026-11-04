/**
 * 把候选浅色主题渲染成"上色之后的 DSH 界面预览"，配色条与界面放在同一张卡里，
 * 方便直观比较。
 *
 * 注意：这是**按 token 语义重建的界面**，不是从真实窗口截的图。
 * 它能准确表达颜色与层次关系，但不保证与你的构建逐像素一致。
 *
 * 用法：node scripts/survey-mockups.mjs  → 产出 survey/light-mockups.html
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collect, hex, ratio } from './lib/survey-data.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rows = await collect()

/** 一条浅色主题的界面预览卡。 */
const card = (row) => {
  const t = (name) => row.tokens[name]
  const p = row.palette
  const s = row.syntax

  const swatches = [
    ['底', p.bg],
    ['面', p.plate],
    ['正文', p.ink],
    ['注释', p.muted],
    ['强调', p.accent],
    ['次色', p.accent2],
  ]
    .map(
      ([label, color]) =>
        `<span class="sw"><i style="background:${color}"></i><b>${label}</b><em>${hex(color)}</em></span>`,
    )
    .join('')

  return `
<section class="theme">
  <div class="head">
    <div class="title"><b>${row.name}</b><span>${row.note}</span></div>
    <div class="meta">正文 ${ratio(row.metrics.body)} · 改动量 ${row.total}</div>
  </div>
  <div class="swatches">${swatches}</div>

  <div class="win" style="background:${p.bg};color:${t('--dsw-alias-label-primary')};border-color:${t('--dsw-alias-border-l2')}">
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
        <span>会话 · 浅色主题考察</span>
        <span class="pill" style="background:${t('--dsw-alias-state-business-tertiary')};color:${t('--dsw-alias-state-business-primary')}">运行中</span>
      </div>

      <div class="msgs">
        <div class="user" style="background:${t('--dsw-specific-bubble')};color:${t('--dsw-alias-label-primary')}">帮我把界面换成这套浅色主题</div>

        <div class="ai" style="color:${t('--dsw-alias-label-primary')}">
          已切换，强调色取自该主题的 <a style="color:${t('--dsw-alias-link')}">progressBar</a>；
          正文与注释按对比度门槛硬化。
        </div>

        <div class="tool" style="background:${t('--dsw-alias-bg-layer-2')};border:1px solid ${t('--dsw-alias-border-l2')}">
          <div class="tool-h" style="color:${t('--dsw-alias-label-secondary')}">编辑 <span style="color:${t('--dsw-alias-label-primary')}">src/skins.mjs</span></div>
          <div class="tool-b">
            <span style="color:${t('--dsw-alias-file-diff-added-marker')}">+12</span>
            <span style="color:${t('--dsw-alias-file-diff-deleted-marker')}">−3</span>
            <span style="color:${t('--dsw-alias-label-caption')}">已自动应用</span>
          </div>
        </div>

        <pre style="background:${t('--dsw-alias-markdown-code-block')};border:1px solid ${t('--dsw-alias-border-l1')}"><span style="color:${s.keyword}">const</span> skin <span style="color:${s.keyword}">=</span> <span style="color:${s.string}>'${row.id}'</span>
<span style="color:${s.fn}">apply</span>(<span style="color:${s.type}">skin</span>, <span style="color:${s.number}>126</span>)  <span style="color:${s.comment}">// 126 个 token</span></pre>

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

const cards = rows.filter((row) => !row.error).map(card).join('\n')

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>浅色主题 · 上色效果对比</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 26px 48px; background: #eeeff1; color: #16161a;
    font: 13px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  h1 { margin: 0 0 6px; font-size: 19px; }
  .lede { margin: 0 0 22px; max-width: 900px; color: #5a5a63; font-size: 12.5px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .theme { background: #fff; border: 1px solid rgba(0,0,0,.1); border-radius: 12px; padding: 12px 13px 13px;
    box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
  .title b { font-size: 14px; }
  .title span { margin-left: 7px; font-size: 11.5px; color: #74747d; }
  .meta { font-size: 10.5px; color: #74747d; white-space: nowrap; }
  .swatches { display: flex; gap: 5px; margin-bottom: 10px; }
  .sw { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-size: 9.5px; color: #6b6b74; }
  .sw i { display: block; width: 100%; height: 22px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.14); }
  .sw b { font-weight: 600; color: #3d3d45; }
  .sw em { font-style: normal; font-family: ui-monospace, Consolas, monospace; font-size: 9px; }

  .win { display: grid; grid-template-columns: 112px 1fr; border: 1px solid; border-radius: 10px;
    overflow: hidden; font-size: 11.5px; }
  aside { display: flex; flex-direction: column; gap: 1px; padding: 9px 7px; }
  .brand { font-size: 10.5px; font-weight: 700; letter-spacing: .09em; padding: 0 4px 8px; }
  .nav { padding: 5px 7px; border-radius: 5px; font-size: 11px; }
  .nav.on { font-weight: 600; }
  .railnote { margin-top: auto; padding: 8px 4px 0; font-size: 9.5px; }
  main { display: flex; flex-direction: column; min-width: 0; }
  .topbar { display: flex; align-items: center; justify-content: space-between;
    padding: 7px 11px; font-size: 10.5px; }
  .pill { padding: 2px 7px; border-radius: 999px; font-size: 9.5px; }
  .msgs { display: flex; flex-direction: column; gap: 8px; padding: 11px; }
  .user { align-self: flex-end; max-width: 78%; padding: 6px 10px; border-radius: 9px; font-size: 11.5px; }
  .ai { padding: 0 2px; font-size: 11.5px; }
  .ai a { text-decoration: underline; text-underline-offset: 2px; }
  .tool { border-radius: 7px; padding: 7px 9px; }
  .tool-h { font-size: 10.5px; margin-bottom: 3px; }
  .tool-b { display: flex; gap: 10px; font-size: 10.5px; font-family: ui-monospace, Consolas, monospace; }
  pre { margin: 0; padding: 8px 10px; border-radius: 7px; font-size: 10.5px; line-height: 1.65;
    font-family: ui-monospace, Consolas, monospace; overflow: hidden; }
  .acts { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
  .acts button { border: 0; border-radius: 6px; padding: 5px 11px; font: inherit; font-weight: 600; font-size: 10.5px; }
  .acts .ghost { background: transparent; font-weight: 500; }
  .badge { padding: 2px 7px; border-radius: 5px; font-size: 9.5px; }
  .composer { margin: 0 11px 11px; display: flex; align-items: center; justify-content: space-between;
    padding: 7px 9px; border-radius: 8px; font-size: 11px; }
  .send { width: 18px; height: 18px; border-radius: 5px; display: grid; place-items: center; font-size: 11px; }
</style>
</head>
<body>
<h1>浅色主题 · 上色效果对比</h1>
<p class="lede">
  每张卡上半是配色（底 / 面 / 正文 / 注释 / 强调 / 次色），下半是按本包 token 语义重建的 DSH 界面：
  侧栏、会话气泡、工具卡片、代码块（用该主题真实语法色）、主按钮与三态标签。
  这是颜色与层次的还原，不是从真实窗口截的图。
</p>
<div class="grid">
${cards}
</div>
</body>
</html>
`

const outDir = join(root, 'survey')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'light-mockups.html')
writeFileSync(outPath, html, 'utf8')
console.log(`上色效果对比页：${outPath}`)
console.log(`共 ${rows.filter((row) => !row.error).length} 套`)
