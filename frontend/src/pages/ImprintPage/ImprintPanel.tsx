import { useEffect } from "react";
import type { Language } from "../../features/chat/types/chat";

interface ImprintPanelProps {
  language: Language;
  onClose: () => void;
}

interface Developer {
  name: string;
  programme: string;
  email: string;
}

interface ImprintCopy {
  title: string;
  subtitle: string;
  closeLabel: string;

  studyNoticeTitle: string;
  studyNoticeBody: string;

  noObligationTitle: string;
  noObligationBody: string;

  developersTitle: string;
  developers: Developer[];
  addressNote: string;
  university: string;

  academicContextTitle: string;
  academicContextBody: string;

  nonCommercialTitle: string;
  nonCommercialBody: string;

  contentLiabilityTitle: string;
  contentLiabilityBody: string;

  linksLiabilityTitle: string;
  linksLiabilityBody: string;

  copyrightTitle: string;
  copyrightBody: string;

  disputeTitle: string;
  disputeBody: string;
}

const IMPRINT_COPY: Record<Language, ImprintCopy> = {
  de: {
    title: "Impressum",
    subtitle: "Freiwillige Angaben – Nicht-kommerzielles Hochschulprojekt",
    closeLabel: "Schließen",

    studyNoticeTitle: "Hinweis: Hochschulprojekt ohne kommerzielle Absicht",
    studyNoticeBody:
      "Bei AURA handelt es sich um ein Studienprojekt, das ausschließlich zu Lern- und "
      + "Demonstrationszwecken im Rahmen einer Hochschulausbildung entwickelt wurde. "
      + "Es besteht keinerlei kommerzielle Absicht. Sämtliche dargestellten Firmen, "
      + "Produkte, Personen, Finanzdaten und sonstigen Inhalte sind fiktive "
      + "Platzhalterwerte ohne Bezug zur Realität.",

    noObligationTitle: "Keine Impressumspflicht nach § 5 TMG",
    noObligationBody:
      "Die Impressumspflicht gemäß § 5 TMG gilt ausschließlich für geschäftsmäßige "
      + "Telemediendienste. Da dieses Projekt nicht geschäftsmäßig betrieben wird, "
      + "keine Einnahmen erzielt und nicht öffentlich vermarktet wird, besteht "
      + "keine gesetzliche Pflicht zur Anbieterkennzeichnung. Die nachfolgenden "
      + "Angaben werden freiwillig und ausschließlich zur Wahrung der Transparenz "
      + "bereitgestellt.",

    developersTitle: "Verantwortliche Personen (freiwillige Angabe)",
    developers: [
      {
        name: "Dominic Bechtold",
        programme: "Künstliche Intelligenz und kognitive Systeme",
        email: "dominic@aura.example",
      },
      {
        name: "Constantin Dendtel",
        programme: "Künstliche Intelligenz und kognitive Systeme",
        email: "constantin@aura.example",
      },
    ],
    addressNote: "Anschrift auf Anfrage · Deutschland",
    university: "Duale Hochschule Baden-Württemberg",

    academicContextTitle: "Akademischer Kontext",
    academicContextBody:
      "AURA wurde als Hochschulprojekt entwickelt und ist nicht für den produktiven "
      + "Einsatz in realen Geschäftsprozessen vorgesehen. Alle in der Anwendung "
      + "dargestellten Unternehmen, Personen, Hypothesen, Notizen, Kontaktdaten "
      + "und Finanzkennzahlen sind vollständig fiktiv und dienen ausschließlich "
      + "der Veranschaulichung von Funktionen und Konzepten.",

    nonCommercialTitle: "Kein kommerzieller Betrieb",
    nonCommercialBody:
      "Diese Anwendung verfolgt keinerlei wirtschaftliche Zwecke. Es werden keine "
      + "Einnahmen erzielt, keine Gebühren erhoben, keine Dienstleistungen vermarktet "
      + "und kein Vertragsverhältnis mit Nutzern begründet. Die App ist ausschließlich "
      + "für akademische Demonstrations- und Prüfungszwecke bestimmt.",

    contentLiabilityTitle: "Haftung für Inhalte",
    contentLiabilityBody:
      "Die Inhalte dieser Anwendung wurden mit größtmöglicher Sorgfalt erstellt. "
      + "Da es sich um ein nicht-kommerzielles Hochschulprojekt handelt, "
      + "übernehmen die Entwickler keine Gewähr für die Richtigkeit, Vollständigkeit "
      + "oder Aktualität der bereitgestellten fiktiven Inhalte. Eine Haftung für "
      + "Schäden, die durch die Nutzung der Anwendung entstehen, wird ausgeschlossen, "
      + "soweit dies rechtlich zulässig ist.",

    linksLiabilityTitle: "Haftung für Links",
    linksLiabilityBody:
      "Diese Anwendung kann Links zu externen Websites enthalten. Für die Inhalte "
      + "verlinkter Seiten ist stets der jeweilige Anbieter verantwortlich. "
      + "Zum Zeitpunkt der Verlinkung wurden keine Rechtsverstöße festgestellt. "
      + "Eine dauerhafte Kontrolle der verlinkten Seiten ist ohne konkreten Anhaltspunkt "
      + "nicht zumutbar.",

    copyrightTitle: "Urheberrecht",
    copyrightBody:
      "© 2024–2026 Dominic Bechtold & Constantin Dendtel. Dieses Projekt wurde im "
      + "Rahmen einer Hochschulausbildung erstellt. Quellcode, Design und Konzept sind "
      + "urheberrechtlich geschützt. Eine Nutzung außerhalb des akademischen Kontexts "
      + "bedarf der ausdrücklichen Zustimmung der Autoren.",

    disputeTitle: "Streitbeilegung",
    disputeBody:
      "Da dieses Projekt nicht kommerziell betrieben wird und keine Vertragsbeziehungen "
      + "mit Verbrauchern begründet, findet die EU-Verbraucherstreitbeilegungsverordnung "
      + "(ODR-Plattform) keine Anwendung. Eine Teilnahme an Verbraucherschlichtungsverfahren "
      + "ist weder gesetzlich vorgesehen noch beabsichtigt.",
  },

  en: {
    title: "Imprint",
    subtitle: "Voluntary disclosure – Non-commercial university project",
    closeLabel: "Close",

    studyNoticeTitle: "Notice: University project – no commercial intent",
    studyNoticeBody:
      "AURA is a student project developed solely for learning and demonstration "
      + "purposes as part of a university degree programme. There is no commercial "
      + "intent of any kind. All companies, products, persons, financial data, and "
      + "other content shown in this application are entirely fictional placeholder "
      + "values with no real-world reference.",

    noObligationTitle: "No statutory imprint obligation under § 5 TMG",
    noObligationBody:
      "The imprint obligation under § 5 TMG (German Telemedia Act) applies exclusively "
      + "to commercially operated telemedia services. Since this project is not "
      + "commercially operated, generates no revenue, and is not publicly marketed, "
      + "there is no statutory obligation to provide an imprint. The information "
      + "below is provided voluntarily and solely in the interest of transparency.",

    developersTitle: "Responsible persons (voluntary disclosure)",
    developers: [
      {
        name: "Dominic Bechtold",
        programme: "Artificial Intelligence and Cognitive Systems",
        email: "dominic@aura.example",
      },
      {
        name: "Constantin Dendtel",
        programme: "Artificial Intelligence and Cognitive Systems",
        email: "constantin@aura.example",
      },
    ],
    addressNote: "Address available on request · Germany",
    university: "Baden-Württemberg Cooperative State University (DHBW)",

    academicContextTitle: "Academic context",
    academicContextBody:
      "AURA was developed as a university project and is not intended for use in "
      + "real business processes. All companies, persons, hypotheses, notes, contact "
      + "details, and financial metrics shown within the application are entirely "
      + "fictitious and serve solely to illustrate features and concepts.",

    nonCommercialTitle: "Non-commercial operation",
    nonCommercialBody:
      "This application pursues no economic objectives whatsoever. No revenue is "
      + "generated, no fees are charged, no services are marketed, and no contractual "
      + "relationship with users is established. The app is intended exclusively for "
      + "academic demonstration and examination purposes.",

    contentLiabilityTitle: "Liability for content",
    contentLiabilityBody:
      "The content of this application has been compiled with the utmost care. "
      + "As a non-commercial university project, the developers assume no liability "
      + "for the accuracy, completeness, or currency of the fictional content provided. "
      + "Liability for damages arising from the use of this application is excluded "
      + "to the extent permitted by law.",

    linksLiabilityTitle: "Liability for links",
    linksLiabilityBody:
      "This application may contain links to external websites. The respective "
      + "provider is always responsible for the content of linked pages. No legal "
      + "violations were identified at the time of linking. Continuous monitoring "
      + "of linked pages is not reasonable without concrete evidence of an infringement.",

    copyrightTitle: "Copyright",
    copyrightBody:
      "© 2024–2026 Dominic Bechtold & Constantin Dendtel. This project was created "
      + "as part of a university degree programme. Source code, design, and concept "
      + "are protected by copyright. Use outside an academic context requires the "
      + "express consent of the authors.",

    disputeTitle: "Dispute resolution",
    disputeBody:
      "As this project is not commercially operated and establishes no contractual "
      + "relationship with consumers, the EU Consumer Online Dispute Resolution "
      + "Regulation (ODR platform) does not apply. Participation in consumer "
      + "arbitration proceedings is neither legally required nor intended.",
  },
};

export function ImprintPanel({ language, onClose }: ImprintPanelProps) {
  const copy = IMPRINT_COPY[language];

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="imprint-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <article className="imprint-modal">
        <header className="imprint-modal-header">
          <div className="imprint-modal-title-group">
            <h2 className="imprint-modal-title">{copy.title}</h2>
            <p className="imprint-modal-subtitle">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            className="imprint-modal-close"
            onClick={onClose}
            aria-label={copy.closeLabel}
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="imprint-modal-body">
          <section className="imprint-block imprint-study-notice">
            <h3>{copy.studyNoticeTitle}</h3>
            <p>{copy.studyNoticeBody}</p>
          </section>

          <section className="imprint-block imprint-no-obligation">
            <h3>{copy.noObligationTitle}</h3>
            <p>{copy.noObligationBody}</p>
          </section>

          <section className="imprint-block">
            <h3>{copy.developersTitle}</h3>
            <div className="imprint-developers">
              {copy.developers.map((dev) => (
                <div key={dev.name} className="imprint-developer-card">
                  <strong>{dev.name}</strong>
                  <span>{dev.programme}</span>
                  <a href={`mailto:${dev.email}`}>{dev.email}</a>
                </div>
              ))}
              <p className="imprint-address-note">
                {copy.addressNote}
                <br />
                {copy.university}
              </p>
            </div>
          </section>

          <section className="imprint-block">
            <h3>{copy.academicContextTitle}</h3>
            <p>{copy.academicContextBody}</p>
          </section>

          <section className="imprint-block imprint-noncommercial">
            <h3>{copy.nonCommercialTitle}</h3>
            <p>{copy.nonCommercialBody}</p>
          </section>

          <section className="imprint-block">
            <h3>{copy.contentLiabilityTitle}</h3>
            <p>{copy.contentLiabilityBody}</p>
          </section>

          <section className="imprint-block">
            <h3>{copy.linksLiabilityTitle}</h3>
            <p>{copy.linksLiabilityBody}</p>
          </section>

          <section className="imprint-block">
            <h3>{copy.copyrightTitle}</h3>
            <p>{copy.copyrightBody}</p>
          </section>

          <section className="imprint-block">
            <h3>{copy.disputeTitle}</h3>
            <p>{copy.disputeBody}</p>
          </section>
        </div>
      </article>
    </div>
  );
}
