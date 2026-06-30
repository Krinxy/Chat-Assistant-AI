import { DocumentsApiError, deleteDocument, listDocuments, uploadDocument } from "./documentsApi";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: "Error",
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("documentsApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps the snake_case wire format to camelCase on list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse([{ id: "d1", filename: "report.pdf", chunk_count: 7, uploaded_at: "2026-06-29T10:00:00Z" }]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const docs = await listDocuments("tok");

    expect(docs).toEqual([{ id: "d1", filename: "report.pdf", chunkCount: 7, uploadedAt: "2026-06-29T10:00:00Z" }]);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/documents"), {
      headers: { Authorization: "Bearer tok" },
    });
  });

  it("uploads via multipart FormData and returns the created document", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: "d2", filename: "a.txt", chunk_count: 1, uploaded_at: "x" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    const created = await uploadDocument(file, "tok");

    expect(created.id).toBe("d2");
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("throws DocumentsApiError carrying the status code on a 409", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "duplicate" }, { ok: false, status: 409 })));

    const file = new File(["x"], "dup.pdf");
    await expect(uploadDocument(file, "tok")).rejects.toMatchObject({ statusCode: 409 });
    await expect(uploadDocument(file, "tok")).rejects.toBeInstanceOf(DocumentsApiError);
  });

  it("sends a DELETE with the encoded id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteDocument("d 1", "tok");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/documents/d%201");
    expect(options.method).toBe("DELETE");
  });
});
