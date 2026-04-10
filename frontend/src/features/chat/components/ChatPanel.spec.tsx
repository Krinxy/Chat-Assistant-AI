import { render, screen } from "@testing-library/react";

import { uiTextByLanguage } from "../../../shared/i18n/uiText";
import { ChatPanel } from "./ChatPanel";

describe("ChatPanel", () => {
  const defaultProps = {
    hasStartedChat: true,
    draft: "",
    setDraft: () => {},
    messages: [],
    isTyping: false,
    selectedModel: { id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
    selectedModelId: "gpt-5.3-codex",
    modelProviders: [
      {
        id: "recent",
        label: "Recently used",
        models: [{ id: "gpt-5.3-codex", label: "GPT-5.3-Codex" }],
      },
    ],
    attachmentActions: [{ id: "files", label: "Attach files" }],
    onSendMessage: () => {},
    onAttachmentAction: () => {},
    onModelSelect: () => {},
    onServiceAdd: () => {},
    onServiceRemove: () => {},
    brainrotStyle: "meme67" as const,
    onBrainrotStyleChange: () => {},
    onLocalLlmConfigSave: () => {},
    onReturnToDashboard: () => {},
    onOpenProfile: () => {},
    copy: uiTextByLanguage.en.chat,
  };

  it("renders merged chat toolbar with compact profile in chat mode", () => {
    render(
      <ChatPanel
        {...defaultProps}
        activeServices={[]}
      />,
    );

    expect(screen.getByTitle("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("DB")).toBeInTheDocument();
  });

  it("shows minimal local setup fields when local configurator service is active", () => {
    render(
      <ChatPanel
        {...defaultProps}
        activeServices={["localConfigurator"]}
      />,
    );

    expect(screen.getAllByText(uiTextByLanguage.en.chat.localConfigTitle).length).toBeGreaterThan(0);
    expect(screen.getByText(uiTextByLanguage.en.chat.localSetupSteps[0])).toBeInTheDocument();
    expect(screen.queryByText(uiTextByLanguage.en.chat.localApiKey)).not.toBeInTheDocument();
  });
});
