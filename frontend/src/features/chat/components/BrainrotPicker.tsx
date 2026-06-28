import type { RefObject } from "react";

import type { UiText } from "../../../shared/i18n/uiText";
import type { BrainrotStyleKey } from "../types/chat";

interface BrainrotPickerProps {
  containerRef: RefObject<HTMLDivElement>;
  isEnabled: boolean;
  isOpen: boolean;
  brainrotStyle: BrainrotStyleKey;
  brainrotStyles: Array<{ key: BrainrotStyleKey; label: string }>;
  onBrainrotStyleChange: (style: BrainrotStyleKey) => void;
  onToggle: () => void;
  onClose: () => void;
  copy: Pick<UiText["chat"], "brainrotStyleLabel">;
}

export function BrainrotPicker({
  containerRef,
  isEnabled,
  isOpen,
  brainrotStyle,
  brainrotStyles,
  onBrainrotStyleChange,
  onToggle,
  onClose,
  copy,
}: BrainrotPickerProps) {
  if (!isEnabled) {
    return null;
  }

  const activeLabel =
    brainrotStyles.find((option) => option.key === brainrotStyle)?.label ?? copy.brainrotStyleLabel;
  const chevron = isOpen ? "▴" : "▾";

  return (
    <div className="brainrot-picker" ref={containerRef}>
      <button
        type="button"
        className="brainrot-picker-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="model-name">{activeLabel}</span>
        <span className="model-chevron">{chevron}</span>
      </button>

      {isOpen ? (
        <ul className="brainrot-style-popover" aria-label={copy.brainrotStyleLabel}>
          {brainrotStyles.map((styleOption) => {
            const isSelected = styleOption.key === brainrotStyle;

            return (
              <li key={styleOption.key}>
                <button
                  type="button"
                  className={`brainrot-style-option${isSelected ? " is-active" : ""}`}
                  onClick={() => {
                    onBrainrotStyleChange(styleOption.key);
                    onClose();
                  }}
                  title={styleOption.label}
                >
                  <span>{styleOption.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
