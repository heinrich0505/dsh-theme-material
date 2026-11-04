/**
 * 设置页「主题」行的色卡样式。
 *
 * 单独成模块的理由：运行时（注入到页面）和预览生成器（scripts/preview-row.mjs）
 * 必须用同一份样式，否则"预览好看、真机另一回事"。
 *
 * 为什么用类名而不是内联样式：只有 CSS 网格才做得到"按面板宽度等宽铺满、
 * 窄窗口自动减列"。内联样式没有媒体查询，也没法写 `:hover`。
 * 每个色卡自己的颜色（预览底色、强调色方块）仍然内联 —— 那是数据不是样式。
 *
 * 所有类名带 `dsh-material-` 前缀，避免和外壳的样式撞名。
 */
export const ROW_CSS = `
.dsh-material-skins {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
}
.dsh-material-skins__card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 5px;
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}
.dsh-material-skins__card:hover {
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
}
.dsh-material-skins__card[aria-pressed='true'] {
  border-color: var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-state-business-primary);
  font-weight: 500;
}
.dsh-material-skins__preview {
  display: block;
  position: relative;
  height: 36px;
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}
.dsh-material-skins__dot {
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
.dsh-material-skins__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`
