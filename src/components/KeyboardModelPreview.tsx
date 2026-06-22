import { useEffect, useMemo, useRef, useState } from "react";
import { keyboardGeometryForModel, type KeyboardModel } from "../lib/keyboardModel";
import { keyboardScaleForViewport, keyboardStageSizeForGeometry, type KeyboardStageViewport } from "../lib/keyboardStage";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "../lib/textFit";

export function KeyboardModelPreview({ model }: { model: KeyboardModel }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<KeyboardStageViewport>({
    width: 0,
    screenHeight: typeof window === "undefined" ? 900 : window.innerHeight
  });
  const geometry = useMemo(() => keyboardGeometryForModel(model), [model]);
  const stageSize = useMemo(() => keyboardStageSizeForGeometry(geometry), [geometry]);
  const scale = useMemo(() => keyboardScaleForViewport(stageSize, viewportSize), [stageSize, viewportSize]);
  const visualSize = useMemo(() => ({
    width: stageSize.width * scale,
    height: stageSize.height * scale
  }), [scale, stageSize.height, stageSize.width]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;

    const updateViewportSize = () => {
      const styles = window.getComputedStyle(node);
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const nextWidth = Math.max(0, node.clientWidth - horizontalPadding);
      const nextScreenHeight = window.innerHeight;
      setViewportSize((current) => (
        Math.abs(current.width - nextWidth) < 0.5 && current.screenHeight === nextScreenHeight
          ? current
          : { width: nextWidth, screenHeight: nextScreenHeight }
      ));
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", updateViewportSize);
    }

    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
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
            const keyWidth = key.width * geometry.unit;
            const primaryFit = fitPrimaryKeyLabel(key.slot, keyWidth);
            const secondaryFit = fitSecondaryKeyLabel("marker", keyWidth);

            return (
              <div
                className="keycap read-only model-marker-key"
                key={key.slot}
                style={{
                  left: (key.x + geometry.paddingX) * geometry.unit,
                  top: (key.y + geometry.paddingY) * geometry.unit,
                  width: key.width * geometry.unit,
                  height: key.height * geometry.unit,
                  transform: `rotate(${key.rotation}deg)`,
                  transformOrigin: `${(key.rotationX - key.x) * geometry.unit}px ${(key.rotationY - key.y) * geometry.unit}px`
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
