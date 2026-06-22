import type { KeyboardModel } from "../lib/keyboardModel";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "../lib/textFit";

export function KeyboardModelPreview({ model }: { model: KeyboardModel }) {
  return (
    <div className="model-preview-viewport" aria-label={`${model.name} marker preview`}>
      <div
        className="keyboard-stage model-marker-stage"
        style={{ width: model.width * model.unit, height: model.height * model.unit }}
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
  );
}
