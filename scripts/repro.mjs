/**
 * 用真 Chrome 跑 repro/shell.html，看 dsh-theme-material 会不会自激。
 *
 * 判定：
 *   - 页面在预算时间内返回 PROBE → 正常，打印各项计数
 *   - 无响应（渲染进程被同步循环占死）→ 复现成功，判定死循环
 *
 * 用法：node scripts/repro.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const page = pathToFileURL(join(root, 'repro', 'shell.html')).href

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]
const chrome = CHROME_CANDIDATES.find((path) => existsSync(path))
if (!chrome) {
  console.error('找不到 Chrome / Edge')
  process.exit(2)
}

const PORT = 9333
const profileDir = mkdtempSync(join(tmpdir(), 'dsh-material-repro-'))

const child = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-domain-reliability',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1280,800',
    page,
  ],
  { stdio: 'ignore', detached: false },
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 轮询 /json/list 找到页面目标。 */
async function findTarget() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await response.json()
      const found = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl)
      if (found) return found
    } catch (error) {
      /* 还没起来 */
    }
    await sleep(250)
  }
  return null
}

/** 发一条 CDP 命令，带超时。超时视为渲染进程被占死。 */
function cdp(ws, id, method, params, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timeout: true }), timeoutMs)
    const onMessage = (event) => {
      let message
      try {
        message = JSON.parse(event.data)
      } catch (error) {
        return
      }
      if (message.id !== id) return
      clearTimeout(timer)
      ws.removeEventListener('message', onMessage)
      resolve(message)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

const target = await findTarget()
if (target === null) {
  child.kill()
  console.error('没能连上 Chrome 调试端口')
  process.exit(2)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

// 等页面把 600ms 的观测窗口走完
await sleep(2500)

const result = await cdp(
  ws,
  1,
  'Runtime.evaluate',
  { expression: 'JSON.stringify(window.__PROBE__ || null)', returnByValue: true },
  6000,
)

let exitCode = 0
if (result.timeout) {
  console.error('【复现】页面无响应 —— 渲染进程被同步死循环占死。')
  exitCode = 1
} else {
  const probe = JSON.parse(result.result?.result?.value ?? 'null')
  if (probe === null) {
    console.error('【异常】页面没有 PROBE 对象')
    exitCode = 2
  } else {
    console.log('PROBE =', JSON.stringify(probe, null, 2))
    const hot = probe.overridden > 100 || probe.applied > 100 || probe.mutations > 100
    if (hot) {
      console.error(
        `【复现】自激：overrideTokens=${probe.overridden}，presenter.apply=${probe.applied}，body 属性变化=${probe.mutations}`,
      )
      exitCode = 1
    } else if (probe.errors.length > 0) {
      console.error('【异常】插件抛出：', probe.errors.join('\n'))
      exitCode = 3
    } else {
      console.log('【正常】无自激，计数在合理范围。')
    }
  }
}

ws.close()
child.kill()

// 清理临时 profile
try {
  const { rmSync } = await import('node:fs')
  rmSync(profileDir, { recursive: true, force: true })
} catch (error) {
  /* 目录被占用就留着 */
}

process.exit(exitCode)
