/** Pure Design Engine helpers (no I/O, unit-tested). */
export const PALETTES: Record<string, { bg: string; accent: string; text: string; sub: string }> = {
  MIDNIGHT: { bg: "#0B0D12", accent: "#4F7CFF", text: "#F7F8FA", sub: "#A5ADBD" },
  VIOLET: { bg: "#120B1F", accent: "#8B5CF6", text: "#F7F8FA", sub: "#C4B5FD" },
  IVORY: { bg: "#F7F8FA", accent: "#4F7CFF", text: "#0B0D12", sub: "#5C6577" },
  GRAPHITE: { bg: "#171B24", accent: "#A5ADBD", text: "#F7F8FA", sub: "#A5ADBD" },
  EMERALD: { bg: "#06140F", accent: "#34D399", text: "#F7F8FA", sub: "#A7F3D0" },
};

/** Deterministic, dependency-free SVG cover generator (Design Engine). */
export function buildCoverSvg(opts: {
  title: string;
  subtitle?: string | null;
  author?: string | null;
  style: string;
  palette: string;
}) {
  const p = PALETTES[opts.palette] ?? PALETTES.MIDNIGHT;
  const title = escapeXml(opts.title).slice(0, 80);
  const subtitle = escapeXml(opts.subtitle ?? "").slice(0, 90);
  const author = escapeXml(opts.author ?? "").slice(0, 40);
  const lines = wrap(title, 18).slice(0, 4);
  const style = opts.style.toUpperCase();

  const ornament =
    style === "MINIMALISTA"
      ? `<line x1="80" y1="250" x2="220" y2="250" stroke="${p.accent}" stroke-width="3"/>`
      : style === "EDITORIAL"
        ? `<rect x="0" y="0" width="640" height="14" fill="${p.accent}"/><line x1="80" y1="250" x2="560" y2="250" stroke="${p.sub}" stroke-width="1"/>`
        : style === "CRIATIVO"
          ? `<circle cx="540" cy="140" r="110" fill="${p.accent}" opacity="0.18"/><circle cx="120" cy="760" r="150" fill="${p.accent}" opacity="0.12"/>`
          : style === "CORPORATIVO"
            ? `<rect x="80" y="230" width="60" height="6" fill="${p.accent}"/><rect x="0" y="880" width="640" height="80" fill="${p.accent}" opacity="0.12"/>`
            : style === "ELEGANTE"
              ? `<rect x="46" y="46" width="548" height="868" fill="none" stroke="${p.accent}" stroke-width="1" opacity="0.5"/>`
              : style === "MODERNO"
                ? `<rect x="0" y="600" width="640" height="360" fill="${p.accent}" opacity="0.10"/><rect x="80" y="250" width="120" height="4" fill="${p.accent}"/>`
                : `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${p.accent}" stop-opacity="0.35"/><stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/></linearGradient></defs><rect x="0" y="0" width="640" height="960" fill="url(#g)"/><rect x="80" y="250" width="90" height="4" fill="${p.accent}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 960" width="640" height="960" role="img" aria-label="${title}">
  <rect width="640" height="960" fill="${p.bg}"/>
  ${ornament}
  <text x="80" y="190" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="6" fill="${p.accent}">${style}</text>
  ${lines
    .map(
      (l, i) =>
        `<text x="80" y="${330 + i * 62}" font-family="Georgia, 'Times New Roman', serif" font-size="54" fill="${p.text}">${l}</text>`,
    )
    .join("\n  ")}
  <text x="80" y="${360 + lines.length * 62}" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${p.sub}">${wrap(subtitle, 40)[0] ?? ""}</text>
  <text x="80" y="${388 + lines.length * 62}" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${p.sub}">${wrap(subtitle, 40)[1] ?? ""}</text>
  <text x="80" y="880" font-family="Helvetica, Arial, sans-serif" font-size="17" letter-spacing="2" fill="${p.text}">${author}</text>
</svg>`;
}

function wrap(text: string, max: number): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (line) out.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`;
    }
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

function escapeXml(v: string) {
  return v.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);
}
