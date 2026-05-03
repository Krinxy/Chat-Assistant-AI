import type { Language } from "../../features/chat/types/chat";

interface ImprintPanelProps {
  language: Language;
  onClose: () => void;
}

interface ImprintCopy {
  title: string;
  subtitle: string;
  closeLabel: string;
  providerLabel: string;
  providerCompany: string;
  providerAddressLines: string[];
  contactTitle: string;
  phoneLabel: string;
  phoneValue: string;
  emailLabel: string;
  emailValue: string;
  legalRepresentativeLabel: string;
  legalRepresentativeValue: string;
  registerLabel: string;
  registerValue: string;
  vatLabel: string;
  vatValue: string;
  responsibleLabel: string;
  responsibleValue: string;
  disclaimerTitle: string;
  disclaimerBody: string;
  linksTitle: string;
  linksBody: string;
  copyrightTitle: string;
  copyrightBody: string;
  disputeTitle: string;
  disputeBody: string;
}

const IMPRINT_COPY: Record<Language, ImprintCopy> = {
  de: {
    title: "Impressum",
    subtitle: "Angaben gemäß § 5 TMG",
    closeLabel: "Schließen",
    providerLabel: "Diensteanbieter",
    providerCompany: "AURA Labs GmbH",
    providerAddressLines: [
      "Beispielstraße 12",
      "70173 Stuttgart",
      "Deutschland",
    ],
    contactTitle: "Kontakt",
    phoneLabel: "Telefon",
    phoneValue: "+49 (0) 711 000 00 00",
    emailLabel: "E-Mail",
    emailValue: "kontakt@aura.example",
    legalRepresentativeLabel: "Vertretungsberechtigte",
    legalRepresentativeValue: "Dominic Bechtold (Geschäftsführer)",
    registerLabel: "Registereintrag",
    registerValue: "Handelsregister Stuttgart, HRB 000000",
    vatLabel: "Umsatzsteuer-ID",
    vatValue:
      "Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: DE000000000",
    responsibleLabel: "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV",
    responsibleValue: "Dominic Bechtold, Anschrift wie oben",
    disclaimerTitle: "Haftung für Inhalte",
    disclaimerBody:
      "Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf " +
      "diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 " +
      "TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder " +
      "gespeicherte fremde Informationen zu überwachen oder nach Umständen zu " +
      "forschen, die auf eine rechtswidrige Tätigkeit hinweisen.",
    linksTitle: "Haftung für Links",
    linksBody:
      "Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte " +
      "wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch " +
      "keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der " +
      "jeweilige Anbieter oder Betreiber der Seiten verantwortlich.",
    copyrightTitle: "Urheberrecht",
    copyrightBody:
      "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten " +
      "unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, " +
      "Verbreitung und jede Art der Verwertung außerhalb der Grenzen des " +
      "Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors " +
      "bzw. Erstellers.",
    disputeTitle: "Streitbeilegung",
    disputeBody:
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
  },
  en: {
    title: "Imprint",
    subtitle: "Legal information pursuant to § 5 TMG (Germany)",
    closeLabel: "Close",
    providerLabel: "Service provider",
    providerCompany: "AURA Labs GmbH",
    providerAddressLines: [
      "Beispielstrasse 12",
      "70173 Stuttgart",
      "Germany",
    ],
    contactTitle: "Contact",
    phoneLabel: "Phone",
    phoneValue: "+49 (0) 711 000 00 00",
    emailLabel: "Email",
    emailValue: "contact@aura.example",
    legalRepresentativeLabel: "Authorised representative",
    legalRepresentativeValue: "Dominic Bechtold (Managing Director)",
    registerLabel: "Register entry",
    registerValue: "Commercial register Stuttgart, HRB 000000",
    vatLabel: "VAT ID",
    vatValue: "VAT identification number pursuant to § 27 a UStG: DE000000000",
    responsibleLabel: "Responsible for content under § 55 Abs. 2 RStV",
    responsibleValue: "Dominic Bechtold, address as above",
    disclaimerTitle: "Liability for content",
    disclaimerBody:
      "As a service provider we are responsible for our own content on these pages " +
      "in accordance with § 7 (1) TMG under general law. According to §§ 8 to 10 " +
      "TMG we are, however, not obligated to monitor transmitted or stored " +
      "third-party information, or to investigate circumstances that indicate " +
      "unlawful activity.",
    linksTitle: "Liability for links",
    linksBody:
      "Our offer contains links to external third-party websites, on whose contents " +
      "we have no influence. Therefore, we cannot assume any liability for these " +
      "external contents. The respective provider or operator of the pages is always " +
      "responsible for the contents of the linked pages.",
    copyrightTitle: "Copyright",
    copyrightBody:
      "The content and works created by the site operators on these pages are " +
      "subject to German copyright law. Duplication, processing, distribution, and " +
      "any kind of exploitation outside the limits of copyright require the written " +
      "consent of the respective author or creator.",
    disputeTitle: "Dispute resolution",
    disputeBody:
      "The European Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr. We are not willing or obligated to participate in dispute resolution proceedings before a consumer arbitration board.",
  },
};

export function ImprintPanel({ language, onClose }: ImprintPanelProps) {
  const copy = IMPRINT_COPY[language];

  return (
    <section className="utility-view-panel imprint-panel" aria-label={copy.title}>
      <header className="utility-view-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>

        <button
          type="button"
          className="imprint-close-btn"
          onClick={onClose}
        >
          {copy.closeLabel}
        </button>
      </header>

      <div className="imprint-content">
        <section className="imprint-block imprint-study-notice">
          <h3>{language === "de" ? "Hinweis: Studienprojekt" : "Notice: Study Project"}</h3>
          <p>
            {language === "de"
              ? "Diese Anwendung ist ein Studienprojekt und wurde im Rahmen einer Hochschulausbildung entwickelt. Alle angegebenen Unternehmensdaten (Name, Adresse, Registernummer, Umsatzsteuer-ID) sind Platzhalterwerte und haben keinen realen Bezug. Die App dient ausschließlich Demonstrations- und Lernzwecken."
              : "This application is a study project developed as part of a university programme. All company details listed below (name, address, register number, VAT ID) are placeholder values and have no real-world reference. The app is intended solely for demonstration and educational purposes."}
          </p>
        </section>

        <section className="imprint-block">
          <h3>{copy.providerLabel}</h3>
          <p>
            <strong>{copy.providerCompany}</strong>
            <br />
            {copy.providerAddressLines.map((line, index) => (
              <span key={line}>
                {line}
                {index < copy.providerAddressLines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        </section>

        <section className="imprint-block">
          <h3>{copy.contactTitle}</h3>
          <p>
            <strong>{copy.phoneLabel}: </strong>{copy.phoneValue}
            <br />
            <strong>{copy.emailLabel}: </strong>
            <a href={`mailto:${copy.emailValue}`}>{copy.emailValue}</a>
          </p>
        </section>

        <section className="imprint-block">
          <h3>{copy.legalRepresentativeLabel}</h3>
          <p>{copy.legalRepresentativeValue}</p>
        </section>

        <section className="imprint-block">
          <h3>{copy.registerLabel}</h3>
          <p>{copy.registerValue}</p>
        </section>

        <section className="imprint-block">
          <h3>{copy.vatLabel}</h3>
          <p>{copy.vatValue}</p>
        </section>

        <section className="imprint-block">
          <h3>{copy.responsibleLabel}</h3>
          <p>{copy.responsibleValue}</p>
        </section>

        <section className="imprint-block">
          <h3>{copy.disclaimerTitle}</h3>
          <p>{copy.disclaimerBody}</p>
        </section>

        <section className="imprint-block">
          <h3>{copy.linksTitle}</h3>
          <p>{copy.linksBody}</p>
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
    </section>
  );
}
