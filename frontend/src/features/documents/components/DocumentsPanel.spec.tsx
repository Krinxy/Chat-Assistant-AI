import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DocumentsPanel } from "./DocumentsPanel";
import { type UseDocumentsResult, useDocuments } from "../hooks/useDocuments";
import { uiTextByLanguage } from "../../../shared/i18n/uiText";

vi.mock("../hooks/useDocuments", () => ({ useDocuments: vi.fn() }));

const copy = uiTextByLanguage.de.documents;
const mockedUseDocuments = vi.mocked(useDocuments);

function setupHook(overrides: Partial<UseDocumentsResult> = {}): UseDocumentsResult {
  const value: UseDocumentsResult = {
    documents: [],
    isLoading: false,
    loadError: null,
    reload: vi.fn().mockResolvedValue(undefined),
    upload: vi.fn().mockResolvedValue({ ok: true }),
    remove: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
  mockedUseDocuments.mockReturnValue(value);
  return value;
}

function renderPanel(isAdmin: boolean) {
  return render(<DocumentsPanel language="de" token="tok" isAdmin={isAdmin} copy={copy} />);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DocumentsPanel", () => {
  it("shows the upload control for admins", () => {
    setupHook();
    renderPanel(true);

    expect(screen.getByRole("button", { name: copy.uploadButton })).toBeInTheDocument();
    expect(screen.queryByText(copy.adminOnlyNote)).not.toBeInTheDocument();
  });

  it("hides upload and shows the read-only note for non-admins", () => {
    setupHook();
    renderPanel(false);

    expect(screen.queryByRole("button", { name: copy.uploadButton })).not.toBeInTheDocument();
    expect(screen.getByText(copy.adminOnlyNote)).toBeInTheDocument();
  });

  it("renders the document list with name and chunk count", () => {
    setupHook({
      documents: [{ id: "d1", filename: "report.pdf", chunkCount: 7, uploadedAt: "2026-06-29T10:00:00Z" }],
    });
    renderPanel(true);

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`7 ${copy.chunksSuffix}`))).toBeInTheDocument();
  });

  it("shows the empty state when there are no documents", () => {
    setupHook({ documents: [] });
    renderPanel(true);

    expect(screen.getByText(copy.empty)).toBeInTheDocument();
  });

  it("calls remove when an admin deletes a document", async () => {
    const hook = setupHook({
      documents: [{ id: "d1", filename: "report.pdf", chunkCount: 7, uploadedAt: "2026-06-29T10:00:00Z" }],
    });
    renderPanel(true);

    fireEvent.click(screen.getByRole("button", { name: copy.deleteLabel }));

    await waitFor(() => expect(hook.remove).toHaveBeenCalledWith("d1"));
  });

  it("uploads the chosen file via the hook", async () => {
    const hook = setupHook();
    const { container } = renderPanel(true);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(hook.upload).toHaveBeenCalledWith(file));
  });
});
