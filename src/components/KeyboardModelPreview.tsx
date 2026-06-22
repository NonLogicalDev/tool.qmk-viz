import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardModel } from "../lib/keyboardModel";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "../lib/textFit";

export function KeyboardModelPreview({ model }: { model: KeyboardModel }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const stageSize = useMemo(() => ({
    width: model.width * model.unit,
    height: model.height * model.unit
  }), [model.height, model.unit, model.width]);
  const scale = useMemo(() => {
    if (!stageSize.width) return 1;
    const availableWidth = Math.max(160, viewportWidth - 20);
    const fitScale = availableWidth / stageSize.width;
    return Math.min(1.2, Math.max(0.18, Number.isFinite(fitScale) ? fitScale : 1));
  }, [stageSize.width, viewportWidth]);
  const visualSize = useMemo(() => ({
    width: stageSize.width * scale,
    height: stageSize.height * scale
  }), [scale, stageSize.height, stageSize.width]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;

    const updateViewportWidth = () => {
      const nextWidth = node.clientWidth;
      setViewportWidth((current) => (Math.abs(current - nextWidth) < 0.5 ? current : nextWidth));
    };

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", updateViewportWidth);
    }

    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportWidth);
    };
  }, []);

  return (
    <div className="model-preview-viewport" ref={viewportRef} aria-label={`${model.name} marker preview`}>
      <div
        className="model-preview-scaler"
        style={{ width: visualSize.width, height: visualSize.height }}
      >
        <div
          className="keyboard-stage model-marker-stage"
          style={{
            width: stageSize.width,
            height: stageSize.height,
            transform: `scale(${scale})`
          }}
        >
          {model.keys.map((key) => {
            const keyWidth = key.width * model.unit;
            const primaryFit = fitPrimaryKeyLabel(key.slot, keyWidth);
            const secondaryFit = fitSecondaryKeyLabel("marker", keyWidth);

            return (
              <div
                className="keycap read-only model-marker-key"
                key={key.slot}
                style={{
                  left: (key.x + model.paddingX) * model.unit,
                  top: (key.y + model.paddingY) * model.unit,
                  width: key.width * model.unit,
                  height: key.height * model.unit,
                  transform: `rotate(${key.rotation}deg)`,
                  transformOrigin: `${(key.rotationX - key.x) * model.unit}px ${(key.rotationY - key.y) * model.unit}px`
                }}
                title={`${key.slot}${key.legend ? ` from ${key.legend}` : ""}`}
              >
                <span className="key-slot">{key.slot}</span>
                <span
                  className="key-primary"
                  data-font-size={primaryFit.fontSize.toFixed(2)}
                  data-measured-width={primaryFit.measuredWidth.toFixed(2)}
                  style={{ fontSize: primaryFit.fontSize, lineHeight: `${primaryFit.lineHeight}px` }}
                >
                  {key.slot}
                </span>
                <span
                  className="key-secondary"
                  data-font-size={secondaryFit.fontSize.toFixed(2)}
                  data-measured-width={secondaryFit.measuredWidth.toFixed(2)}
                  style={{ fontSize: secondaryFit.fontSize, lineHeight: `${secondaryFit.lineHeight}px` }}
                >
                  marker
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
