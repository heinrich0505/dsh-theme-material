/**
 * 「设置 → 通用」里的一行：主题。
 *
 * 为什么在这里而不是界面上悬浮一个控件：DSH 的 settings 插槽契约
 * （`settings.general.item`）本来就是给"某个偏好设置一行"准备的，
 * 官方的「外观」行用的就是同一个插槽。放这儿不用抢屏幕、不用管位置，
 * 也不会挡住内容。
 *
 * 排版刻意对齐外壳自己的行规范（取自 ui-settings-general / ui-theme 的 CSS）：
 * 行 `padding:16px 0` + `border-bottom:.5px solid border-l2`，
 * 标题 14px/400/22px、label-primary，描述 12px/18px、label-tertiary。
 *
 * 色卡走 CSS 类（见 runtime 里注入的 `.dsh-material-skins*`），不用内联样式：
 * 只有网格才做得到"按面板宽度等宽铺满、窄了自动换列"，内联样式没有媒体查询。
 * 每个色卡自己的颜色（预览底色、强调色小方块）仍然是内联的——那是数据。
 *
 * 组件是 React 函数组件：React 与 jsx runtime 由外壳的模块加载器提供
 * （`require('react')` / `require('react/jsx-runtime')`），所以本包不需要
 * 构建工具，也就不需要在这里引入 JSX 编译。
 */

/** 与外壳设置行一致的排版常量。 */
const ROW = {
  padding: '16px 0',
  borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
}
const TITLE = {
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '22px',
}
const DESC = {
  marginTop: 4,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 12,
  lineHeight: '18px',
}

/**
 * 造一个设置行组件。
 *
 * @param {object} React `require('react')`
 * @param {{ jsx: Function, jsxs: Function }} runtime `require('react/jsx-runtime')`
 * @param {{ skins: object[], currentId: () => string, select: (id: string) => void, subscribe: (fn: Function) => Function }} deps
 * @returns {Function} React 组件
 */
export function createSettingsRow(React, runtime, deps) {
  const { jsx, jsxs } = runtime
  const { useState, useEffect } = React

  /** 一张色卡：预览块 + 名字；选中态由 CSS 的 [aria-pressed] 决定。 */
  const card = (skin) => {
    const palette = skin.native === 'light' ? skin.light : skin.dark
    return jsxs('button', {
      type: 'button',
      key: skin.id,
      className: 'dsh-material-skins__card',
      'aria-pressed': deps.currentId() === skin.id,
      title: `${skin.name.zh} · ${skin.name.en}`,
      onClick: () => deps.select(skin.id),
      children: [
        jsx('span', {
          'aria-hidden': 'true',
          className: 'dsh-material-skins__preview',
          style: { background: palette.bg },
          children: jsx('span', {
            className: 'dsh-material-skins__dot',
            style: { background: palette.accent },
          }),
        }),
        jsx('span', {
          className: 'dsh-material-skins__name',
          children: skin.name.zh,
        }),
      ],
    })
  }

  /**
   * @returns {object} React 元素树
   */
  return function MaterialThemeRow() {
    // 选择变化时重渲染：皮肤由本插件持有，不走外壳的 settings store。
    const [, setRevision] = useState(0)
    useEffect(() => deps.subscribe(() => setRevision((value) => value + 1)), [])

    return jsxs('div', {
      style: {
        ...ROW,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 14,
        lineHeight: '22px',
      },
      children: [
        jsxs('div', {
          children: [
            jsx('div', { style: TITLE, children: '主题' }),
            jsx('div', {
              style: DESC,
              children: '深色主题会把「外观」一并切到深色，浅色主题切回浅色。',
            }),
          ],
        }),
        jsx('div', {
          role: 'group',
          'aria-label': '主题',
          className: 'dsh-material-skins',
          children: deps.skins.map(card),
        }),
      ],
    })
  }
}
