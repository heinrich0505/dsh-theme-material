/**
 * 皮肤表。每个皮肤 = 每种外观 10 个输入色，引擎据此推导 126 个 token。
 *
 * 输入色刻意保持小：加一套皮肤就是加一行，不是写一张新样式表。
 *
 * 色值来源：
 *   - Material 四套（夜紫/幽蓝/墨灰/素白）：Material Theme 官方 workbench 配色
 *   - 奶咖 Catppuccin Latte / 青苔 Vitesse Light / 霓光 Snazzy Light：各主题官方色值
 *     （经 npm 上 @shikijs/themes 的官方 TextMate 转换包读取）
 *   - 灰阶 GitHub Light Gray：本机 VS Code 扩展 hyzeta.vscode-theme-github-light
 *     里的 “Github Light Theme - Gray” 变体
 *
 * 关于"面"（plate）与"默认外观"：
 *   - 深色皮肤（夜紫/幽蓝/墨灰）的浅色侧统一是 Material Lighter，因为 Material
 *     只有一套浅色。这是 Material 的真实结构，不是遗漏。
 *   - 浅色皮肤的深色侧 = 套餐内的中性夜色 + 该主题自己的强调色（`nightOf`），
 *     这样深色模式下各套仍能区分，而不是六套长一个样。
 *
 * `accent2` 不是外壳 token：它只喂氛围（选区底色、完成态、滑轨色块），
 * 绝不进 `state-*` 语义槽。
 */

/** @typedef {{ bg: string, plate: string, ink: string, muted: string, accent: string, onAccent: string, danger: string, success: string, warn: string, accent2: string }} Palette */

/**
 * Material Lighter —— Material 唯一的浅色主题，也是三套深色皮肤的浅色侧。
 * 强调色用 Material 自己的 teal-600，而不是 Lighter 那个 #80CBC4：
 * 后者压在 #FAFAFA 上只有 1.8:1，当边框好看，当链接文字不可读。
 * @type {Palette}
 */
const LIGHTER = {
  bg: '#FAFAFA',
  plate: '#FFFFFF',
  ink: '#546E7A',
  muted: '#90A4AE',
  accent: '#26A69A',
  onAccent: '#00332E',
  danger: '#E53935',
  success: '#91B859',
  warn: '#E2931D',
  accent2: '#9C3EDA',
}

/** 三套 Material 深色共用的语法色相。 */
const MATERIAL_DARK_STATES = {
  accent: '#80CBC4',
  onAccent: '#06231F',
  danger: '#F07178',
  success: '#C3E88D',
  warn: '#FFCB6B',
  accent2: '#C792EA',
}

/** Material Darker —— 中性夜色，也是浅色皮肤的默认夜间底色。 */
const DARKER = {
  bg: '#212121',
  plate: '#2B2B2B',
  ink: '#EEFFFF',
  muted: '#545454',
  ...MATERIAL_DARK_STATES,
}

/**
 * 浅色皮肤的夜间翻译：套餐里的中性夜色 + 该主题自己的强调色。
 *
 * 为什么不直接复用 DARKER：四套浅色皮肤若都拿 DARKER 当深色侧，
 * 深色模式下它们会长得一模一样，胶囊里就成了四个没区别的选项。
 * 保留各自的色素、统一夜色，是最省事又还能分辨的做法。
 */
const nightOf = (accent, accent2) => ({ ...DARKER, accent, onAccent: '#0B0B0C', accent2 })

/** @type {ReadonlyArray<object>} */
export const SKINS = [
  {
    id: 'palenight',
    name: { zh: '夜紫', en: 'Palenight' },
    material: { zh: 'Material Theme · Palenight', en: 'Material Theme · Palenight' },
    native: 'dark',
    story: {
      zh: 'Material 最有名的一套：靛蓝灰底、青绿强调色，侧栏与正文同色，整体是平的。',
      en: 'The best-known Material variant: indigo-grey field, teal accent, sidebar matching the page — deliberately flat.',
    },
    swatch: ['#292D3E', '#80CBC4', '#C792EA'],
    signature: 'material',
    light: LIGHTER,
    dark: {
      bg: '#292D3E',
      plate: '#333747',
      ink: '#BABED8',
      muted: '#676E95',
      ...MATERIAL_DARK_STATES,
    },
  },
  {
    id: 'ocean',
    name: { zh: '幽蓝', en: 'Ocean' },
    material: { zh: 'Material Theme · Ocean', en: 'Material Theme · Ocean' },
    native: 'dark',
    story: {
      zh: '压到接近黑的深蓝，比夜紫冷、比墨灰蓝；状态色是屏幕上唯一还亮着的东西。',
      en: 'Deep water blue pushed almost to black — colder than Palenight, bluer than Darker.',
    },
    swatch: ['#0F111A', '#80CBC4', '#82AAFF'],
    signature: 'material',
    light: LIGHTER,
    dark: {
      bg: '#0F111A',
      plate: '#1A1C25',
      ink: '#BABED8',
      muted: '#464B5D',
      ...MATERIAL_DARK_STATES,
    },
  },
  {
    id: 'darker',
    name: { zh: '墨灰', en: 'Darker' },
    material: { zh: 'Material Theme · Darker', en: 'Material Theme · Darker' },
    native: 'dark',
    story: {
      zh: '中性纯灰，不带任何色相。最不抢眼的一套，适合把注意力全留给正文。',
      en: 'Neutral grey with no hue at all — the least distracting set, all attention left to the text.',
    },
    swatch: ['#212121', '#80CBC4', '#EEFFFF'],
    signature: 'material',
    light: LIGHTER,
    dark: DARKER,
  },
  {
    id: 'lighter',
    name: { zh: '素白', en: 'Lighter' },
    material: { zh: 'Material Theme · Lighter', en: 'Material Theme · Lighter' },
    native: 'light',
    story: {
      zh: 'Material 唯一的浅色主题：冷白纸面、蓝灰字、青绿强调。深色侧就是墨灰。',
      en: "Material's only light theme: cool white paper, blue-grey ink, teal accent. Its dark side is Darker.",
    },
    swatch: ['#FAFAFA', '#26A69A', '#9C3EDA'],
    signature: 'material',
    light: LIGHTER,
    dark: DARKER,
  },
  {
    id: 'latte',
    name: { zh: '奶咖', en: 'Catppuccin Latte' },
    material: { zh: 'Catppuccin · Latte', en: 'Catppuccin · Latte' },
    native: 'light',
    story: {
      zh: '灰紫底的拿铁：凉、软、不刺眼，紫色强调在浅色里少见。',
      en: 'Latte on a lilac-grey base — cool, soft, easy on the eyes; a purple accent is rare in light themes.',
    },
    swatch: ['#EFF1F5', '#8839EF', '#EA76CB'],
    signature: 'material',
    light: {
      bg: '#EFF1F5',
      // Catppuccin 的 input 底色 #CCD0DA 当卡片太重，改用同主题更浅的 mantle
      plate: '#E6E9EF',
      ink: '#4C4F69',
      muted: '#9CA0B0',
      accent: '#8839EF',
      onAccent: '#FFFFFF',
      danger: '#D20F39',
      success: '#40A02B',
      warn: '#DF8E1D',
      accent2: '#EA76CB',
    },
    dark: nightOf('#8839EF', '#EA76CB'),
  },
  {
    id: 'vitesse',
    name: { zh: '青苔', en: 'Vitesse Light' },
    material: { zh: 'Vitesse · Light', en: 'Vitesse Light' },
    native: 'light',
    story: {
      zh: '近乎纯白的极简底，只用一抹墨绿做强调；彩度全场最低。',
      en: 'An almost pure-white minimal field with a single moss-green accent — the lowest chroma of the set.',
    },
    swatch: ['#FFFFFF', '#1C6B48', '#A13865'],
    signature: 'material',
    light: {
      bg: '#FFFFFF',
      plate: '#F7F7F7',
      ink: '#393A34',
      muted: '#A0ADA0',
      accent: '#1C6B48',
      onAccent: '#FFFFFF',
      danger: '#AB5959',
      success: '#1E754F',
      warn: '#BDA437',
      accent2: '#A13865',
    },
    dark: nightOf('#1C6B48', '#A13865'),
  },
  {
    id: 'snazzy',
    name: { zh: '霓光', en: 'Snazzy Light' },
    material: { zh: 'Snazzy · Light', en: 'Snazzy Light' },
    native: 'light',
    story: {
      zh: '冷白底配亮青强调，安静里带一点电；原名 Snazzy Light。',
      en: 'Cool white with an electric cyan accent — quiet, with a spark.',
    },
    swatch: ['#FAFBFC', '#09A1ED', '#F767BB'],
    signature: 'material',
    light: {
      bg: '#FAFBFC',
      plate: '#F3F4F5',
      ink: '#565869',
      muted: '#ADB1C2',
      accent: '#09A1ED',
      onAccent: '#FFFFFF',
      danger: '#FF5C57',
      success: '#2DAE58',
      warn: '#CF9C00',
      accent2: '#F767BB',
    },
    dark: nightOf('#09A1ED', '#F767BB'),
  },
  {
    id: 'github-gray',
    name: { zh: '灰阶', en: 'GitHub Light Gray' },
    material: { zh: 'GitHub Light · Gray', en: 'GitHub Light Theme · Gray' },
    native: 'light',
    story: {
      zh: '整屏灰底 + 纯黑字的 GitHub 灰版。强调从原主题的红改成 GitHub 蓝——原红色和错误色几乎同色，压在一起就分不清哪个是报错。',
      en: 'GitHub Light in grey: a full grey canvas with pure black text. The accent is GitHub blue rather than the original red, which sits too close to the error colour to stay distinguishable.',
    },
    swatch: ['#F0F0F0', '#005CC5', '#6F42C1'],
    signature: 'material',
    light: {
      bg: '#F0F0F0',
      // 原主题整屏同色、没有层次信息；DSH 的卡片必须能浮起来，所以给白色
      plate: '#FFFFFF',
      ink: '#000000',
      muted: '#6A737D',
      accent: '#005CC5',
      onAccent: '#FFFFFF',
      danger: '#D73A49',
      success: '#28A745',
      warn: '#B08800',
      accent2: '#6F42C1',
    },
    dark: nightOf('#005CC5', '#6F42C1'),
  },
]

/** 按 id 取皮肤，找不到回落到第一套。 */
export function getSkin(id) {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0]
}

/** 没有本地选择时的默认皮肤。 */
export const DEFAULT_SKIN = 'palenight'
