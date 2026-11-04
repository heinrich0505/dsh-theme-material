/**
 * 把 README.md 渲染成一张 GitHub 风格的长图，用来核对发出去的样子。
 *
 * 用法：
 *   node scripts/preview-readme.mjs
 * 产出 survey/readme-preview.html（再用无头 Chrome 截图）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('C:/Users/Trosky/.dsh/profiles/desktop/node_modules/')
const { marked } = await import('file:///C:/Users/Trosky/.dsh/profiles/desktop/node_modules/marked/lib/marked.esm.js')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const markdown = readFileSync(join(root, 'README.md'), 'utf8')
const body = marked.parse(markdown)

// 图片路径转成绝对路径，好让本地浏览器能打开
const html = body.replace(/src="(assets\/[^"]+)"/g, (_, p) => `src="file:///${root.replace(/\\/g, '/')}/${p}"`)

const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>README 预览</title>
<style>
  body { margin: 0; background: #f6f7f8; font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #1f2328; }
  .page { max-width: 860px; margin: 0 auto; background: #fff; padding: 40px 48px 56px; border: 1px solid #d0d7de; border-radius: 8px; margin-top: 24px; margin-bottom: 40px; }
  h1 { font-size: 32px; font-weight: 600; line-height: 1.25; padding-bottom: .3em; border-bottom: 1px solid #d8dee4; margin: 0 0 16px; }
  h2 { font-size: 24px; font-weight: 600; padding-bottom: .3em; border-bottom: 1px solid #d8dee4; margin: 32px 0 16px; }
  p { margin: 0 0 16px; }
  a { color: #0969da; text-decoration: none; }
  code { background: rgba(175,184,193,.2); padding: .2em .4em; border-radius: 6px; font-size: 85%; font-family: ui-monospace, Consolas, monospace; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; margin: 0 0 16px; }
  pre code { background: none; padding: 0; font-size: 85%; }
  table { border-collapse: collapse; margin: 0 0 16px; display: block; overflow: auto; }
  th, td { border: 1px solid #d0d7de; padding: 6px 13px; }
  th { background: #f6f8fa; font-weight: 600; }
  tr:nth-child(2n) td { background: #f6f8fa; }
  img { max-width: 100%; border: 1px solid #d0d7de; border-radius: 6px; }
  hr { height: 0; border: 0; border-top: 1px solid #d8dee4; margin: 24px 0; }
</style></head>
<body><div class="page">${html}</div></body></html>`

const outDir = join(root, 'survey')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'readme-preview.html')
writeFileSync(outPath, page, 'utf8')
console.log(`README 预览页：${outPath}`)
console.log(`正文 ${body.length} 字`)
void require
