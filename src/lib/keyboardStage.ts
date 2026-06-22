import type { KeyboardGeometry } from "./keyboardModel";

export type KeyboardStageSize = {
  width: number;
  height: number;
};

export type KeyboardStageViewport = {
  width: number;
  screenHeight: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function keyboardStageSizeForGeometry(geometry: KeyboardGeometry | null): KeyboardStageSize {
  return {
    width: geometry ? geometry.width * geometry.unit : 0,
    height: geometry ? geometry.height * geometry.unit : 0
  };
}

export function keyboardScaleForViewport(stageSize: KeyboardStageSize, viewport: KeyboardStageViewport): number {
  if (!stageSize.width || !stageSize.height) return 1;

  const measuredWidth = viewport.width || stageSize.width;
  const widthScale = Math.max(0.1, (measuredWidth - 8) / stageSize.width);
  const maxVisualHeight = Math.max(360, viewport.screenHeight * 0.68);
  const heightScale = maxVisualHeight / stageSize.height;
  const fitScale = Math.min(widthScale, heightScale);

  return clampNumber(Number.isFinite(fitScale) ? fitScale : 1, 0.2, 1.35);
}
