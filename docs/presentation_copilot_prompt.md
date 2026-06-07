# PowerPoint Copilot Prompt – Chat-Assistant-AI Präsentation

Kopiere den folgenden Prompt direkt in Microsoft Copilot in PowerPoint:

---

## Prompt (einfach reinkopieren)

```
Erstelle eine professionelle Präsentation auf Deutsch zum Thema "Chat-Assistant-AI – Projektstand & Vision".

Die Präsentation soll folgende Folien enthalten, in dieser Reihenfolge:

---

**Folie 1 – Titelfolie**
Titel: „Chat-Assistant-AI"
Untertitel: „Ein modularer KI-Assistent – Projektstand & Vision"
Füge ein modernes, technisches Design mit dunklem Hintergrund und Akzentfarben (z. B. Blau/Lila) ein.

---

**Folie 2 – Grundidee & Motivation**
Überschrift: „Wie kam die Idee?"
Inhalt:
- Marktnische: Nutzer wollen einen einzigen, personalisierten KI-Assistenten statt vieler Einzeltools
- Nachfrage nach einem System, das Chatbot, Empfehlungen, Benachrichtigungen und Wetterdaten vereint
- Ausgangspunkt: Kein Tool kombiniert intelligente Konversation mit verhaltensbasierter Personalisierung in einer einzigen App
- Zielgruppe: Privatnutzer, später auch Unternehmen (B2C → B2B)
Füge ein Bullet-Point-Layout mit einem Icon für „Glühbirne" oder „Idee" ein.

---

**Folie 3 – Die Idee erklärt**
Überschrift: „Was ist Chat-Assistant-AI?"
Inhalt:
- Ein modularer Multi-Agenten-KI-Assistent für mobile und Web-Anwendungen
- Kombiniert: KI-Konversation, personalisierte Empfehlungen, Echtzeit-Benachrichtigungen, Sprachsteuerung (Voice Input)
- Zentrales Prinzip: Ein Assistent – viele Fähigkeiten
- Alles in einer einheitlichen Frontend-Backend-Architektur
Füge eine einfache Grafik oder ein Diagramm ein, das die Hauptfeatures als Icons darstellt (Chat, Empfehlungen, Benachrichtigungen, Wetter, Profil, Voice).

---

**Folie 4 – Leistungsumfang (Features)**
Überschrift: „Was kann die App?"
Inhalt als Tabelle oder Feature-Kacheln:
- 💬 Chat: KI-Konversation in Echtzeit mit Nachrichtenverlauf
- 🔔 Benachrichtigungen: Personalisierte Push-ähnliche Hinweise
- 📊 Empfehlungen: Verhaltensbasierte, dynamische Vorschläge
- 🌤 Wetter: Kontextbezogene Wetterdaten
- 🎙 Voice Input: Spracheingabe mit Live-Transkription
- 👤 Nutzerprofil: Accountverwaltung, Einstellungen, Hilfe/Forum
- 🏢 Unternehmensbereich (CompanyWorkspace): separater Workspace für Teams
Nutze ein Kachel-Layout oder eine Icon-Grid-Darstellung.

---

**Folie 5 – Architektur & Struktur der App**
Überschrift: „Wie ist die App aufgebaut?"
Inhalt als Mindmap oder Architekturdiagramm:

Frontend (React + TypeScript):
  - Pages: HomePage, ChatPage, RecommendationsPage, NotificationsPage, ProfilePage, CompanyWorkspacePage
  - Features: chat, recommendations, notifications, weather, user-profile
  - Widgets: sidebar, header, navbar
  - Shared: API-Layer, Komponenten, Hooks, Utils

Backend (Python / FastAPI):
  - Services: Chat-Service, Transkriptions-Service, Auth-Service
  - Handlers & Core-Logik
  - Cache-Layer

Kommunikation:
  - REST API zwischen Frontend und Backend
  - Base64-Encoding + Verschlüsselung für sensible Daten

Erstelle dazu eine vereinfachte Architekturskizze als Diagramm mit zwei Säulen (Frontend | Backend) und einem Pfeil „REST API" dazwischen.

---

**Folie 6 – Vorgehensweise in der Entwicklung**
Überschrift: „Wie wurde entwickelt?"
Inhalt:
- Iterativer Aufbau: erst Monolith, dann schrittweise Richtung Microservices
- Feature-Sliced Design (FSD) als Architekturmuster im Frontend
- CI/CD von Anfang an: Lint-, Bandit- und Test-Gates auf dem Main-Branch
- Test-Driven: mindestens 80 % Code Coverage als Pflichtkriterium
- Dokumentation parallel zur Entwicklung (ADRs – Architecture Decision Records)
- Pre-Commit Hooks für lokale Qualitätssicherung
Nutze ein Timeline- oder Schritt-für-Schritt-Layout.

---

**Folie 7 – Technologie-Stack**
Überschrift: „Welche Technologien werden genutzt?"
Inhalt als zweispaltige Liste:

Frontend:
  - React 18 + TypeScript
  - Vite (Build-Tool)
  - Zustand (State Management)
  - Feature-Sliced Design (FSD)
  - Jest + Vitest (Tests)
  - ESLint + Prettier (Codequalität)

Backend:
  - Python 3 + FastAPI / Streamlit
  - Conda / pyproject.toml (Dependency Management)
  - Bandit (Security Scanning)
  - Flake8 + Black (Code Style)

DevOps / Infrastruktur:
  - GitHub Actions (CI/CD)
  - Pre-Commit Hooks
  - Coverage Gate (min. 80 %)
  - Geplant: Go-Services, .NET-Services (Microservices)

Füge Technologie-Logos oder Badge-Icons ein.

---

**Folie 8 – Demo-Platzhalter**
Überschrift: „Live Demo"
Inhalt: Platzhalter-Folie mit dem Text „[Demo folgt live]"
Füge einen großen „Play"-Button oder ein Screenshot-Platzhalter-Bild ein.

---

**Folie 9 – Vision & Zukunft**
Überschrift: „Wohin geht die Reise?"
Inhalt:
- 📱 Lokale App: Deployment als native Desktop- & Mobile-App (Electron / React Native)
- 🔒 Datenschutz: Lokale KI-Verarbeitung ohne Cloud-Pflicht (On-Device AI)
- 🏢 Gründung: Aufbau eines Startups rund um den Assistenten
- 🌍 B2B-Erweiterung: Unternehmens-Workspaces, Team-Features, Admin-Rollen
- 🤖 Mehr Agenten: Spezialisierte KI-Agenten je Domäne (Finanzen, Gesundheit, Produktivität)
- 🔗 Microservices: Vollständige Umstellung auf unabhängige Services (Go, .NET, Python, Node.js)
Nutze ein futuristisches Roadmap- oder Zeitleisten-Layout.

---

**Folie 10 – Abschlussfolie**
Titel: „Danke für eure Aufmerksamkeit"
Untertitel: „Fragen & Diskussion"
Füge einen QR-Code-Platzhalter und ein GitHub-Link-Platzhalter ein.

---

Designvorgaben für die gesamte Präsentation:
- Dunkles, modernes Theme (z. B. dunkelblau oder anthrazit mit Blau/Lila-Akzenten)
- Klare, serifenlose Schriftart (z. B. Segoe UI oder Calibri)
- Icons und Grafiken wo immer möglich statt reinem Text
- Konsistente Farbgebung und Abstände auf allen Folien
- Animationen: dezente Einblendungen (Fade-In) für Aufzählungspunkte
```
