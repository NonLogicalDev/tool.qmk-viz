import type { KeyboardModel } from "./keyboardModel";
import { cloneKleDocument, type KleDocument } from "./kle";
import { selectedKeycode, type KeymapLayer } from "./keymap";

function labelWithCenterSlot(originalLabel: string, slot: string, topLegend?: string): string {
  const legendSlots = originalLabel.split("\n");

  while (legendSlots.length <= 6) {
    legendSlots.push("");
  }

  if (topLegend !== undefined) {
    legendSlots[0] = topLegend;
  }
  legendSlots[6] = slot;

  return legendSlots.join("\n");
}

function rewriteKleLabels(model: KeyboardModel, legendForSlot: (slot: string) => string | undefined): KleDocument {
  const editableKeys = new Map(model.keys.map((key) => [key.kleIndex, key]));
  const next = cloneKleDocument(model.kle);
  let keyIndex = 0;

  return next.map((rowOrMetadata) => {
    if (!Array.isArray(rowOrMetadata)) {
      return rowOrMetadata;
    }

    return rowOrMetadata.map((item) => {
      if (typeof item !== "string") {
        return item;
      }

      const key = editableKeys.get(keyIndex);
      keyIndex += 1;

      if (!key) {
        return item;
      }

      return labelWithCenterSlot(item, key.slot, legendForSlot(key.slot));
    });
  });
}

export function serializeKeyboardModelKle(model: KeyboardModel): string {
  const document = rewriteKleLabels(model, () => undefined);
  return JSON.stringify(document, null, 2);
}

export function serializeLayerKle(model: KeyboardModel, layer: KeymapLayer): string {
  const document = rewriteKleLabels(model, (slot) => selectedKeycode(layer, slot));
  return JSON.stringify(document, null, 2);
}
