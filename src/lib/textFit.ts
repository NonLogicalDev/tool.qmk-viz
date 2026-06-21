import { layout, measureNaturalWidth, prepareWithSegments } from "@chenglou/pretext";

export type TextFit = {
  fontSize: number;
  lineHeight: number;
  measuredWidth: number;
};

type FitOptions = {
  fontWeight: number;
  maxFontSize: number;
  minFontSize: number;
  step: number;
  lineHeightRatio: number;
};

const widthCache = new Map<string, number>();

function measuredWidth(text: string, font: string): number {
  const cacheKey = `${font}\n${text}`;
  const cached = widthCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const prepared = prepareWithSegments(text, font, { wordBreak: "keep-all" });
  const width = measureNaturalWidth(prepared);
  widthCache.set(cacheKey, width);
  return width;
}

function fitsOneLine(text: string, font: string, maxWidth: number, lineHeight: number): boolean {
  const prepared = prepareWithSegments(text, font, { wordBreak: "keep-all" });
  return layout(prepared, maxWidth, lineHeight).lineCount <= 1;
}

function canvasFont(fontWeight: number, fontSize: number): string {
  return `${fontWeight} ${fontSize}px "Avenir Next"`;
}

function lineHeight(fontSize: number, ratio: number): number {
  return Number((fontSize * ratio).toFixed(2));
}

function fitText(text: string, maxWidth: number, options: FitOptions): TextFit {
  const cleanText = text.trim();
  const safeWidth = Math.max(4, maxWidth);

  for (let fontSize = options.maxFontSize; fontSize >= options.minFontSize; fontSize -= options.step) {
    const normalizedFontSize = Number(fontSize.toFixed(2));
    const font = canvasFont(options.fontWeight, normalizedFontSize);
    const height = lineHeight(normalizedFontSize, options.lineHeightRatio);
    const width = measuredWidth(cleanText, font);
    if (width <= safeWidth && fitsOneLine(cleanText, font, safeWidth, height)) {
      return { fontSize: normalizedFontSize, lineHeight: height, measuredWidth: width };
    }
  }

  const font = canvasFont(options.fontWeight, options.minFontSize);
  return {
    fontSize: options.minFontSize,
    lineHeight: lineHeight(options.minFontSize, options.lineHeightRatio),
    measuredWidth: measuredWidth(cleanText, font)
  };
}

export function fitPrimaryKeyLabel(text: string, keyWidth: number): TextFit {
  return fitText(text, keyWidth - 16, {
    fontWeight: 820,
    maxFontSize: 10.5,
    minFontSize: 5.5,
    step: 0.25,
    lineHeightRatio: 1.08
  });
}

export function fitSecondaryKeyLabel(text: string, keyWidth: number): TextFit {
  return fitText(text, keyWidth - 18, {
    fontWeight: 760,
    maxFontSize: 7,
    minFontSize: 4.5,
    step: 0.25,
    lineHeightRatio: 1.12
  });
}
