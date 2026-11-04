/**
 * 「旧版本对照」：确认这套检查真的会发现问题。
 *
 * 做法：拿修复前的产物（test/fixtures/client.buggy.js，0.2.1 那份会自激的包）
 * 去跑 scripts/smoke.mjs，**必须失败**。如果它居然通过了，说明那条
 * "无自激" 的断言根本没打在真实路径上，测试等于摆设。
 *
 * 用法：npm run test:red
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = join(root, 'test', 'fixtures', 'client.buggy.js')

if (!existsSync(fixture)) {
  console.error(`缺少用来对照的旧版本文件：${fixture}`)
  console.error('它是 0.2.1 的 client.js 副本（会自激），用来确认这套检查确实会报错。')
  process.exit(2)
}

const result = spawnSync(process.execPath, [join(root, 'scripts', 'smoke.mjs')], {
  env: { ...process.env, DSH_THEME_CLIENT: fixture },
  encoding: 'utf8',
})

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

if (result.status === 0) {
  console.error('旧版本对照失败：修复前的产物竟然通过了主要流程检查，说明"不会重复注册"这条检查其实没生效。')
  console.error(output.trim())
  process.exit(1)
}

const hitLoopSignal = /自激|overrideTokens 被调用|mutation 通知/.test(output)
if (!hitLoopSignal) {
  console.error('旧版本对照失败：产物虽然失败了，但失败原因不是自激，对照用的旧版本或检查本身可能有问题。')
  console.error(output.trim())
  process.exit(1)
}

console.log('旧版本对照通过：修复前的产物如预期报自激，说明这套检查确实能发现这个问题。')
