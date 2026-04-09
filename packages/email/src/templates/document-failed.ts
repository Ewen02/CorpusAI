import {
  layout,
  heading,
  paragraph,
  button,
  errorBox,
  hint,
  escapeHtml,
  type Locale,
  type EmailTemplate,
} from '../builder';

const copy = {
  fr: {
    subject: (doc: string, ai: string) =>
      `Échec du traitement — "${escapeHtml(doc)}" — ${escapeHtml(ai)}`,
    preheader: (doc: string) => `Le document ${doc} n'a pas pu être traité.`,
    heading: 'Échec du traitement du document',
    body: (doc: string, ai: string) =>
      `Le document <strong>${escapeHtml(doc)}</strong> n'a pas pu être traité pour l'assistant <strong>${escapeHtml(ai)}</strong>.`,
    error: (msg: string) => `Erreur : ${escapeHtml(msg)}`,
    advice:
      "Vous pouvez réessayer le traitement ou importer une nouvelle version du document. Si le problème persiste, vérifiez que le fichier n'est pas corrompu.",
    cta: 'Réessayer',
    hint: 'Formats supportés : PDF, DOCX, TXT, Markdown, CSV.',
  },
  en: {
    subject: (doc: string, ai: string) =>
      `Processing failed — "${escapeHtml(doc)}" — ${escapeHtml(ai)}`,
    preheader: (doc: string) => `The document ${doc} could not be processed.`,
    heading: 'Document processing failed',
    body: (doc: string, ai: string) =>
      `The document <strong>${escapeHtml(doc)}</strong> could not be processed for the <strong>${escapeHtml(ai)}</strong> assistant.`,
    error: (msg: string) => `Error: ${escapeHtml(msg)}`,
    advice:
      'You can retry the processing or upload a new version of the document. If the issue persists, check that the file is not corrupted.',
    cta: 'Retry',
    hint: 'Supported formats: PDF, DOCX, TXT, Markdown, CSV.',
  },
};

export function documentFailedTemplate(
  documentName: string,
  aiName: string,
  errorMessage: string,
  retryUrl: string,
  locale: Locale = 'fr'
): EmailTemplate {
  const t = copy[locale];
  return {
    subject: t.subject(documentName, aiName),
    html: layout(
      [
        heading(t.heading),
        paragraph(t.body(documentName, aiName)),
        errorBox(t.error(errorMessage)),
        paragraph(t.advice),
        button(retryUrl, t.cta),
        hint(t.hint),
      ].join(''),
      t.preheader(documentName),
      locale
    ),
  };
}
