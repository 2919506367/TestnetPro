const CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LEN = 5;

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChar(): string {
  return CHARS[rand(0, CHARS.length - 1)];
}

export function generateCaptcha(): { text: string; svg: string } {
  const text = Array.from({ length: LEN }, () => randChar()).join("");
  const w = 160;
  const h = 56;
  const cx = w / 2;
  const cy = h / 2;

  const bgColor = `hsl(${rand(200, 260)}, ${rand(15, 30)}%, ${rand(8, 14)}%)`;
  const fgBase = rand(200, 260);

  let chars = "";
  for (let i = 0; i < LEN; i++) {
    const x = 18 + i * 28 + rand(-4, 4);
    const y = 34 + rand(-6, 6);
    const rot = rand(-20, 20);
    const hue = (fgBase + rand(-20, 20)) % 360;
    const sat = rand(15, 30);
    const lit = rand(45, 65);
    chars += `<text x="${x}" y="${y}" transform="rotate(${rot},${x},${y})" fill="hsl(${hue},${sat}%,${lit}%)" font-family="monospace" font-size="${rand(24, 30)}" font-weight="bold">${text[i]}</text>`;
  }

  let noise = "";
  for (let i = 0; i < 8; i++) {
    const x1 = rand(0, w);
    const y1 = rand(0, h);
    const x2 = x1 + rand(-40, 40);
    const y2 = y1 + rand(-15, 15);
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="hsl(${rand(200,260)},20%,${rand(25,40)}%)" stroke-width="${rand(1,2)}" opacity="0.3" />`;
  }
  for (let i = 0; i < 30; i++) {
    noise += `<circle cx="${rand(0, w)}" cy="${rand(0, h)}" r="${rand(1, 2)}" fill="hsl(${rand(200,260)},20%,${rand(30,50)}%)" opacity="0.4" />`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bgColor}" rx="8" />
  ${noise}
  ${chars}
</svg>`;

  return { text, svg };
}

const codeStore = new Map<string, { text: string; expires: number }>();
const CAPTCHA_TTL = 120_000;

export function setCaptcha(token: string, text: string) {
  codeStore.set(token, { text, expires: Date.now() + CAPTCHA_TTL });
  const now = Date.now();
  for (const [k, v] of codeStore) {
    if (now > v.expires) codeStore.delete(k);
  }
}

export function verifyCaptcha(token: string, input: string): boolean {
  const entry = codeStore.get(token);
  if (!entry || Date.now() > entry.expires) {
    codeStore.delete(token);
    return false;
  }
  codeStore.delete(token);
  const ok = input.toUpperCase() === entry.text.toUpperCase();
  return ok;
}
