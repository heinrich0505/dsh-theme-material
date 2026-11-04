/**
 * dsh-theme-material 的宿主半边。
 *
 * 整个包其实都在浏览器侧：token 层与皮肤胶囊通过 package.json 里的
 * `dsh.client` 清单（client.js）下发，这个模块的存在只是为了让 bundle
 * 有一行可以挂载、启用、卸载。它不注册路由、不读文件、不留状态 ——
 * 皮肤是纯 CSS，所以没有 `webServer` 服务的外壳与有它时行为一致。
 */

/** cordis 插件名。 */
export const name = 'themeMaterial'

/**
 * 让这一行活到 bundle 卸下为止。
 *
 * 主题行为全在浏览器里；`apply` 存在只是因为 cordis 行必须导出它，
 * 返回空是因为没有东西要拆。
 * @param {import('@deepseek-ai/cordis').Context} _ctx 宿主上下文
 */
export function apply(_ctx) {}
