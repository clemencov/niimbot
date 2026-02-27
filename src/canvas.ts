const DPI = 203;
const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;

function mmToPx(mm: number): number {
  return Math.round((mm * DPI) / MM_PER_INCH);
}

function ptToPx(pt: number): number {
  return Math.round((pt * DPI) / POINTS_PER_INCH);
}

/** Ensure pixel count is a multiple of 8 (required by niimbluelib encoder). */
function align8(px: number): number {
  return Math.ceil(px / 8) * 8;
}

export interface LabelConfig {
  text: string;
  fontSize: number;
  bold: boolean;
  align: "left" | "center" | "right";
  widthMm: number;
  heightMm: number;
}

/**
 * Render label text onto a canvas at print resolution.
 * Returns the canvas for printing and updates the visible preview element.
 */
export function renderLabel(
  config: LabelConfig,
  previewCanvas: HTMLCanvasElement
): HTMLCanvasElement {
  const w = align8(mmToPx(config.widthMm));
  const h = align8(mmToPx(config.heightMm));

  // Offscreen canvas at print resolution
  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d")!;

  // White background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // Text styling
  const weight = config.bold ? "bold" : "normal";
  const fontSizePx = ptToPx(config.fontSize);
  ctx.font = `${weight} ${fontSizePx}px JetBrains Mono, monospace`;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";

  const align = config.align;
  ctx.textAlign = align;

  const padding = Math.round(w * 0.04);
  let x: number;
  const maxWidth = w - padding * 2;

  if (align === "left") x = padding;
  else if (align === "right") x = w - padding;
  else x = w / 2;

  // Measure actual glyph dimensions for precise visual centering
  const capHeight = ctx.measureText("H").actualBoundingBoxAscent;
  const descent = ctx.measureText("g").actualBoundingBoxDescent;
  const lineHeight = (capHeight + descent) * 1.3;

  // Word-wrap and render lines
  const lines = wrapText(ctx, config.text, maxWidth);
  const totalTextHeight = (lines.length - 1) * lineHeight + capHeight;
  let y = Math.max(padding, (h - totalTextHeight) / 2) + capHeight;

  for (const line of lines) {
    if (y + descent > h) break;
    ctx.fillText(line, x, y, maxWidth);
    y += lineHeight;
  }

  // Copy to preview canvas (scaled down)
  updatePreview(offscreen, previewCanvas);

  return offscreen;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === "") {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

function updatePreview(
  source: HTMLCanvasElement,
  preview: HTMLCanvasElement
) {
  // Scale so the preview fits nicely (max 400px wide)
  const maxPreviewWidth = 400;
  const scale = Math.min(1, maxPreviewWidth / source.width);
  preview.width = Math.round(source.width * scale);
  preview.height = Math.round(source.height * scale);

  const ctx = preview.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, preview.width, preview.height);
}
