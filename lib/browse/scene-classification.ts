/* ── Scene/Season classification for "场景时令" browse mode ── */

export type SceneCategory = {
  tag: string;
  label: string;
  dimension: string;
  matchTags: string[];
  keywords: string[];
};

export const SCENE_CATEGORIES: readonly SceneCategory[] = [
  // 1. 时间节律与日常作息
  {
    tag: "morning",
    label: "清晨唤醒",
    dimension: "时间节律",
    matchTags: [],
    keywords: ["晓", "晨", "朝", "曙", "啼鸟", "啼莺"],
  },
  {
    tag: "meal",
    label: "用餐惜物",
    dimension: "时间节律",
    matchTags: ["悯农"],
    keywords: ["盘中餐", "锄禾", "粟", "麦穗", "粒粒"],
  },
  {
    tag: "sunset",
    label: "日暮傍晚",
    dimension: "时间节律",
    matchTags: [],
    keywords: ["夕阳", "黄昏", "日落", "日晚", "日斜", "暮色", "残阳"],
  },
  {
    tag: "night",
    label: "睡前星空",
    dimension: "时间节律",
    matchTags: ["月亮", "月夜"],
    keywords: ["月明", "月下", "明月", "星河", "银河", "牵牛", "织女", "繁星"],
  },

  // 2. 自然气象与四季流转
  {
    tag: "weather",
    label: "风雨雷电",
    dimension: "四季气象",
    matchTags: ["写雨", "雨", "写风", "风", "风雨"],
    keywords: ["雷", "暴雨", "霖", "潦水", "风急"],
  },
  {
    tag: "spring",
    label: "春之寻青",
    dimension: "四季气象",
    matchTags: ["春天", "春", "惜春"],
    keywords: ["春", "柳", "桃花", "杏花", "燕", "莺", "芳草"],
  },
  {
    tag: "summer",
    label: "夏之玩水",
    dimension: "四季气象",
    matchTags: ["夏天"],
    keywords: ["荷", "莲", "蛙", "蝉", "池上", "采莲", "小娃", "暑", "乘凉"],
  },
  {
    tag: "autumn",
    label: "秋之落叶",
    dimension: "四季气象",
    matchTags: ["秋天", "秋", "秋雨"],
    keywords: ["秋", "枫", "菊", "桂", "落叶", "萧萧", "霜"],
  },
  {
    tag: "winter",
    label: "冬之初雪",
    dimension: "四季气象",
    matchTags: ["冬天", "冬", "写雪", "雪"],
    keywords: ["冬", "雪", "寒江", "冰", "凌寒", "天欲雪"],
  },

  // 3. 动物与微观世界观察
  {
    tag: "birds",
    label: "飞禽家禽",
    dimension: "动物微观",
    matchTags: ["写鸟", "鸟"],
    keywords: ["鹅", "鹤", "雁", "鹭", "鹂", "鸥", "鹰", "杜鹃", "布谷", "鹧鸪", "鸠"],
  },
  {
    tag: "insects",
    label: "昆虫微观",
    dimension: "动物微观",
    matchTags: [],
    keywords: ["蝉", "蝴蝶", "蝶", "萤火", "流萤", "蚂蚁", "蜂", "蚕", "纺织娘"],
  },

  // 4. 身体活动与空间探索
  {
    tag: "climb",
    label: "登高望远",
    dimension: "身体空间",
    matchTags: ["登高", "登楼"],
    keywords: ["登临", "高楼", "层楼", "望远", "穷千里", "一览"],
  },
  {
    tag: "travel",
    label: "舟车出行",
    dimension: "身体空间",
    matchTags: ["羁旅", "渡江"],
    keywords: ["轻舟", "孤帆", "行舟", "客船", "远行", "万里船", "猿啼", "万重山", "远上"],
  },
  {
    tag: "seek",
    label: "寻访隐逸",
    dimension: "身体空间",
    matchTags: ["寻访", "归隐", "隐逸", "隐士"],
    keywords: ["采药", "不遇", "茅檐", "松下", "柴门", "空山", "山中"],
  },

  // 5. 社交关系与节假日
  {
    tag: "farewell",
    label: "友谊告别",
    dimension: "社交节日",
    matchTags: ["送别", "离别", "惜别", "赠别", "友情", "友人"],
    keywords: ["赠", "故人", "知己", "相送", "别离", "挥手", "桃花潭"],
  },
  {
    tag: "missing",
    label: "思亲怀乡",
    dimension: "社交节日",
    matchTags: ["思乡", "思归", "思亲", "怀念", "怀人", "相思"],
    keywords: ["故乡", "异乡", "异客", "佳节倍思", "归期", "乡音", "乡愁"],
  },
  {
    tag: "festival",
    label: "节日民俗",
    dimension: "社交节日",
    matchTags: ["中秋", "中秋节", "春节", "清明", "寒食节", "重阳节", "七夕", "节日"],
    keywords: ["除夕", "元宵", "端午", "重阳", "中秋节", "清明节", "七夕", "爆竹", "菊花酒", "粽子"],
  },
] as const;

/**
 * Classify a poem into scene/season categories.
 * Returns an array of matching category tags (can be multiple).
 */
export function classifyByScene(
  tags: string[],
  title: string,
  lines: string[],
): string[] {
  const matched: string[] = [];
  const content = [...lines, title].join("");

  for (const cat of SCENE_CATEGORIES) {
    // Tag-based match (highest priority)
    if (cat.matchTags.length > 0 && tags.some((t) => cat.matchTags.includes(t))) {
      matched.push(cat.tag);
      continue;
    }

    // Keyword match on title + lines
    if (cat.keywords.some((kw) => content.includes(kw) || title.includes(kw))) {
      matched.push(cat.tag);
    }
  }

  return matched;
}

/** Get the label for a scene category tag */
export function getSceneLabel(tag: string): string {
  return SCENE_CATEGORIES.find((c) => c.tag === tag)?.label ?? tag;
}

// ── Dimension groupings for browse display ──
export type SceneDimension = {
  tag: string;
  label: string;
  subcategories: readonly SceneCategory[];
};

export const SCENE_DIMENSIONS: readonly SceneDimension[] = [
  {
    tag: "time",
    label: "时间节律",
    subcategories: SCENE_CATEGORIES.filter((c) => c.dimension === "时间节律"),
  },
  {
    tag: "season",
    label: "四季气象",
    subcategories: SCENE_CATEGORIES.filter((c) => c.dimension === "四季气象"),
  },
  {
    tag: "nature",
    label: "动物微观",
    subcategories: SCENE_CATEGORIES.filter((c) => c.dimension === "动物微观"),
  },
  {
    tag: "space",
    label: "身体空间",
    subcategories: SCENE_CATEGORIES.filter((c) => c.dimension === "身体空间"),
  },
  {
    tag: "social",
    label: "社交节日",
    subcategories: SCENE_CATEGORIES.filter((c) => c.dimension === "社交节日"),
  },
];
