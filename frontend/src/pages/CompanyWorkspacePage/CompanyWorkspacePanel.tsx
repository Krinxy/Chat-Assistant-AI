import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDragScroll } from "../../shared/hooks/useDragScroll";
import { userProfile } from "../../shared/data/userProfile";
import { CompanyAppointmentsTab } from "./CompanyAppointmentsTab";
import { CompanyHypothesesTab } from "./CompanyHypothesesTab";
import { CompanyNotesTab } from "./CompanyNotesTab";
import { CompanyTeamTab } from "./CompanyTeamTab";
import { CompanyList } from "./CompanyList";
import { OverviewMetrics } from "./OverviewMetrics";
import {
  companyRecords,
  tabVisibilityByRole,
  weekdayLabelsByLanguage,
} from "./companyWorkspace.data";
import { getCompanyWorkspaceText } from "./companyWorkspace.text";
import type {
  CompanyNoteEntry,
  CompanyTeamMemberEntry,
  CompanyWorkspacePanelProps,
  CompanyTab,
  HypothesisEntry,
  UploadedCompanyDocument,
  WorkspaceDocumentItem,
} from "./companyWorkspace.types";
import {
  buildCompanyTeamMembers,
  formatFileSize,
  getCompanyInitials,
  inferMimeTypeFromName,
  parseAppointmentItem,
  readDbAssignedRole,
} from "./companyWorkspace.utils";

const ENABLE_WORKSPACE_NEWSFEED = false;

const OV_WIDGET_DEFAULT_ORDER = ["metrics", "events", "scopes", "kpis"] as const;
type OverviewWidgetId = typeof OV_WIDGET_DEFAULT_ORDER[number];

export function CompanyWorkspacePanel({ language, onOpenProfile, isSidebarOpen, onOpenSidebar }: CompanyWorkspacePanelProps) {
  const text = useMemo(() => getCompanyWorkspaceText(language), [language]);

  const [assignedRole] = useState(readDbAssignedRole);
  const [activeTab, setActiveTab] = useState<CompanyTab>("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isRecentExpanded, setIsRecentExpanded] = useState<boolean>(true);
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState<boolean>(true);
  const [isListPaneCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("aura_list_pane_collapsed") === "1"; } catch { return false; }
  });
  const tabRowRef = useRef<HTMLDivElement | null>(null);
  const tabDragScroll = useDragScroll(tabRowRef);

  const [uploadedDocumentsByCompany, setUploadedDocumentsByCompany] = useState<
    Record<string, UploadedCompanyDocument[]>
  >({});
  const [dismissedDocumentsByCompany, setDismissedDocumentsByCompany] = useState<Record<string, string[]>>({});
  const [openedDocumentByCompany, setOpenedDocumentByCompany] = useState<Record<string, string>>({});
  const [documentSearch, setDocumentSearch] = useState<string>("");

  const [uploadedNotesByCompany, setUploadedNotesByCompany] = useState<Record<string, CompanyNoteEntry[]>>({});
  const [noteStatusByCompany, setNoteStatusByCompany] = useState<Record<string, Record<string, "open" | "closed">>>({});
  const [hypothesesByCompany, setHypothesesByCompany] = useState<Record<string, HypothesisEntry[]>>({});
  const [activeNoteByCompany, setActiveNoteByCompany] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [noteDraftLabels, setNoteDraftLabels] = useState<string[]>([]);
  const [noteDraftLinkedEvent, setNoteDraftLinkedEvent] = useState<string>("");
  const [editNoteTitle, setEditNoteTitle] = useState<string>("");
  const [editNoteContent, setEditNoteContent] = useState<string>("");
  const [editNoteLabels, setEditNoteLabels] = useState<string[]>([]);
  const [editNoteLinkedEvent, setEditNoteLinkedEvent] = useState<string>("");

  const [teamMembersByCompany, setTeamMembersByCompany] = useState<Record<string, CompanyTeamMemberEntry[]>>({});
  const [editingTeamMemberId, setEditingTeamMemberId] = useState<string>("");
  const [teamEditFunction, setTeamEditFunction] = useState<string>("");
  const [teamEditName, setTeamEditName] = useState<string>("");

  const [meetingAssigneesByCompany, setMeetingAssigneesByCompany] = useState<Record<string, Record<string, string>>>({});

  const [overviewWidgetOrder, setOverviewWidgetOrder] = useState<OverviewWidgetId[]>(() => {
    try {
      const stored = localStorage.getItem("aura_ov_widget_order");
      if (stored) {
        const parsed = JSON.parse(stored) as OverviewWidgetId[];
        if (Array.isArray(parsed) && parsed.length === OV_WIDGET_DEFAULT_ORDER.length) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return [...OV_WIDGET_DEFAULT_ORDER];
  });
  const ovDragWidget = useRef<OverviewWidgetId | null>(null);
  const ovDragOverWidget = useRef<OverviewWidgetId | null>(null);
  const [ovDragActive, setOvDragActive] = useState<OverviewWidgetId | null>(null);
  const [ovDragOver, setOvDragOver] = useState<OverviewWidgetId | null>(null);

  const handleOvDragStart = useCallback((id: OverviewWidgetId) => {
    ovDragWidget.current = id;
    setOvDragActive(id);
  }, []);

  const handleOvDragOver = useCallback((id: OverviewWidgetId) => {
    ovDragOverWidget.current = id;
    setOvDragOver(id);
  }, []);

  const handleOvDrop = useCallback(() => {
    const from = ovDragWidget.current;
    const to = ovDragOverWidget.current;
    if (from && to && from !== to) {
      setOverviewWidgetOrder((prev) => {
        const next = [...prev];
        const fromIdx = next.indexOf(from);
        const toIdx = next.indexOf(to);
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, from);
        try { localStorage.setItem("aura_ov_widget_order", JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }
    ovDragWidget.current = null;
    ovDragOverWidget.current = null;
    setOvDragActive(null);
    setOvDragOver(null);
  }, []);

  const handleOvDragEnd = useCallback(() => {
    ovDragWidget.current = null;
    ovDragOverWidget.current = null;
    setOvDragActive(null);
    setOvDragOver(null);
  }, []);

  const handleOvMoveUp = useCallback((id: OverviewWidgetId) => {
    setOverviewWidgetOrder((prev) => {
      const next = [...prev];
      const idx = next.indexOf(id);
      if (idx <= 0) return prev;
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      try { localStorage.setItem("aura_ov_widget_order", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleOvMoveDown = useCallback((id: OverviewWidgetId) => {
    setOverviewWidgetOrder((prev) => {
      const next = [...prev];
      const idx = next.indexOf(id);
      if (idx >= next.length - 1) return prev;
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      try { localStorage.setItem("aura_ov_widget_order", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const documentFileInputRef = useRef<HTMLInputElement | null>(null);
  const noteFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedDocumentsRegistryRef = useRef<Record<string, UploadedCompanyDocument[]>>({});

  const roleScopedCompanies = useMemo(() => {
    if (assignedRole === "guest") {
      return [];
    }

    return companyRecords.filter((company) => company.assignedRoles.includes(assignedRole));
  }, [assignedRole]);

  useEffect(() => {
    if (roleScopedCompanies.length === 0) {
      setSelectedCompanyId("");
      return;
    }

    setSelectedCompanyId((previous) => previous || roleScopedCompanies[0].id);
  }, [roleScopedCompanies]);

  const filteredCompanies = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (query.length === 0) {
      return roleScopedCompanies;
    }

    return roleScopedCompanies.filter((company) => {
      const searchable = `${company.name} ${company.segment} ${company.owner}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [roleScopedCompanies, searchTerm]);

  useEffect(() => {
    if (filteredCompanies.length === 0) {
      setSelectedCompanyId("");
      return;
    }

    const stillVisible = filteredCompanies.some((company) => company.id === selectedCompanyId);

    if (!stillVisible) {
      setSelectedCompanyId(filteredCompanies[0]?.id ?? "");
    }
  }, [filteredCompanies, selectedCompanyId]);

  const selectedCompany = useMemo(() => {
    return filteredCompanies.find((company) => company.id === selectedCompanyId) ?? null;
  }, [filteredCompanies, selectedCompanyId]);

  const activeTeamMembers = useMemo(() => {
    if (selectedCompany === null) {
      return [];
    }

    return teamMembersByCompany[selectedCompany.id] ?? buildCompanyTeamMembers(selectedCompany);
  }, [selectedCompany, teamMembersByCompany]);

  useEffect(() => {
    if (selectedCompany === null) {
      return;
    }

    setTeamMembersByCompany((previous) => {
      if (previous[selectedCompany.id] !== undefined) {
        return previous;
      }

      return {
        ...previous,
        [selectedCompany.id]: buildCompanyTeamMembers(selectedCompany),
      };
    });
  }, [selectedCompany]);

  const appointmentItems = useMemo(() => {
    if (selectedCompany === null) {
      return [];
    }

    const weekDays = weekdayLabelsByLanguage[language];
    return selectedCompany.appointments.map((item, index) => {
      return parseAppointmentItem(item, index % weekDays.length, selectedCompany.id, index);
    });
  }, [language, selectedCompany]);

  const visibleDayIndices = useMemo(() => {
    const hasWeekendAppointments = appointmentItems.some((item) => item.dayIndex >= 5);
    return hasWeekendAppointments ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  }, [appointmentItems]);

  const appointmentLabelById = useMemo(() => {
    const weekDays = weekdayLabelsByLanguage[language];
    return new Map(
      appointmentItems.map((item) => [
        item.id,
        `${weekDays[item.dayIndex] ?? ""} ${item.timeLabel} ${item.title}`.trim(),
      ]),
    );
  }, [appointmentItems, language]);

  const notesForSelectedCompany = useMemo(() => {
    if (selectedCompany === null) {
      return [] as CompanyNoteEntry[];
    }

    const baseNotes: CompanyNoteEntry[] = selectedCompany.notes.map((item, index) => ({
      id: `base-note-${selectedCompany.id}-${index}`,
      title: item.length > 56 ? `${item.slice(0, 56)}...` : item,
      content: item,
      createdAt: selectedCompany.lastVisited,
      author: selectedCompany.owner,
      status: noteStatusByCompany[selectedCompany.id]?.[`base-note-${selectedCompany.id}-${index}`] ?? "open",
      source: "base",
      labels: [],
      linkedEvent: null,
    }));

    const attachedNotes = (uploadedNotesByCompany[selectedCompany.id] ?? []).map((note) => ({
      ...note,
      status: noteStatusByCompany[selectedCompany.id]?.[note.id] ?? note.status ?? "open",
    }));
    return [...attachedNotes, ...baseNotes];
  }, [noteStatusByCompany, selectedCompany, uploadedNotesByCompany]);

  const activeNoteId = useMemo(() => {
    if (selectedCompany === null) {
      return "";
    }

    return activeNoteByCompany[selectedCompany.id] ?? notesForSelectedCompany[0]?.id ?? "";
  }, [activeNoteByCompany, notesForSelectedCompany, selectedCompany]);

  const activeNote = useMemo(() => {
    return notesForSelectedCompany.find((note) => note.id === activeNoteId) ?? null;
  }, [activeNoteId, notesForSelectedCompany]);

  useEffect(() => {
    if (activeNote === null) {
      setEditNoteTitle("");
      setEditNoteContent("");
      setEditNoteLabels([]);
      setEditNoteLinkedEvent("");
      return;
    }

    setEditNoteTitle(activeNote.title);
    setEditNoteContent(activeNote.content);
    setEditNoteLabels(activeNote.labels);
    setEditNoteLinkedEvent(activeNote.linkedEvent ?? "");
  }, [activeNote]);

  const noteLabelLookup = useMemo(() => {
    return new Map(text.noteLabels.map((label) => [label.id, label.label]));
  }, [text.noteLabels]);

  useEffect(() => {
    setActiveTab("overview");
  }, [selectedCompanyId]);

  useEffect(() => {
    setDocumentSearch("");
    setNoteDraft("");
    setNoteDraftLabels([]);
    setNoteDraftLinkedEvent("");
    setEditingTeamMemberId("");
  }, [selectedCompanyId]);

  const recentCompanies = useMemo(() => {
    return roleScopedCompanies.slice(0, 12);
  }, [roleScopedCompanies]);

  const favoriteCompanies = useMemo(() => {
    return roleScopedCompanies.filter((company) => company.isFavorite);
  }, [roleScopedCompanies]);

  const visibleTabs = tabVisibilityByRole[assignedRole].filter((tabId) => {
    if (tabId === "performance") return false;
    if (!ENABLE_WORKSPACE_NEWSFEED && tabId === "newsfeed") return false;
    return true;
  });

  useEffect(() => {
    if (visibleTabs.includes(activeTab)) {
      return;
    }

    setActiveTab("overview");
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    uploadedDocumentsRegistryRef.current = uploadedDocumentsByCompany;
  }, [uploadedDocumentsByCompany]);

  useEffect(() => {
    return () => {
      Object.values(uploadedDocumentsRegistryRef.current)
        .flat()
        .forEach((entry) => {
          URL.revokeObjectURL(entry.objectUrl);
        });
    };
  }, []);

  const buildTimeLabel = useCallback((): string => {
    return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }, [language]);

  const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    if (selectedCompany === null) {
      event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setUploadedDocumentsByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? [];
      const existingNames = new Set(existing.map((entry) => entry.name.toLowerCase()));
      const nextEntries = [...existing];

      files.forEach((file, index) => {
        const normalizedName = file.name.trim();
        if (normalizedName.length === 0) {
          return;
        }

        const normalizedKey = normalizedName.toLowerCase();
        if (existingNames.has(normalizedKey)) {
          return;
        }

        nextEntries.unshift({
          id: `upload-${selectedCompany.id}-${Date.now()}-${index}`,
          name: normalizedName,
          mimeType: file.type.trim().length > 0 ? file.type : inferMimeTypeFromName(normalizedName),
          sizeLabel: formatFileSize(file.size),
          objectUrl: URL.createObjectURL(file),
          uploadedAt: buildTimeLabel(),
        });
        existingNames.add(normalizedKey);
      });

      return {
        ...previous,
        [selectedCompany.id]: nextEntries,
      };
    });

    event.target.value = "";
  };

  const triggerDocumentDownload = useCallback((companyName: string, docItem: WorkspaceDocumentItem): void => {
    const generatedContent = [
      `${docItem.name}`,
      "",
      `Company: ${companyName}`,
      `Source: ${docItem.source}`,
      `Type: ${docItem.mimeType}`,
      "",
      "Generated preview export from AURA workspace.",
    ].join("\n");

    const temporaryUrl =
      docItem.objectUrl ??
      URL.createObjectURL(new Blob([generatedContent], { type: "text/plain;charset=utf-8" }));

    const link = document.createElement("a");
    link.href = temporaryUrl;
    link.download = docItem.name;
    link.click();

    if (docItem.objectUrl === null) {
      URL.revokeObjectURL(temporaryUrl);
    }
  }, []);

  const triggerDocumentPrint = useCallback((companyName: string, docItem: WorkspaceDocumentItem): void => {
    if (docItem.objectUrl !== null) {
      const previewWindow = globalThis.open(docItem.objectUrl, "_blank", "noopener,noreferrer");
      if (previewWindow !== null) {
        previewWindow.focus();
        previewWindow.addEventListener("load", () => {
          previewWindow.print();
        }, { once: true });
      }
      return;
    }

    const printWindow = globalThis.open("", "_blank", "noopener,noreferrer");
    if (printWindow === null) {
      return;
    }

    printWindow.document.write([
      "<html><head><title>Document Preview</title></head><body style='font-family:Segoe UI,sans-serif;padding:20px;'>",
      `<h2>${docItem.name}</h2>`,
      `<p><strong>Company:</strong> ${companyName}</p>`,
      `<p><strong>Type:</strong> ${docItem.mimeType}</p>`,
      "<p>Preview is unavailable for this source document in-browser.</p>",
      "</body></html>",
    ].join(""));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, []);

  const handleDeleteDocument = useCallback((companyId: string, docItem: WorkspaceDocumentItem): void => {
    if (docItem.source === "upload") {
      setUploadedDocumentsByCompany((previous) => {
        const existing = previous[companyId] ?? [];
        const removed = existing.find((entry) => entry.id === docItem.id);
        const filtered = existing.filter((entry) => entry.id !== docItem.id);

        if (removed !== undefined) {
          URL.revokeObjectURL(removed.objectUrl);
        }

        return {
          ...previous,
          [companyId]: filtered,
        };
      });
    } else {
      setDismissedDocumentsByCompany((previous) => {
        const existing = previous[companyId] ?? [];
        if (existing.includes(docItem.name)) {
          return previous;
        }

        return {
          ...previous,
          [companyId]: [...existing, docItem.name],
        };
      });
    }

    setOpenedDocumentByCompany((previous) => {
      if (previous[companyId] !== docItem.id) {
        return previous;
      }

      const next = { ...previous };
      delete next[companyId];
      return next;
    });

  }, []);

  const toggleCreateNoteLabel = (labelId: string): void => {
    setNoteDraftLabels((previous) => {
      if (previous.includes(labelId)) {
        return previous.filter((entry) => entry !== labelId);
      }

      return [...previous, labelId];
    });
  };

  const toggleEditNoteLabel = (labelId: string): void => {
    setEditNoteLabels((previous) => {
      if (previous.includes(labelId)) {
        return previous.filter((entry) => entry !== labelId);
      }

      return [...previous, labelId];
    });
  };

  const handleAddNote = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (selectedCompany === null) {
      return;
    }

    const content = noteDraft.trim();
    if (content.length === 0) {
      return;
    }

    const title = content.length > 56 ? `${content.slice(0, 56)}...` : content;
    const newNote: CompanyNoteEntry = {
      id: `manual-note-${selectedCompany.id}-${Date.now()}`,
      title,
      content,
      createdAt: buildTimeLabel(),
      author: userProfile.fullName,
      status: "open",
      source: "manual",
      labels: [...noteDraftLabels],
      linkedEvent: noteDraftLinkedEvent.trim().length > 0 ? noteDraftLinkedEvent : null,
    };

    setUploadedNotesByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? [];
      return {
        ...previous,
        [selectedCompany.id]: [newNote, ...existing],
      };
    });

    setActiveNoteByCompany((previous) => ({
      ...previous,
      [selectedCompany.id]: newNote.id,
    }));
    setNoteDraft("");
    setNoteDraftLabels([]);
    setNoteDraftLinkedEvent("");
  };

  const handleAttachNoteFile = (event: ChangeEvent<HTMLInputElement>): void => {
    if (selectedCompany === null) {
      event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const mappedNotes = files
      .map((file, index): CompanyNoteEntry | null => {
        const normalizedName = file.name.trim();
        if (normalizedName.length === 0) {
          return null;
        }

        return {
          id: `file-note-${selectedCompany.id}-${Date.now()}-${index}`,
          title: normalizedName,
          content: `${text.noteAttachedPrefix}: ${normalizedName} (${formatFileSize(file.size)}) · ${
            language === "de" ? "Siehe Dokumente-Tab." : "See documents tab."
          }`,
          createdAt: buildTimeLabel(),
          author: userProfile.fullName,
          status: "open",
          source: "file",
          labels: [],
          linkedEvent: null,
        };
      })
      .filter((entry): entry is CompanyNoteEntry => entry !== null);

    if (mappedNotes.length === 0) {
      event.target.value = "";
      return;
    }

    setUploadedNotesByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? [];
      return {
        ...previous,
        [selectedCompany.id]: [...mappedNotes, ...existing],
      };
    });

    setActiveNoteByCompany((previous) => ({
      ...previous,
      [selectedCompany.id]: mappedNotes[0].id,
    }));

    setUploadedDocumentsByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? [];
      const existingNames = new Set(existing.map((entry) => entry.name.toLowerCase()));
      const next = [...existing];

      files.forEach((file, index) => {
        const normalizedName = file.name.trim();
        if (normalizedName.length === 0) return;
        const normalizedKey = normalizedName.toLowerCase();
        if (existingNames.has(normalizedKey)) return;

        next.unshift({
          id: `upload-note-${selectedCompany.id}-${Date.now()}-${index}`,
          name: normalizedName,
          mimeType: file.type.trim().length > 0 ? file.type : inferMimeTypeFromName(normalizedName),
          sizeLabel: formatFileSize(file.size),
          objectUrl: URL.createObjectURL(file),
          uploadedAt: buildTimeLabel(),
        });
        existingNames.add(normalizedKey);
      });

      return {
        ...previous,
        [selectedCompany.id]: next,
      };
    });

    event.target.value = "";
  };

  const handleSaveNoteEdit = (): void => {
    if (selectedCompany === null || activeNote === null || activeNote.source === "base") {
      return;
    }

    const trimmedTitle = editNoteTitle.trim();
    const trimmedContent = editNoteContent.trim();
    if (trimmedTitle.length === 0 || trimmedContent.length === 0) {
      return;
    }

    setUploadedNotesByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? [];
      const updated = existing.map((note) => {
        if (note.id !== activeNote.id) {
          return note;
        }

        return {
          ...note,
          title: trimmedTitle,
          content: trimmedContent,
          labels: [...editNoteLabels],
          linkedEvent: editNoteLinkedEvent.trim().length > 0 ? editNoteLinkedEvent : null,
        };
      });

      return {
        ...previous,
        [selectedCompany.id]: updated,
      };
    });
  };

  const handleMoveNoteStatus = (noteId: string, status: "open" | "closed"): void => {
    if (selectedCompany === null) {
      return;
    }

    setNoteStatusByCompany((previous) => ({
      ...previous,
      [selectedCompany.id]: {
        ...(previous[selectedCompany.id] ?? {}),
        [noteId]: status,
      },
    }));
  };

  const handleAddHypothesis = (entry: HypothesisEntry): void => {
    if (selectedCompany === null) return;
    setHypothesesByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? selectedCompany.hypotheses;
      return {
        ...previous,
        [selectedCompany.id]: [entry, ...existing],
      };
    });
  };

  const handleUpdateHypothesis = (index: number, entry: HypothesisEntry): void => {
    if (selectedCompany === null) return;
    setHypothesesByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? selectedCompany.hypotheses;
      const next = existing.map((hypothesis, i) => (i === index ? entry : hypothesis));
      return {
        ...previous,
        [selectedCompany.id]: next,
      };
    });
  };

  const handleDeleteHypothesis = (index: number): void => {
    if (selectedCompany === null) return;
    setHypothesesByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? selectedCompany.hypotheses;
      const next = existing.filter((_, i) => i !== index);
      return {
        ...previous,
        [selectedCompany.id]: next,
      };
    });
  };

  const handleMeetingAssigneeChange = (appointmentId: string, teamMemberId: string): void => {
    if (selectedCompany === null) {
      return;
    }

    setMeetingAssigneesByCompany((previous) => ({
      ...previous,
      [selectedCompany.id]: {
        ...(previous[selectedCompany.id] ?? {}),
        [appointmentId]: teamMemberId,
      },
    }));
  };

  const handleStartTeamEdit = (member: CompanyTeamMemberEntry): void => {
    setEditingTeamMemberId(member.id);
    setTeamEditFunction(member.functionName);
    setTeamEditName(member.fullName);
  };

  const handleCancelTeamEdit = (): void => {
    setEditingTeamMemberId("");
    setTeamEditFunction("");
    setTeamEditName("");
  };

  const handleSaveTeamEdit = (): void => {
    if (selectedCompany === null || editingTeamMemberId.length === 0) {
      return;
    }

    const normalizedFunction = teamEditFunction.trim();
    const normalizedName = teamEditName.trim();

    if (normalizedFunction.length === 0 || normalizedName.length === 0) {
      return;
    }

    setTeamMembersByCompany((previous) => {
      const existing = previous[selectedCompany.id] ?? buildCompanyTeamMembers(selectedCompany);
      const updated = existing.map((member) => {
        if (member.id !== editingTeamMemberId) {
          return member;
        }

        return {
          ...member,
          functionName: normalizedFunction,
          fullName: normalizedName,
        };
      });

      return {
        ...previous,
        [selectedCompany.id]: updated,
      };
    });

    handleCancelTeamEdit();
  };

  const renderDetailBody = (): JSX.Element | null => {
    if (selectedCompany === null) {
      return null;
    }
    const activeHypotheses = hypothesesByCompany[selectedCompany.id] ?? selectedCompany.hypotheses;

    if (activeTab === "overview") {
      const totalOpen = selectedCompany.openQuestions + selectedCompany.pendingMeetings;
      const avgResponseHours = Math.max(0.8, 3.2 - selectedCompany.pendingMeetings * 0.35);
      const completionRate = Math.max(52, 100 - totalOpen * 3);
      const priorityLabel = totalOpen >= 10
        ? text.kpiThreeHigh
        : totalOpen >= 6
          ? text.kpiThreeMedium
          : text.kpiThreeLow;
      const scopeProgress = [
        {
          id: "scope-discovery",
          label: text.scopeDiscovery,
          value: Math.min(100, Math.max(24, Math.round(34 + activeHypotheses.length * 17))),
        },
        {
          id: "scope-validation",
          label: text.scopeValidation,
          value: Math.min(100, Math.max(26, Math.round(completionRate - selectedCompany.pendingMeetings * 2))),
        },
        {
          id: "scope-delivery",
          label: text.scopeDelivery,
          value: Math.min(
            100,
            Math.max(22, Math.round(28 + selectedCompany.documents.length * 10 + selectedCompany.appointments.length * 7)),
          ),
        },
      ];
      const scopeCoverage = Math.round(
        scopeProgress.reduce((sum, item) => sum + item.value, 0) / Math.max(1, scopeProgress.length),
      );

      const nextAppointment = appointmentItems
        .slice()
        .sort((a, b) => a.dayIndex - b.dayIndex || a.timeLabel.localeCompare(b.timeLabel))[0];
      const weekDayLabels = weekdayLabelsByLanguage[language];

      const ovWidgets: Record<string, JSX.Element> = {
        metrics: (
          <div className="company-overview-block">
            <OverviewMetrics
              openQuestions={selectedCompany.openQuestions}
              completedQuestions={selectedCompany.completedQuestions}
              pendingMeetings={selectedCompany.pendingMeetings}
              completedMeetings={selectedCompany.completedMeetings}
              hypothesesCount={activeHypotheses.length}
              confirmedHypotheses={activeHypotheses.filter((h) => h.status === "confirmed").length}
              unconfirmedHypotheses={activeHypotheses.filter((h) => h.status === "unconfirmed").length}
              language={language}
            />
            <div className="company-overview-focus-grid">
              <article className="company-overview-focus-card">
                <span>{text.openLabel}</span>
                <strong>{selectedCompany.openQuestions}</strong>
                <small>{language === "de" ? "Offene Fragen im Backlog" : "Open questions in backlog"}</small>
              </article>
              <article className="company-overview-focus-card">
                <span>{text.meetingsLabel}</span>
                <strong>{selectedCompany.pendingMeetings}</strong>
                <small>{language === "de" ? "Ausstehende Meeting-Entscheidungen" : "Pending meeting decisions"}</small>
              </article>
            </div>
          </div>
        ),
        events: (
          <div className="company-overview-block company-overview-block--events">
            <h4>{text.recentEventsTitle}</h4>
            {nextAppointment !== undefined && (
              <div className="ov-next-appointment">
                <span className="ov-next-apt-badge">
                  {language === "de" ? "Nächster Termin" : "Next meeting"}
                </span>
                <div className="ov-next-apt-body">
                  <time>{weekDayLabels[nextAppointment.dayIndex]} · {nextAppointment.timeLabel}</time>
                  <strong>{nextAppointment.title}</strong>
                  {nextAppointment.attendees.length > 0 && (
                    <div className="ov-next-apt-attendees">
                      {nextAppointment.attendees.map((a) => (
                        <span key={a} className="ov-apt-chip">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <ul className="company-detail-list company-detail-list-lined">
              {selectedCompany.recentEvents.map((eventText) => {
                const colonIdx = eventText.indexOf(":");
                const hasLabel = colonIdx > 0 && colonIdx < 20;
                return (
                  <li key={eventText} className="recent-event-item">
                    <span className="recent-event-dot" aria-hidden="true" />
                    {hasLabel ? (
                      <>
                        <span className="recent-event-time">{eventText.slice(0, colonIdx)}</span>
                        <span className="recent-event-text">{eventText.slice(colonIdx + 1).trimStart()}</span>
                      </>
                    ) : (
                      <span className="recent-event-text">{eventText}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ),
        scopes: (
          <div className="company-overview-scopes-wrap">
            <div className="company-overview-block company-overview-progress-block">
              <h4>{text.overviewScopeTitle}</h4>
              <ul className="company-scope-progress-list">
                {scopeProgress.map((scope) => (
                  <li key={scope.id}>
                    <div className="company-scope-progress-head">
                      <span>{scope.label}</span>
                      <strong>{scope.value}%</strong>
                    </div>
                    <div className="company-scope-progress-track" aria-label={`${scope.label} ${scope.value}%`}>
                      <span className="company-scope-progress-fill" style={{ width: `${scope.value}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="company-overview-priority-stack">
              <article className="company-overview-kpi-card company-overview-kpi-card-spotlight">
                <span>{text.kpiThreeLabel}</span>
                <strong>{priorityLabel}</strong>
                <small>{text.kpiThreeHint}</small>
              </article>
              <article className="company-overview-kpi-card company-overview-kpi-card-spotlight">
                <span>{text.kpiFourLabel}</span>
                <strong>{scopeCoverage}%</strong>
                <small>{text.kpiFourHint}</small>
              </article>
            </div>
          </div>
        ),
        kpis: (
          <div className="company-overview-kpi-grid">
            <article className="company-overview-kpi-card">
              <span>{text.kpiOneLabel}</span>
              <strong>{avgResponseHours.toFixed(1)}h</strong>
              <small>{text.kpiOneHint}</small>
            </article>
            <article className="company-overview-kpi-card">
              <span>{text.kpiTwoLabel}</span>
              <strong>{completionRate}%</strong>
              <small>{text.kpiTwoHint}</small>
            </article>
            <article className="company-overview-kpi-card">
              <span>{text.openLabel}</span>
              <strong>{selectedCompany.openQuestions}</strong>
              <small>{text.openKpiHint}</small>
            </article>
            <article className="company-overview-kpi-card">
              <span>{text.meetingsLabel}</span>
              <strong>{selectedCompany.pendingMeetings}</strong>
              <small>{text.meetingsKpiHint}</small>
            </article>
          </div>
        ),
      };

      return (
        <div className="company-overview-widget-stack">
          {overviewWidgetOrder.map((id, idx) => (
            <div
              key={id}
              className={[
                "ov-widget",
                ovDragActive === id ? "ov-widget--dragging" : "",
                ovDragOver === id && ovDragActive !== id ? "ov-widget--drag-over" : "",
              ].filter(Boolean).join(" ")}
              draggable
              onDragStart={() => handleOvDragStart(id)}
              onDragOver={(e) => { e.preventDefault(); handleOvDragOver(id); }}
              onDrop={handleOvDrop}
              onDragEnd={handleOvDragEnd}
            >
              <div className="ov-widget-controls">
                <span className="ov-drag-handle" aria-hidden="true">⠿</span>
                <div className="ov-move-btns">
                  <button
                    type="button"
                    className="ov-move-btn"
                    disabled={idx === 0}
                    onClick={() => handleOvMoveUp(id)}
                    aria-label="Move up"
                  >▲</button>
                  <button
                    type="button"
                    className="ov-move-btn"
                    disabled={idx === overviewWidgetOrder.length - 1}
                    onClick={() => handleOvMoveDown(id)}
                    aria-label="Move down"
                  >▼</button>
                </div>
              </div>
              {ovWidgets[id]}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "portfolio") {
      const auraScore = Math.min(98, 72 + selectedCompany.documents.length * 4 + activeHypotheses.length * 3);
      const comparisonTools = [
        {
          name: "AURA",
          isAura: true,
          personaDepth: Math.min(100, 80 + activeHypotheses.length * 5),
          responseSpeed: Math.max(0.8, 3.2 - selectedCompany.pendingMeetings * 0.3),
          knowledgeScope: auraScore,
          meetingContext: language === "de" ? "Vollständig" : "Full",
          contextRich: true,
        },
        {
          name: "Salesforce",
          isAura: false,
          personaDepth: 61,
          responseSpeed: 4.1,
          knowledgeScope: 68,
          meetingContext: language === "de" ? "Basis" : "Basic",
          contextRich: false,
        },
        {
          name: "HubSpot",
          isAura: false,
          personaDepth: 54,
          responseSpeed: 3.4,
          knowledgeScope: 71,
          meetingContext: language === "de" ? "Keins" : "None",
          contextRich: false,
        },
      ];

      const featureLabel = language === "de"
        ? { persona: "Persona-Tiefe", speed: "Antwortzeit", scope: "Wissensabdeckung", ctx: "Meeting-Kontext" }
        : { persona: "Persona depth", speed: "Response time", scope: "Knowledge scope", ctx: "Meeting context" };
      const speedUnit = "s";
      const scopeUnit = "%";
      const totalOpen = selectedCompany.openQuestions + selectedCompany.pendingMeetings;
      const totalCompleted = selectedCompany.completedQuestions + selectedCompany.completedMeetings;
      const confirmedHypo = activeHypotheses.filter((h) => h.status === "confirmed").length;

      const churnRisk = Math.min(82, Math.max(5, totalOpen * 4 + selectedCompany.pendingMeetings * 5));
      const nrr = Math.round(
        Math.min(138, Math.max(80, 108 + selectedCompany.completedMeetings * 2 - selectedCompany.pendingMeetings * 3)),
      );
      const arrGrowth = Math.round(Math.min(44, Math.max(3, 13 + confirmedHypo * 5 - totalOpen * 0.6)));
      const upsellRate = Math.round(Math.min(86, Math.max(12, 36 + activeHypotheses.length * 8)));
      const dealVelocity = Math.round(Math.min(58, Math.max(9, 40 - totalCompleted * 0.5 + totalOpen * 1.1)));
      const healthScore = Math.round(Math.min(97, Math.max(38, 84 - totalOpen * 2.4 + totalCompleted * 0.4)));

      const genSpark = (end: number, trend: "up" | "down" | "neutral", seed: number): number[] => {
        const pts: number[] = [];
        let v = trend === "up" ? end * 0.55 : trend === "down" ? end * 1.45 : end * 0.85;
        for (let i = 0; i < 8; i++) {
          const noise = ((((seed * (i + 1) * 7919) % 100) / 100) - 0.5) * end * 0.22;
          v += (end - v) * 0.28 + noise;
          pts.push(Math.max(0, Math.min(end * 1.6, v)));
        }
        pts.push(end);
        return pts;
      };

      const performanceRows = [
        {
          id: "churn",
          label: language === "de" ? "Churn-Risiko" : "Churn Risk",
          value: churnRisk,
          unit: "%",
          note: language === "de" ? "↓ Ziel <20%" : "↓ Target <20%",
          trend: churnRisk < 20 ? "up" : churnRisk > 45 ? "down" : "neutral",
          barPct: churnRisk,
          spark: genSpark(churnRisk, churnRisk < 20 ? "up" : churnRisk > 45 ? "down" : "neutral", 3),
        },
        {
          id: "nrr",
          label: "NRR",
          value: nrr,
          unit: "%",
          note: language === "de" ? "Ziel >100%" : "Target >100%",
          trend: nrr >= 105 ? "up" : nrr < 95 ? "down" : "neutral",
          barPct: Math.min(100, nrr - 50),
          spark: genSpark(nrr, nrr >= 105 ? "up" : nrr < 95 ? "down" : "neutral", 7),
        },
        {
          id: "arr",
          label: language === "de" ? "ARR-Wachstum" : "ARR Growth",
          value: arrGrowth,
          unit: "%",
          note: language === "de" ? "YoY" : "YoY",
          trend: arrGrowth >= 15 ? "up" : arrGrowth < 7 ? "down" : "neutral",
          barPct: arrGrowth,
          spark: genSpark(arrGrowth, arrGrowth >= 15 ? "up" : arrGrowth < 7 ? "down" : "neutral", 11),
        },
        {
          id: "upsell",
          label: language === "de" ? "Upsell-Rate" : "Upsell Rate",
          value: upsellRate,
          unit: "%",
          note: language === "de" ? "Potenzial identifiziert" : "Potential identified",
          trend: upsellRate >= 50 ? "up" : upsellRate < 28 ? "down" : "neutral",
          barPct: upsellRate,
          spark: genSpark(upsellRate, upsellRate >= 50 ? "up" : upsellRate < 28 ? "down" : "neutral", 13),
        },
        {
          id: "velocity",
          label: language === "de" ? "Deal-Velocity" : "Deal Velocity",
          value: dealVelocity,
          unit: language === "de" ? " Tage" : " days",
          note: language === "de" ? "↓ Ziel <25 Tage" : "↓ Target <25 days",
          trend: dealVelocity < 25 ? "up" : dealVelocity > 42 ? "down" : "neutral",
          barPct: Math.max(0, 100 - dealVelocity * 2),
          spark: genSpark(dealVelocity, dealVelocity < 25 ? "up" : dealVelocity > 42 ? "down" : "neutral", 17),
        },
        {
          id: "health",
          label: "Health Score",
          value: healthScore,
          unit: "/100",
          note: language === "de" ? "Account-Gesundheit" : "Account health",
          trend: healthScore >= 72 ? "up" : healthScore < 52 ? "down" : "neutral",
          barPct: healthScore,
          spark: genSpark(healthScore, healthScore >= 72 ? "up" : healthScore < 52 ? "down" : "neutral", 19),
        },
      ] as const;

      const sparkPolyline = (pts: number[]): string => {
        const W = 80;
        const H = 32;
        const max = Math.max(...pts) || 1;
        const min = Math.min(...pts);
        const range = max - min || 1;
        return pts
          .map((v, i) => {
            const x = (i / (pts.length - 1)) * W;
            const y = H - ((v - min) / range) * (H - 4);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
      };

      return (
        <div className="port-layout">
          <div className="port-summary">{selectedCompany.portfolioSummary}</div>
          <div className="port-comparison">
            {comparisonTools.map((tool) => (
              <div key={tool.name} className={`port-tool-card${tool.isAura ? " port-tool-card--aura" : ""}`}>
                <div className="port-tool-header">
                  <span className="port-tool-name">{tool.name}</span>
                  {tool.isAura && <span className="port-tool-badge">{language === "de" ? "Aktiv" : "Active"}</span>}
                </div>
                <div className="port-tool-metrics">
                  <div className="port-tool-metric">
                    <span>{featureLabel.persona}</span>
                    <div className="port-bar-track">
                      <div className="port-bar-fill" style={{ width: `${tool.personaDepth}%`, opacity: tool.isAura ? 1 : 0.55 }} />
                    </div>
                    <strong>{tool.personaDepth}%</strong>
                  </div>
                  <div className="port-tool-metric">
                    <span>{featureLabel.speed}</span>
                    <div className="port-bar-track">
                      <div
                        className="port-bar-fill port-bar-fill--speed"
                        style={{ width: `${Math.min(100, ((5 - tool.responseSpeed) / 4.2) * 100)}%`, opacity: tool.isAura ? 1 : 0.55 }}
                      />
                    </div>
                    <strong>{tool.responseSpeed.toFixed(1)}{speedUnit}</strong>
                  </div>
                  <div className="port-tool-metric">
                    <span>{featureLabel.scope}</span>
                    <div className="port-bar-track">
                      <div
                        className="port-bar-fill"
                        style={{ width: `${tool.knowledgeScope}${scopeUnit}`, opacity: tool.isAura ? 1 : 0.55 }}
                      />
                    </div>
                    <strong>{tool.knowledgeScope}{scopeUnit}</strong>
                  </div>
                  <div className="port-tool-metric port-tool-metric--ctx">
                    <span>{featureLabel.ctx}</span>
                    <span className={`port-ctx-badge${tool.contextRich ? " port-ctx-badge--rich" : ""}`}>
                      {tool.contextRich ? "✓ " : "○ "}{tool.meetingContext}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="portfolio-performance-wrap">
            <div className="perf-headline">
              <h4>{text.performanceTitle}</h4>
              <span className="perf-period">{language === "de" ? "Laufende Periode" : "Current period"}</span>
            </div>
            <div className="perf-grid">
              {performanceRows.map((metric) => (
                <article className={`perf-card perf-card--${metric.trend}`} key={metric.id}>
                  <div className="perf-card-top">
                    <span className="perf-card-label">{metric.label}</span>
                    <span className={`perf-trend-badge perf-trend-badge--${metric.trend}`}>
                      {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
                    </span>
                  </div>
                  <div className="perf-card-value">
                    <strong>{metric.value}</strong>
                    <small>{metric.unit}</small>
                  </div>
                  <svg className="perf-spark" viewBox="0 0 80 32" aria-hidden="true" preserveAspectRatio="none">
                    <polyline
                      points={sparkPolyline(metric.spark)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`perf-spark-line perf-spark-line--${metric.trend}`}
                    />
                  </svg>
                  <div className="perf-track">
                    <div className={`perf-fill perf-fill--${metric.trend}`} style={{ width: `${metric.barPct}%` }} />
                  </div>
                  {metric.note && <span className="perf-card-note">{metric.note}</span>}
                </article>
              ))}
            </div>
            <p className="company-performance-summary">
              <strong>{text.perfSummaryLabel}: </strong>
              {selectedCompany.performanceSummary}
            </p>
          </div>
        </div>
      );
    }

    if (activeTab === "performance") {
      const totalOpen = selectedCompany.openQuestions + selectedCompany.pendingMeetings;
      const totalCompleted = selectedCompany.completedQuestions + selectedCompany.completedMeetings;
      const confirmedHypo = activeHypotheses.filter((h) => h.status === "confirmed").length;

      const churnRisk    = Math.min(82, Math.max(5,  totalOpen * 4 + selectedCompany.pendingMeetings * 5));
      const nrr = Math.round(
        Math.min(138, Math.max(80, 108 + selectedCompany.completedMeetings * 2 - selectedCompany.pendingMeetings * 3))
      );
      const arrGrowth    = Math.round(Math.min(44,  Math.max(3,  13 + confirmedHypo * 5 - totalOpen * 0.6)));
      const upsellRate   = Math.round(Math.min(86,  Math.max(12, 36 + activeHypotheses.length * 8)));
      const dealVelocity = Math.round(Math.min(58,  Math.max(9,  40 - totalCompleted * 0.5 + totalOpen * 1.1)));
      const healthScore  = Math.round(Math.min(97,  Math.max(38, 84 - totalOpen * 2.4 + totalCompleted * 0.4)));

      const genSpark = (end: number, trend: "up" | "down" | "neutral", seed: number): number[] => {
        const pts: number[] = [];
        let v = trend === "up" ? end * 0.55 : trend === "down" ? end * 1.45 : end * 0.85;
        for (let i = 0; i < 8; i++) {
          const noise = ((((seed * (i + 1) * 7919) % 100) / 100) - 0.5) * end * 0.22;
          v += (end - v) * 0.28 + noise;
          pts.push(Math.max(0, Math.min(end * 1.6, v)));
        }
        pts.push(end);
        return pts;
      }

      const performanceRows = [
        {
          id: "churn",
          label: language === "de" ? "Churn-Risiko" : "Churn Risk",
          value: churnRisk,
          unit: "%",
          note: language === "de" ? "↓ Ziel <20%" : "↓ Target <20%",
          trend: churnRisk < 20 ? "up" : churnRisk > 45 ? "down" : "neutral",
          barPct: churnRisk,
          spark: genSpark(churnRisk, churnRisk < 20 ? "up" : churnRisk > 45 ? "down" : "neutral", 3),
        },
        {
          id: "nrr",
          label: "NRR",
          value: nrr,
          unit: "%",
          note: language === "de" ? "Ziel >100%" : "Target >100%",
          trend: nrr >= 105 ? "up" : nrr < 95 ? "down" : "neutral",
          barPct: Math.min(100, nrr - 50),
          spark: genSpark(nrr, nrr >= 105 ? "up" : nrr < 95 ? "down" : "neutral", 7),
        },
        {
          id: "arr",
          label: language === "de" ? "ARR-Wachstum" : "ARR Growth",
          value: arrGrowth,
          unit: "%",
          note: language === "de" ? "YoY" : "YoY",
          trend: arrGrowth >= 15 ? "up" : arrGrowth < 7 ? "down" : "neutral",
          barPct: arrGrowth,
          spark: genSpark(arrGrowth, arrGrowth >= 15 ? "up" : arrGrowth < 7 ? "down" : "neutral", 11),
        },
        {
          id: "upsell",
          label: language === "de" ? "Upsell-Rate" : "Upsell Rate",
          value: upsellRate,
          unit: "%",
          note: language === "de" ? "Potenzial identifiziert" : "Potential identified",
          trend: upsellRate >= 50 ? "up" : upsellRate < 28 ? "down" : "neutral",
          barPct: upsellRate,
          spark: genSpark(upsellRate, upsellRate >= 50 ? "up" : upsellRate < 28 ? "down" : "neutral", 13),
        },
        {
          id: "velocity",
          label: language === "de" ? "Deal-Velocity" : "Deal Velocity",
          value: dealVelocity,
          unit: language === "de" ? " Tage" : " days",
          note: language === "de" ? "↓ Ziel <25 Tage" : "↓ Target <25 days",
          trend: dealVelocity < 25 ? "up" : dealVelocity > 42 ? "down" : "neutral",
          barPct: Math.max(0, 100 - dealVelocity * 2),
          spark: genSpark(dealVelocity, dealVelocity < 25 ? "up" : dealVelocity > 42 ? "down" : "neutral", 17),
        },
        {
          id: "health",
          label: "Health Score",
          value: healthScore,
          unit: "/100",
          note: language === "de" ? "Account-Gesundheit" : "Account health",
          trend: healthScore >= 72 ? "up" : healthScore < 52 ? "down" : "neutral",
          barPct: healthScore,
          spark: genSpark(healthScore, healthScore >= 72 ? "up" : healthScore < 52 ? "down" : "neutral", 19),
        },
      ];

      const sparkPolyline = (pts: number[]): string => {
        const W = 80, H = 32;
        const max = Math.max(...pts) || 1;
        const min = Math.min(...pts);
        const range = max - min || 1;
        return pts
          .map((v, i) => {
            const x = (i / (pts.length - 1)) * W;
            const y = H - ((v - min) / range) * (H - 4);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
      }

      return (
        <div className="perf-layout">
          <div className="perf-headline">
            <h4>{text.performanceTitle}</h4>
            <span className="perf-period">{language === "de" ? "Laufende Periode" : "Current period"}</span>
          </div>
          <div className="perf-grid">
            {performanceRows.map((metric) => (
              <article className={`perf-card perf-card--${metric.trend}`} key={metric.id}>
                <div className="perf-card-top">
                  <span className="perf-card-label">{metric.label}</span>
                  <span className={`perf-trend-badge perf-trend-badge--${metric.trend}`}>
                    {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
                  </span>
                </div>
                <div className="perf-card-value">
                  <strong>{metric.value}</strong>
                  <small>{metric.unit}</small>
                </div>
                <svg className="perf-spark" viewBox="0 0 80 32" aria-hidden="true" preserveAspectRatio="none">
                  <polyline
                    points={sparkPolyline(metric.spark)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`perf-spark-line perf-spark-line--${metric.trend}`}
                  />
                </svg>
                <div className="perf-track">
                  <div className={`perf-fill perf-fill--${metric.trend}`} style={{ width: `${metric.barPct}%` }} />
                </div>
                {metric.note && <span className="perf-card-note">{metric.note}</span>}
              </article>
            ))}
          </div>
          <p className="company-performance-summary">
            <strong>{text.perfSummaryLabel}: </strong>
            {selectedCompany.performanceSummary}
          </p>
        </div>
      );
    }

    if (activeTab === "documents") {
      const uploadedDocuments = uploadedDocumentsByCompany[selectedCompany.id] ?? [];
      const dismissedNames = new Set(
        (dismissedDocumentsByCompany[selectedCompany.id] ?? []).map((name) => name.toLowerCase()),
      );
      const baseDocuments: WorkspaceDocumentItem[] = selectedCompany.documents
        .filter((name) => !dismissedNames.has(name.toLowerCase()))
        .map((name, index) => ({
          id: `base-document-${selectedCompany.id}-${index}`,
          name,
          source: "base",
          mimeType: inferMimeTypeFromName(name),
          sizeLabel: "-",
          objectUrl: null,
          uploadedAt: "-",
        }));
      const uploadedDocumentItems: WorkspaceDocumentItem[] = uploadedDocuments
        .filter((entry) => !dismissedNames.has(entry.name.toLowerCase()))
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          source: "upload",
          mimeType: entry.mimeType,
          sizeLabel: entry.sizeLabel,
          objectUrl: entry.objectUrl,
          uploadedAt: entry.uploadedAt,
        }));
      const allDocuments = [...uploadedDocumentItems, ...baseDocuments];
      const docQuery = documentSearch.trim().toLowerCase();
      const visibleDocuments = docQuery.length === 0
        ? allDocuments
        : allDocuments.filter((item) => item.name.toLowerCase().includes(docQuery));
      const openedDocumentId = openedDocumentByCompany[selectedCompany.id] ?? "";
      const openedDocument =
        allDocuments.find((item) => item.id === openedDocumentId) ?? null;

      return (
        <div className="company-documents-panel">
          <div className="company-documents-toolbar">
            <input
              type="search"
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder={text.fileSearch}
              aria-label={text.fileSearch}
            />

            <button
              type="button"
              onClick={() => {
                documentFileInputRef.current?.click();
              }}
            >
              {text.addFile}
            </button>

            <input
              ref={documentFileInputRef}
              className="company-file-input"
              type="file"
              multiple
              onChange={handleDocumentUpload}
            />
          </div>

          <p className="company-documents-hint">{text.documentsHint}</p>
          <div className="company-documents-layout">
            <div className="company-documents-list">
              {visibleDocuments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`company-document-btn${openedDocumentId === item.id ? " is-opened" : ""}`}
                  onClick={() => {
                    setOpenedDocumentByCompany((prev) => ({ ...prev, [selectedCompany.id]: item.id }));
                  }}
                >
                  <span>{item.name}</span>
                  <small>{item.sizeLabel !== "-" ? `${item.sizeLabel} · ${item.mimeType}` : item.mimeType}</small>
                </button>
              ))}
              {visibleDocuments.length === 0 ? <p className="company-documents-hint">{text.noDocumentResult}</p> : null}
            </div>

            <article className="company-document-preview-panel">
              <h4>{text.previewTitle}</h4>
              {openedDocument === null ? (
                <p className="company-document-preview-empty">{text.previewEmpty}</p>
              ) : (
                <div className="company-document-preview-body">
                  <p className="company-document-preview-name">{openedDocument.name}</p>
                  <p className="company-document-preview-meta">
                    {openedDocument.sizeLabel !== "-" ? `${openedDocument.sizeLabel} · ` : ""}
                    {openedDocument.mimeType}
                  </p>

                  {openedDocument.objectUrl !== null && openedDocument.mimeType.startsWith("image/") ? (
                    <img src={openedDocument.objectUrl} alt={openedDocument.name} className="company-document-preview-image" />
                  ) : null}
                  {openedDocument.objectUrl !== null && openedDocument.mimeType === "application/pdf" ? (
                    <iframe src={openedDocument.objectUrl} title={openedDocument.name} className="company-document-preview-frame" />
                  ) : null}
                  {openedDocument.objectUrl === null ? (
                    <div className="company-document-preview-placeholder">
                      <p>{text.unknownFileType}</p>
                      <small>{text.openPreviewHint}</small>
                    </div>
                  ) : null}

                  <div className="company-document-actions">
                    <button type="button" onClick={() => triggerDocumentDownload(selectedCompany.name, openedDocument)}>
                      {text.downloadFile}
                    </button>
                    <button type="button" onClick={() => triggerDocumentPrint(selectedCompany.name, openedDocument)}>
                      {text.printFile}
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => handleDeleteDocument(selectedCompany.id, openedDocument)}
                    >
                      {text.deleteFile}
                    </button>
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>
      );
    }

    if (activeTab === "hypotheses") {
      return (
        <CompanyHypothesesTab
          hypotheses={activeHypotheses}
          language={language}
          onAddHypothesis={handleAddHypothesis}
          onUpdateHypothesis={handleUpdateHypothesis}
          onDeleteHypothesis={handleDeleteHypothesis}
        />
      );
    }

    if (activeTab === "appointments") {
      const companyAssignees = meetingAssigneesByCompany[selectedCompany.id] ?? {};

      return (
        <CompanyAppointmentsTab
          language={language}
          text={text}
          appointmentItems={appointmentItems}
          visibleDayIndices={visibleDayIndices}
          activeTeamMembers={activeTeamMembers}
          companyAssignees={companyAssignees}
          onAssigneeChange={handleMeetingAssigneeChange}
        />
      );
    }

    if (activeTab === "notes") {
      return (
        <CompanyNotesTab
          text={text}
          notesForSelectedCompany={notesForSelectedCompany}
          activeNoteId={activeNoteId}
          activeNote={activeNote}
          noteLabelLookup={noteLabelLookup}
          appointmentItems={appointmentItems}
          appointmentLabelById={appointmentLabelById}
          noteFileInputRef={noteFileInputRef}
          onAttachNoteFile={handleAttachNoteFile}
          onSelectNote={(noteId) => {
            setActiveNoteByCompany((previous) => ({
              ...previous,
              [selectedCompany.id]: noteId,
            }));
          }}
          onMoveNoteStatus={handleMoveNoteStatus}
          editNoteTitle={editNoteTitle}
          editNoteContent={editNoteContent}
          editNoteLabels={editNoteLabels}
          editNoteLinkedEvent={editNoteLinkedEvent}
          onEditNoteTitleChange={setEditNoteTitle}
          onEditNoteContentChange={setEditNoteContent}
          onToggleEditNoteLabel={toggleEditNoteLabel}
          onEditNoteLinkedEventChange={setEditNoteLinkedEvent}
          onSaveNoteEdit={handleSaveNoteEdit}
          noteDraft={noteDraft}
          noteDraftLabels={noteDraftLabels}
          noteDraftLinkedEvent={noteDraftLinkedEvent}
          onNoteDraftChange={setNoteDraft}
          onToggleCreateNoteLabel={toggleCreateNoteLabel}
          onNoteDraftLinkedEventChange={setNoteDraftLinkedEvent}
          onAddNote={handleAddNote}
        />
      );
    }

    if (activeTab === "team") {
      return (
        <CompanyTeamTab
          text={text}
          selectedCompany={selectedCompany}
          activeTeamMembers={activeTeamMembers}
          editingTeamMemberId={editingTeamMemberId}
          teamEditFunction={teamEditFunction}
          teamEditName={teamEditName}
          onTeamEditFunctionChange={setTeamEditFunction}
          onTeamEditNameChange={setTeamEditName}
          onStartTeamEdit={handleStartTeamEdit}
          onSaveTeamEdit={handleSaveTeamEdit}
          onCancelTeamEdit={handleCancelTeamEdit}
        />
      );
    }

    return (
      <ul className="company-detail-list company-detail-list-lined">
        {selectedCompany.newsfeed.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  };

  return (
    <section className="company-workspace-panel" aria-label={text.title}>
      <header className="company-workspace-header">
        {!isSidebarOpen && (
          <button
            type="button"
            className="workspace-sidebar-trigger"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div className="company-workspace-title-row">
          <h2>{text.title}</h2>
          <div className="company-assigned-role company-assigned-role-inline" aria-label="Role">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <strong>{text.roles[assignedRole]}</strong>
          </div>
        </div>

        <div className="company-workspace-header-right">
          <button
            type="button"
            className="profile-chip profile-chip-btn profile-chip-workspace"
            aria-label="Open profile"
            onClick={onOpenProfile}
          >
            <div className="profile-avatar" aria-hidden="true" title={userProfile.fullName}>
              {userProfile.initials}
            </div>
          </button>
        </div>
      </header>

      <div className={`company-workspace-grid${isListPaneCollapsed ? " is-list-pane-collapsed" : ""}`}>
        <aside className="company-list-column">
          <article
            className={`company-box-card company-box-card-stacked company-collapsible${isRecentExpanded ? " is-expanded" : ""}`}
          >
            <button
              type="button"
              className="company-collapsible-toggle"
              aria-expanded={isRecentExpanded}
              onClick={() => setIsRecentExpanded((previous) => !previous)}
            >
              <h3>{text.recentlyVisited}</h3>
              <svg
                className="company-collapsible-chevron"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="company-collapsible-body">
              <ul className="company-sublist-scroll" aria-label={text.recentlyVisited}>
                {recentCompanies.map((company) => (
                  <li key={company.id}>
                    <button
                      type="button"
                      className={`company-sublist-item-btn${company.id === selectedCompanyId ? " is-active" : ""}`}
                      onClick={() => setSelectedCompanyId(company.id)}
                    >
                      <span className="company-sublist-main-row">
                        <span className="company-list-avatar" aria-hidden="true">{getCompanyInitials(company.name)}</span>
                        <span className="company-sublist-main">{company.name}</span>
                      </span>
                      <span className="company-sublist-time">{company.lastVisited}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article
            className={`company-box-card company-box-card-stacked company-collapsible${isFavoritesExpanded ? " is-expanded" : ""}`}
          >
            <button
              type="button"
              className="company-collapsible-toggle"
              aria-expanded={isFavoritesExpanded}
              onClick={() => setIsFavoritesExpanded((previous) => !previous)}
            >
              <h3>{text.favorites}</h3>
              <svg
                className="company-collapsible-chevron"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="company-collapsible-body">
              <ul className="company-sublist-scroll" aria-label={text.favorites}>
                {favoriteCompanies.map((company) => (
                  <li key={company.id}>
                    <button
                      type="button"
                      className={`company-sublist-item-btn${company.id === selectedCompanyId ? " is-active" : ""}`}
                      onClick={() => setSelectedCompanyId(company.id)}
                    >
                      <span className="company-sublist-main-row">
                        <span className="company-list-avatar" aria-hidden="true">{getCompanyInitials(company.name)}</span>
                        <span className="company-sublist-main">{company.name}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article
            className="company-box-card company-box-card-stacked"
          >
            <h3>{text.searchLabel}</h3>
            <CompanyList
              companies={filteredCompanies}
              selectedCompanyId={selectedCompanyId}
              onSelectCompany={setSelectedCompanyId}
              searchPlaceholder={text.searchPlaceholder}
              searchLabel={text.searchLabel}
              noResult={text.noResult}
            />
          </article>
        </aside>

        <section className="company-detail-column" aria-label="Company dashboard">
          {selectedCompany === null ? (
            <p>{text.noResult}</p>
          ) : (
            <>
              <header className="company-detail-header">
                <div className="company-detail-title-row">
                  <span className="company-list-avatar" aria-hidden="true">
                    {getCompanyInitials(selectedCompany.name)}
                  </span>
                  <div>
                    <h3>{selectedCompany.name}</h3>
                    <p>{selectedCompany.segment}</p>
                  </div>
                </div>

                <ul className="company-detail-metrics-inline">
                  <li>{text.ownerLabel}: {selectedCompany.owner}</li>
                  <li>{text.openLabel}: {selectedCompany.openQuestions}</li>
                  <li>{text.meetingsLabel}: {selectedCompany.pendingMeetings}</li>
                </ul>
              </header>

              <div
                ref={tabRowRef}
                className={`company-tab-row${tabDragScroll.isDragging ? " is-dragging" : ""}`}
                role="tablist"
                aria-label="Company dashboard tabs"
                {...tabDragScroll.handlers}
              >
                {visibleTabs.map((tabId) => (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={tabId === activeTab}
                    className={`company-tab-btn${tabId === activeTab ? " is-active" : ""}`}
                    onClick={() => {
                      if (tabDragScroll.hasMoved()) {
                        return;
                      }
                      setActiveTab(tabId);
                    }}
                  >
                    {text.tabs[tabId]}
                  </button>
                ))}
              </div>

              <section className="company-detail-section">{renderDetailBody()}</section>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
