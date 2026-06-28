import type { UiText } from "../../../shared/i18n/uiText";
import type { ModelOption, ModelProvider } from "../types/chat";

interface ModelPickerPopoverProps {
  isOpen: boolean;
  filteredProviders: ModelProvider[];
  activeProvider: ModelProvider | null;
  selectedModelId: string;
  modelSearch: string;
  onModelSearch: (query: string) => void;
  onModelSelect: (modelId: string) => void;
  onProviderHover: (providerId: string | null) => void;
  onProviderSelect: (providerId: string) => void;
  onClose: () => void;
  copy: Pick<UiText["chat"], "modelSearchPlaceholder" | "noModelMatch">;
  selectedModel: ModelOption;
}

export function ModelPickerPopover({
  isOpen,
  filteredProviders,
  activeProvider,
  selectedModelId,
  modelSearch,
  onModelSearch,
  onModelSelect,
  onProviderHover,
  onProviderSelect,
  onClose,
  copy,
}: ModelPickerPopoverProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="model-picker-popover popup-menu"
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          onProviderHover(null);
        }
      }}
    >
      <div className="popup-menu-header">
        <input
          type="text"
          placeholder={copy.modelSearchPlaceholder}
          aria-label={copy.modelSearchPlaceholder}
          className="popup-search-input"
          value={modelSearch}
          onChange={(event) => onModelSearch(event.target.value)}
        />
      </div>

      <div className="model-picker-grid">
        <ul className="popup-menu-list">
          {filteredProviders.map((provider) => (
            <li
              key={provider.id}
              className={`popup-menu-item has-submenu${
                activeProvider?.id === provider.id ? " is-active" : ""
              }`}
            >
              <button
                type="button"
                className="popup-menu-item-btn"
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") {
                    onProviderSelect(provider.id);
                  }
                }}
                onClick={() => onProviderSelect(provider.id)}
              >
                <div className="popup-menu-item-content">
                  <span>{provider.label}</span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <div className="popup-submenu">
          {activeProvider === null ? (
            <p className="popup-empty">{copy.noModelMatch}</p>
          ) : (
            <ul className="popup-menu-list">
              {activeProvider.models.map((model) => (
                <li key={model.id} className="popup-menu-item model-choice-item">
                  <button
                    type="button"
                    onClick={() => {
                      onModelSelect(model.id);
                      onProviderHover(null);
                      onClose();
                    }}
                    className={`model-choice-btn${
                      selectedModelId === model.id ? " is-selected" : ""
                    }`}
                  >
                    <span className="model-choice-indicator">
                      {selectedModelId === model.id ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </span>
                    <span>{model.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
