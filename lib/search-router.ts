export type QueryType = "time" | "news" | "web" | "normal";

const TIME_PATTERNS = [
  /现在几点/, /今天几号/, /今天星期几/, /现在时间/, /当前时间/,
  /北京时间/, /上海时间/, /东京时间/, /纽约时间/, /华盛顿时间/, /洛杉矶时间/,
  /伦敦时间/, /巴黎时间/, /新加坡时间/, /首尔时间/,
  /UTC时间/, /格林威治/, /时区/, /几点了/, /什么时间/,
  /星期几/, /周几/, /周.是几/,
];

const NEWS_PATTERNS = [
  /新闻/, /热点/, /热搜/, /今日发生/, /最近发生/, /最新消息/,
  /头条/, /今日新闻/, /热门事件/, /今天.*热点/, /最近.*热点/,
  /今天发生了/, /今天有什么/, /汇总.*新闻/, /整理.*新闻/,
  /近期.*新闻/, /今天.*大事/, /今天.*热门/,
];

const WEB_PATTERNS = [
  /最新/, /最近/, /今天/, /现在/, /今年/, /本月/,
  /行情/, /股价/, /股票/, /汇率/, /天气/, /预报/,
  /排名/, /排行榜/, /价格/, /多少钱/, /怎么买/,
  /哪里买/, /在哪里/, /官网/, /下载/, /版本/,
  /显卡/, /CPU/, /内存/, /硬盘/, /手机/, /笔记本/,
  /苹果/, /华为/, /小米/, /特斯拉/, /比亚迪/,
];

export function detectQueryType(query: string): QueryType {
  const q = query;

  for (const p of TIME_PATTERNS) if (p.test(q)) return "time";
  for (const p of NEWS_PATTERNS) if (p.test(q)) return "news";

  // Web patterns check FIRST — even short queries can be web
  for (const p of WEB_PATTERNS) if (p.test(q)) return "web";

  // Don't web-search for trivia / knowledge / definitions
  if (/^(什么是|解释|定义|含义|原理|概念|公式|定理|算法|代码|语法|函数|方法|教程|怎么学|如何学习|为什么|是谁|地点|位置|在哪里买|中文|英文|翻译|化学|物理|数学|历史|人物|朝代|事件|战争|著作|作者|推导|证明|计算)/.test(q)) {
    return "normal";
  }
  if (/^(请|帮我|给我|写|推荐|建议|分析|总结|归纳|评价|对比|比较)/.test(q)) {
    return "normal";
  }

  // Short questions → normal
  if (q.length < 8) return "normal";

  // Default heuristic: longer queries might need web
  if (q.length > 30) return "web";

  return "normal";
}
