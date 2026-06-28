import type { FormEvent } from "react";

import type { UiText } from "../../../shared/i18n/uiText";
import type { LocalLlmConfig } from "../types/chat";

interface LocalLlmConfigPanelProps {
  isEnabled: boolean;
  localLlmConfig: LocalLlmConfig;
  isLocalConfigSaved: boolean;
  onEndpointChange: (value: string) => void;
  onModelNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  copy: Pick<
    UiText["chat"],
    | "localConfigTitle"
    | "localConfigHint"
    | "localSetupSteps"
    | "localEndpoint"
    | "localModelName"
    | "localSave"
    | "localSaved"
  >;
}

export function LocalLlmConfigPanel({
  isEnabled,
  localLlmConfig,
  isLocalConfigSaved,
  onEndpointChange,
  onModelNameChange,
  onSubmit,
  copy,
}: LocalLlmConfigPanelProps) {
  if (!isEnabled) {
    return null;
  }

  return (
    <div className="local-llm-hover-wrap">
      <button type="button" className="local-llm-hover-btn">
        {copy.localConfigTitle}
      </button>

      <section className="local-llm-hover-popover" aria-label={copy.localConfigTitle}>
        <div className="local-llm-config-panel">
          <div className="local-llm-config-header">
            <h3>{copy.localConfigTitle}</h3>
            <p>{copy.localConfigHint}</p>
            <ol className="local-llm-steps">
              {copy.localSetupSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <form className="local-llm-config-form" onSubmit={onSubmit}>
            <label className="local-llm-field">
              <span>{copy.localEndpoint}</span>
              <input
                type="url"
                required
                value={localLlmConfig.endpoint}
                placeholder="http://localhost:8000/v1"
                onChange={(event) => onEndpointChange(event.target.value)}
              />
            </label>

            <label className="local-llm-field">
              <span>{copy.localModelName}</span>
              <input
                type="text"
                required
                value={localLlmConfig.modelName}
                placeholder="meta-llama/Llama-3.3-70B-Instruct"
                onChange={(event) => onModelNameChange(event.target.value)}
              />
            </label>

            <div className="local-llm-actions">
              <button type="submit" className="local-llm-save-btn">
                {copy.localSave}
              </button>
              {isLocalConfigSaved ? <p>{copy.localSaved}</p> : null}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
