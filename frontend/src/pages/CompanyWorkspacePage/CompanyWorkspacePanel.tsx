import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { userProfile } from "../../shared/data/userProfile";
import { CompanyAppointmentsTab } from "./CompanyAppointmentsTab";
import { CompanyNotesTab } from "./CompanyNotesTab";
import { CompanyTeamTab } from "./CompanyTeamTab";
import { OverviewPie } from "./OverviewPie";
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

export function CompanyWorkspacePanel({ language, onOpenProfile }: CompanyWorkspacePanelProps) {
  const text = useMemo(() => getCompanyWorkspaceText(language), [language]);

  const [assignedRole] = useState(readDbAssignedRole);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<CompanyTab>("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isRecentExpanded, setIsRecentExpanded] = useState<boolean>(true);
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState<boolean>(true);
  const [isCompanyListExpanded, setIsCompanyListExpanded] = useState<boolean>(true);

  const [uploadedDocumentsByCompany, setUploadedDocumentsByCompany] = useState<
    Record<string, UploadedCompanyDocument[]>
  >({});
  const [dismissedDocumentsByCompany, setDismissedDocumentsByCompany] = useState<Record<string, string[]>>({});
  const [openedDocumentByCompany, setOpenedDocumentByCompany] = useState<Record<string, string>>({});
  const [focusedDocumentByCompany, setFocusedDocumentByCompany] = useState<Record<string, string>>({});
  const [documentSearch, setDocumentSearch] = useState<string>("");

  const [uploadedNotesByCompany, setUploadedNotesByCompany] = useState<Record<string, CompanyNoteEntry[]>>({});
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
      source: "base",
      labels: [],
      linkedEvent: null,
    }));

    const attachedNotes = uploadedNotesByCompany[selectedCompany.id] ?? [];
    return [...attachedNotes, ...baseNotes];
  }, [selectedCompany, uploadedNotesByCompany]);

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

  const visibleTabs = tabVisibilityByRole[assignedRole];

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

    setFocusedDocumentByCompany((previous) => {
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
          content: `${text.noteAttachedPrefix}: ${normalizedName} (${formatFileSize(file.size)})`,
          createdAt: buildTimeLabel(),
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
          value: Math.min(100, Math.max(24, Math.round(34 + selectedCompany.hypotheses.length * 17))),
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

      return (
        <div className="company-overview-layout">
          <div className="company-overview-block">
            <OverviewPie
              openQuestions={selectedCompany.openQuestions}
              pendingMeetings={selectedCompany.pendingMeetings}
              language={language}
            />
          </div>

          <div className="company-overview-block">
            <h4>{text.recentEventsTitle}</h4>
            <ul className="company-detail-list company-detail-list-lined">
              {selectedCompany.recentEvents.map((eventText) => (
                <li key={eventText}>{eventText}</li>
              ))}
            </ul>
          </div>

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
        </div>
      );
    }

    if (activeTab === "portfolio") {
      return <p>{selectedCompany.portfolioSummary}</p>;
    }

    if (activeTab === "performance") {
      const totalOpen = selectedCompany.openQuestions + selectedCompany.pendingMeetings;
      const performanceRows = [
        {
          id: "response",
          label: text.perfResponseLabel,
          value: Math.max(58, Math.round(96 - selectedCompany.pendingMeetings * 7 - selectedCompany.openQuestions * 2)),
        },
        {
          id: "resolution",
          label: text.perfResolutionLabel,
          value: Math.max(48, Math.round(100 - totalOpen * 4)),
        },
        {
          id: "sla",
          label: text.perfSlaLabel,
          value: Math.max(50, Math.round(95 - selectedCompany.pendingMeetings * 9)),
        },
        {
          id: "knowledge",
          label: text.perfKnowledgeLabel,
          value: Math.min(100, 52 + selectedCompany.documents.length * 11),
        },
        {
          id: "meeting-load",
          label: text.perfMeetingLoadLabel,
          value: Math.min(100, 16 + selectedCompany.pendingMeetings * 17),
        },
        {
          id: "hypothesis",
          label: text.perfHypothesisLabel,
          value: Math.min(100, 30 + selectedCompany.hypotheses.length * 18),
        },
      ];

      return (
        <div className="company-performance-layout">
          <h4>{text.performanceTitle}</h4>
          <div className="company-performance-grid">
            {performanceRows.map((metric) => (
              <article className="company-performance-card" key={metric.id}>
                <div className="company-performance-head">
                  <span>{metric.label}</span>
                  <strong>{metric.value}%</strong>
                </div>
                <div className="company-scope-progress-track" aria-label={`${metric.label} ${metric.value}%`}>
                  <span className="company-scope-progress-fill" style={{ width: `${metric.value}%` }} />
                </div>
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
      const focusedDocumentId = focusedDocumentByCompany[selectedCompany.id] ?? "";
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
            <ul className="company-detail-list company-detail-list-lined company-documents-list">
              {visibleDocuments.map((item) => {
                const isFocused = focusedDocumentId === item.id;
                const isOpened = openedDocumentId === item.id;
                const documentButtonClassName = `company-document-btn${
                  isFocused ? " is-focused" : ""
                }${isOpened ? " is-opened" : ""}`;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={documentButtonClassName}
                      onClick={() => {
                        setFocusedDocumentByCompany((previous) => ({
                          ...previous,
                          [selectedCompany.id]: item.id,
                        }));
                        setOpenedDocumentByCompany((previous) => ({
                          ...previous,
                          [selectedCompany.id]: item.id,
                        }));
                      }}
                    >
                      <span>{item.name}</span>
                      <small>
                        {item.source === "upload"
                          ? `${text.uploadedLabel}: ${item.uploadedAt} Ã‚Â· ${item.sizeLabel}`
                          : text.openPreviewHint}
                      </small>
                    </button>
                  </li>
                );
              })}
              {visibleDocuments.length === 0 ? <li>{text.noDocumentResult}</li> : null}
            </ul>

            <aside className="company-document-preview-panel" aria-label={text.previewTitle}>
              <h4>{text.previewTitle}</h4>

              {openedDocument === null ? (
                <p className="company-document-preview-empty">{text.previewEmpty}</p>
              ) : (
                <div className="company-document-preview-body">
                  <p className="company-document-preview-name">{openedDocument.name}</p>
                  <p className="company-document-preview-meta">
                    {openedDocument.mimeType || text.unknownFileType}
                    {openedDocument.sizeLabel.length > 0 && openedDocument.sizeLabel !== "-"
                      ? ` Ã‚Â· ${openedDocument.sizeLabel}`
                      : ""}
                  </p>

                  {openedDocument.objectUrl !== null && openedDocument.mimeType.startsWith("image/") ? (
                    <img
                      src={openedDocument.objectUrl}
                      alt={openedDocument.name}
                      className="company-document-preview-image"
                    />
                  ) : null}

                  {openedDocument.objectUrl !== null && openedDocument.mimeType === "application/pdf" ? (
                    <iframe
                      src={openedDocument.objectUrl}
                      title={openedDocument.name}
                      className="company-document-preview-frame"
                    />
                  ) : null}

                  {openedDocument.objectUrl === null ? (
                    <div className="company-document-preview-placeholder">
                      <p>{openedDocument.name}</p>
                      <small>{text.openPreviewHint}</small>
                    </div>
                  ) : null}

                  <div className="company-document-actions">
                    <button
                      type="button"
                      onClick={() => triggerDocumentDownload(selectedCompany.name, openedDocument)}
                    >
                      {text.downloadFile}
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDocumentPrint(selectedCompany.name, openedDocument)}
                    >
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
            </aside>
          </div>

        </div>
      );
    }

    if (activeTab === "hypotheses") {
      return (
        <ul className="company-detail-list company-detail-list-lined">
          {selectedCompany.hypotheses.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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

      <div className="company-workspace-grid">
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
            className={`company-box-card company-box-card-stacked company-collapsible${isCompanyListExpanded ? " is-expanded" : ""}`}
          >
            <button
              type="button"
              className="company-collapsible-toggle"
              aria-expanded={isCompanyListExpanded}
              onClick={() => setIsCompanyListExpanded((previous) => !previous)}
            >
              <h3>{text.searchLabel}</h3>
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
              <label className="company-search-field">
                <span>{text.searchLabel}</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={text.searchPlaceholder}
                />
              </label>

              <ul className="company-list-scroll" aria-label={text.searchLabel}>
            {filteredCompanies.map((company) => {
              const isActive = company.id === selectedCompanyId;

              return (
                <li key={company.id}>
                  <button
                    type="button"
                    className={`company-item-btn${isActive ? " is-active" : ""}`}
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    <div className="company-item-main">
                      <span className="company-list-avatar" aria-hidden="true">{getCompanyInitials(company.name)}</span>
                      <div>
                        <strong>{company.name}</strong>
                        <small>{company.segment}</small>
                      </div>
                    </div>
                    <div className="company-item-meta">
                      <span>{company.lastVisited}</span>
                      {company.isFavorite ? <em>*</em> : null}
                    </div>
                  </button>
                </li>
              );
            })}

            {filteredCompanies.length === 0 ? <li className="company-empty-item">{text.noResult}</li> : null}
          </ul>
            </div>
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

              <div className="company-tab-row" role="tablist" aria-label="Company dashboard tabs">
                {visibleTabs.map((tabId) => (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={tabId === activeTab}
                    className={`company-tab-btn${tabId === activeTab ? " is-active" : ""}`}
                    onClick={() => setActiveTab(tabId)}
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
