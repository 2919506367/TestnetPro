const TIMEZONES: Record<string, string> = {
  "北京": "Asia/Shanghai", "上海": "Asia/Shanghai", "中国": "Asia/Shanghai",
  "东京": "Asia/Tokyo", "日本": "Asia/Tokyo",
  "纽约": "America/New_York", "华盛顿": "America/New_York", "美国东部": "America/New_York",
  "洛杉矶": "America/Los_Angeles", "旧金山": "America/Los_Angeles", "美国西部": "America/Los_Angeles",
  "伦敦": "Europe/London", "英国": "Europe/London",
  "巴黎": "Europe/Paris", "法国": "Europe/Paris",
  "新加坡": "Asia/Singapore",
  "首尔": "Asia/Seoul", "韩国": "Asia/Seoul",
  "UTC": "UTC", "格林威治": "UTC", "GMT": "UTC",
};

function findTimezone(query: string): string {
  for (const [name, tz] of Object.entries(TIMEZONES)) {
    if (query.includes(name)) return tz;
  }
  return "Asia/Shanghai";
}

function getWeekday(date: Date): string {
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return weekdays[date.getDay()];
}

export function handleTimeQuery(query: string): string {
  const tz = findTimezone(query);

  try {
    const now = new Date();

    const timeStr = new Intl.DateTimeFormat("zh-CN", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);

    const tzName = Object.entries(TIMEZONES).find(([,v]) => v === tz)?.[0] || "北京时间";

    if (/星期|周/.test(query)) return `今天是${getWeekday(now)}。`;

    return `当前${tzName}为${timeStr}`;
  } catch {
    const now = new Date();
    return `当前时间为${now.toLocaleString("zh-CN", { hour12: false })}`;
  }
}
