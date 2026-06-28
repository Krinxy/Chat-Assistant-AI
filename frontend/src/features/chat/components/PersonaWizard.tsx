import type { FormEvent } from "react";

import type { UiText } from "../../../shared/i18n/uiText";
import type { PersonaQuestionnaireAnswers } from "../types/chat";

type PersonaFieldKey = keyof PersonaQuestionnaireAnswers;

interface PersonaQuestion {
  key: PersonaFieldKey;
  question: string;
}

interface PersonaWizardProps {
  isOpen: boolean;
  currentQuestion: PersonaQuestion | null;
  currentValue: string;
  isAnswerValid: boolean;
  stepIndex: number;
  totalSteps: number;
  onClose: () => void;
  onUpdateAnswer: (value: string) => void;
  onStepBack: () => void;
  onStepSubmit: (event: FormEvent<HTMLFormElement>) => void;
  copy: Pick<
    UiText["chat"],
    | "personaWizardTitle"
    | "personaWizardSubtitle"
    | "personaInputPlaceholder"
    | "personaBack"
    | "personaSkip"
    | "personaNext"
    | "personaFinish"
  >;
}

export function PersonaWizard({
  isOpen,
  currentQuestion,
  currentValue,
  isAnswerValid,
  stepIndex,
  totalSteps,
  onClose,
  onUpdateAnswer,
  onStepBack,
  onStepSubmit,
  copy,
}: PersonaWizardProps) {
  if (!isOpen || currentQuestion === null) {
    return null;
  }

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div
      className="persona-wizard-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="persona-wizard-panel"
        aria-label={copy.personaWizardTitle}
      >
        <header className="persona-wizard-header">
          <h3>{copy.personaWizardTitle}</h3>
          <p>{copy.personaWizardSubtitle}</p>
        </header>

        <form className="persona-wizard-form" onSubmit={onStepSubmit}>
          <label className="persona-wizard-field">
            <span>{currentQuestion.question}</span>
            <textarea
              value={currentValue}
              placeholder={copy.personaInputPlaceholder}
              onChange={(event) => onUpdateAnswer(event.target.value)}
            />
          </label>

          <div className="persona-wizard-actions">
            <button
              type="button"
              className="persona-wizard-ghost-btn"
              onClick={onStepBack}
            >
              {copy.personaBack}
            </button>

            <div className="persona-wizard-right-actions">
              <button
                type="button"
                className="persona-wizard-ghost-btn"
                onClick={onClose}
              >
                {copy.personaSkip}
              </button>

              <button
                type="submit"
                className="persona-wizard-primary-btn"
                disabled={!isAnswerValid}
              >
                {isLastStep ? copy.personaFinish : copy.personaNext}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
