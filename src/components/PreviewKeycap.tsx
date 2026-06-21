import { describeAction } from "../lib/actions";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "../lib/textFit";

export function actionTypeLabel(details: ReturnType<typeof describeAction>): string {
  return details.secondary ?? (details.tone === "plain" ? "key" : details.tone);
}

export function PreviewKeycap({
  action,
  layerColors = {},
  slot,
  testId
}: {
  action: string;
  layerColors?: Record<string, string>;
  slot: string;
  testId: string;
}) {
  const details = describeAction(action);
  const actionType = actionTypeLabel(details);
  const layerColor = details.layer ? layerColors[details.layer] : undefined;
  const previewWidth = 92;
  const primaryFit = fitPrimaryKeyLabel(details.primary, previewWidth);
  const secondaryFit = fitSecondaryKeyLabel(actionType, previewWidth);

  return (
    <div
      className={`key-preview ${details.tone}`}
      data-testid={testId}
      title={`${slot}: ${action}`}
    >
      <span className="key-slot">{slot}</span>
      {layerColor && (
        <span
          className="layer-dot"
          style={{ backgroundColor: layerColor }}
          title={`${details.layer} layer action`}
        />
      )}
      <span
        className="key-primary"
        data-font-size={primaryFit.fontSize.toFixed(2)}
        data-measured-width={primaryFit.measuredWidth.toFixed(2)}
        style={{ fontSize: primaryFit.fontSize, lineHeight: `${primaryFit.lineHeight}px` }}
      >
        {details.primary}
      </span>
      <span
        className="key-secondary"
        data-font-size={secondaryFit.fontSize.toFixed(2)}
        data-measured-width={secondaryFit.measuredWidth.toFixed(2)}
        style={{ fontSize: secondaryFit.fontSize, lineHeight: `${secondaryFit.lineHeight}px` }}
      >
        {actionType}
      </span>
    </div>
  );
}
