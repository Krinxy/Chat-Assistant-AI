import type { Language } from "../../features/chat/types/chat";

interface NoteLabelOption {
  id: string;
  label: string;
}

export interface CompanyWorkspaceText {
  title: string;
  rolePrefix: string;
  roles: {
    admin: string;
    customer: string;
    salesConsultant: string;
    analyst: string;
    guest: string;
  };
  recentlyVisited: string;
  favorites: string;
  searchLabel: string;
  searchPlaceholder: string;
  noResult: string;
  ownerLabel: string;
  openLabel: string;
  meetingsLabel: string;
  recentEventsTitle: string;
  tabs: {
    overview: string;
    portfolio: string;
    performance: string;
    documents: string;
    hypotheses: string;
    appointments: string;
    notes: string;
    team: string;
    newsfeed: string;
  };
  personaTitle: string;
  addFile: string;
  fileSearch: string;
  noDocumentResult: string;
  documentsHint: string;
  previewTitle: string;
  previewEmpty: string;
  openPreviewHint: string;
  downloadFile: string;
  printFile: string;
  deleteFile: string;
  uploadedLabel: string;
  unknownFileType: string;
  kpiOneLabel: string;
  kpiTwoLabel: string;
  kpiThreeLabel: string;
  kpiFourLabel: string;
  kpiOneHint: string;
  kpiTwoHint: string;
  kpiThreeLow: string;
  kpiThreeMedium: string;
  kpiThreeHigh: string;
  kpiThreeHint: string;
  openKpiHint: string;
  meetingsKpiHint: string;
  kpiFourHint: string;
  overviewScopeTitle: string;
  scopeGoalLabel: string;
  scopeDiscovery: string;
  scopeValidation: string;
  scopeDelivery: string;
  performanceTitle: string;
  perfResponseLabel: string;
  perfResolutionLabel: string;
  perfSlaLabel: string;
  perfKnowledgeLabel: string;
  perfMeetingLoadLabel: string;
  perfHypothesisLabel: string;
  perfSummaryLabel: string;
  notesTitle: string;
  notesListTitle: string;
  notesDetailTitle: string;
  notesComposerPlaceholder: string;
  addNote: string;
  attachNoteFile: string;
  noteAttachedPrefix: string;
  noNotes: string;
  notesLabelsTitle: string;
  notesLinkedEventLabel: string;
  notesEditHeader: string;
  notesEditSave: string;
  appointmentsTitle: string;
  appointmentsHint: string;
  appointmentEmpty: string;
  appointmentAssignee: string;
  appointmentUnassigned: string;
  addAppointment: string;
  appointmentFormTitle: string;
  appointmentFormName: string;
  appointmentFormDesc: string;
  appointmentFormDay: string;
  appointmentFormTime: string;
  appointmentFormEnd: string;
  appointmentFormPeople: string;
  appointmentFormSave: string;
  appointmentFormCancel: string;
  appointmentFormRecurring: string;
  teamFunctionCol: string;
  teamNameCol: string;
  teamLatestEventCol: string;
  teamEditCol: string;
  teamSave: string;
  teamCancel: string;
  teamNoMembers: string;
  noteLabels: NoteLabelOption[];
}

export const getCompanyWorkspaceText = (language: Language): CompanyWorkspaceText => {
  if (language === "de") {
    return {
      title: "Workspace",
      rolePrefix: "Rolle:",
      roles: {
        admin: "Admin",
        customer: "Kunde",
        salesConsultant: "Vertriebsberatung",
        analyst: "Analyst",
        guest: "Gast",
      },
      recentlyVisited: "Zuletzt besucht",
      favorites: "Favoriten",
      searchLabel: "Unternehmen suchen",
      searchPlaceholder: "Name, Segment oder Owner suchen",
      noResult: "Kein Unternehmen gefunden.",
      ownerLabel: "Verantwortlich",
      openLabel: "Offen",
      meetingsLabel: "Meetings",
      recentEventsTitle: "Letzte Aktivitaeten",
      tabs: {
        overview: "Uebersicht",
        portfolio: "Portfolio & Performance",
        performance: "Performance",
        documents: "Dokumente",
        hypotheses: "Hypothesen",
        appointments: "Termine",
        notes: "Notizen",
        team: "Team",
        newsfeed: "Instafeed",
      },
      personaTitle: "Personas im Unternehmen",
      addFile: "Datei hinzufügen",
      fileSearch: "Dateien suchen",
      noDocumentResult: "Keine Dokumente gefunden.",
      documentsHint: "Klick auf eine Datei, um die Vorschau direkt zu öffnen.",
      previewTitle: "Datei-Vorschau",
      previewEmpty: "Wähle eine Datei per Klick aus, um sie hier zu öffnen.",
      openPreviewHint: "Klicken zum Öffnen",
      downloadFile: "Download",
      printFile: "Drucken",
      deleteFile: "Löschen",
      uploadedLabel: "Hochgeladen",
      unknownFileType: "Unbekannter Dateityp",
      kpiOneLabel: "Durchschnittliche Antwortzeit",
      kpiTwoLabel: "Antwortquote",
      kpiThreeLabel: "Priorität",
      kpiFourLabel: "Scope-Coverage",
      kpiOneHint: "Median über offene Threads",
      kpiTwoHint: "Anteil geklärter Punkte",
      kpiThreeLow: "Niedrig",
      kpiThreeMedium: "Mittel",
      kpiThreeHigh: "Hoch",
      kpiThreeHint: "Basierend auf offenen Fragen/Meetings",
      openKpiHint: "Aktuell offene Fragestellungen im Workspace",
      meetingsKpiHint: "Geplante Weekly- oder Follow-up Termine",
      kpiFourHint: "Abdeckung über alle Produkt-Scopes",
      overviewScopeTitle: "Product Progress",
      scopeGoalLabel: "Fortschritt",
      scopeDiscovery: "Scope 1: Entdeckung",
      scopeValidation: "Scope 2: Validierung",
      scopeDelivery: "Scope 3: Umsetzung",
      performanceTitle: "Performance KPIs",
      perfResponseLabel: "Antworttempo",
      perfResolutionLabel: "Resolution Score",
      perfSlaLabel: "SLA Stabilität",
      perfKnowledgeLabel: "Knowledge Coverage",
      perfMeetingLoadLabel: "Meeting-Last",
      perfHypothesisLabel: "Hypothesen-Durchsatz",
      perfSummaryLabel: "Zusammenfassung",
      notesTitle: "Notiz-Stream",
      notesListTitle: "Notizen",
      notesDetailTitle: "Notiz-Detail",
      notesComposerPlaceholder: "Kurze Notiz erfassen und mit Team teilen...",
      addNote: "Notiz speichern",
      attachNoteFile: "Datei an Notiz",
      noteAttachedPrefix: "Datei-Notiz",
      noNotes: "Keine Notizen vorhanden.",
      notesLabelsTitle: "Labels",
      notesLinkedEventLabel: "Event anhängen",
      notesEditHeader: "Notiz bearbeiten",
      notesEditSave: "Änderungen speichern",
      appointmentsTitle: "Wochenvorschau",
      appointmentsHint: "Weekly- und Follow-up Termine im Kalender.",
      appointmentEmpty: "Keine Termine",
      appointmentAssignee: "Teammitglied",
      appointmentUnassigned: "Nicht zugewiesen",
      addAppointment: "+ Termin hinzufügen",
      appointmentFormTitle: "Termin planen",
      appointmentFormName: "Terminname",
      appointmentFormDesc: "Beschreibung",
      appointmentFormDay: "Tag",
      appointmentFormTime: "Startzeit",
      appointmentFormEnd: "Endzeit",
      appointmentFormPeople: "Teilnehmer",
      appointmentFormSave: "Termin speichern",
      appointmentFormCancel: "Abbrechen",
      appointmentFormRecurring: "Wöchentlich wiederholen",
      teamFunctionCol: "Funktion",
      teamNameCol: "Name",
      teamLatestEventCol: "Latest event",
      teamEditCol: "Edit",
      teamSave: "Speichern",
      teamCancel: "Abbrechen",
      teamNoMembers: "Keine Teammitglieder vorhanden.",
      noteLabels: [
        { id: "followup", label: "Follow-up" },
        { id: "blocker", label: "Blocker" },
        { id: "decision", label: "Decision" },
        { id: "urgent", label: "Urgent" },
      ],
    };
  }

  return {
    title: "Workspace",
    rolePrefix: "Role:",
    roles: {
      admin: "Admin",
      customer: "Customer",
      salesConsultant: "Sales Consultant",
      analyst: "Analyst",
      guest: "Guest",
    },
    recentlyVisited: "Recently visited",
    favorites: "Favorites",
    searchLabel: "Search companies",
    searchPlaceholder: "Search by name, segment, or owner",
    noResult: "No company found.",
    ownerLabel: "Owner",
    openLabel: "Open",
    meetingsLabel: "Meetings",
    recentEventsTitle: "Recent events",
    tabs: {
      overview: "Overview",
      portfolio: "Portfolio & Performance",
      performance: "Performance",
      documents: "Documents",
      hypotheses: "Hypotheses",
      appointments: "Appointments",
      notes: "Notes",
      team: "Team",
      newsfeed: "Newsfeed",
    },
    personaTitle: "Personas in this company",
    addFile: "Add file",
    fileSearch: "Search files",
    noDocumentResult: "No documents found.",
    documentsHint: "Click a file to open its preview directly.",
    previewTitle: "File preview",
    previewEmpty: "Click a file to open it in this panel.",
    openPreviewHint: "Click to open",
    downloadFile: "Download",
    printFile: "Print",
    deleteFile: "Delete",
    uploadedLabel: "Uploaded",
    unknownFileType: "Unknown file type",
    kpiOneLabel: "Average response time",
    kpiTwoLabel: "Response completion",
    kpiThreeLabel: "Priority",
    kpiFourLabel: "Scope coverage",
    kpiOneHint: "Median over active threads",
    kpiTwoHint: "Share of resolved points",
    kpiThreeLow: "Low",
    kpiThreeMedium: "Medium",
    kpiThreeHigh: "High",
    kpiThreeHint: "Derived from open questions and meetings",
    openKpiHint: "Current unresolved questions in this workspace",
    meetingsKpiHint: "Planned weekly or follow-up syncs",
    kpiFourHint: "Coverage across the full product scope journey",
    overviewScopeTitle: "Product Progress",
    scopeGoalLabel: "Progress",
    scopeDiscovery: "Scope 1: Discovery",
    scopeValidation: "Scope 2: Validation",
    scopeDelivery: "Scope 3: Delivery",
    performanceTitle: "Performance KPIs",
    perfResponseLabel: "Response speed",
    perfResolutionLabel: "Resolution score",
    perfSlaLabel: "SLA stability",
    perfKnowledgeLabel: "Knowledge coverage",
    perfMeetingLoadLabel: "Meeting load",
    perfHypothesisLabel: "Hypothesis throughput",
    perfSummaryLabel: "Summary",
    notesTitle: "Notes stream",
    notesListTitle: "Notes",
    notesDetailTitle: "Note details",
    notesComposerPlaceholder: "Capture a short note and keep context attached...",
    addNote: "Save note",
    attachNoteFile: "Attach note file",
    noteAttachedPrefix: "File note",
    noNotes: "No notes available.",
    notesLabelsTitle: "Labels",
    notesLinkedEventLabel: "Attach event",
    notesEditHeader: "Edit note",
    notesEditSave: "Save changes",
    appointmentsTitle: "Weekly preview",
    appointmentsHint: "Weekly and follow-up meetings arranged in calendar view.",
    appointmentEmpty: "No meetings",
    appointmentAssignee: "Team member",
    appointmentUnassigned: "Unassigned",
    addAppointment: "+ Add appointment",
    appointmentFormTitle: "Plan appointment",
    appointmentFormName: "Appointment name",
    appointmentFormDesc: "Description",
    appointmentFormDay: "Day",
    appointmentFormTime: "Start time",
    appointmentFormEnd: "End time",
    appointmentFormPeople: "Attendees",
    appointmentFormSave: "Save appointment",
    appointmentFormCancel: "Cancel",
    appointmentFormRecurring: "Repeat weekly",
    teamFunctionCol: "Function",
    teamNameCol: "Name",
    teamLatestEventCol: "Latest event",
    teamEditCol: "Edit",
    teamSave: "Save",
    teamCancel: "Cancel",
    teamNoMembers: "No team members available.",
    noteLabels: [
      { id: "followup", label: "Follow-up" },
      { id: "blocker", label: "Blocker" },
      { id: "decision", label: "Decision" },
      { id: "urgent", label: "Urgent" },
    ],
  };
};
