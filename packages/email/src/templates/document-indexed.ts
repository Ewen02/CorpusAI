import {
  layout,
  heading,
  paragraph,
  button,
  successBox,
  hint,
  escapeHtml,
  type Locale,
  type EmailTemplate,
} from '../builder';

const copy = {
  fr: {
    subject: (doc: string, ai: string) =>
      `Document "${escapeHtml(doc)}" indexé — ${escapeHtml(ai)}`,
    preheader: (doc: string) => `${doc} est prêt. Votre assistant peut répondre.`,
    heading: 'Document indexé avec succès',
    body: (doc: string, ai: string) =>
      `Votre document <strong>${escapeHtml(doc)}</strong> a été traité et ajouté à l'assistant <strong>${escapeHtml(ai)}</strong>.`,
    success: (chunks: number) =>
      `✓ ${chunks} segment${chunks > 1 ? 's' : ''} indexé${chunks > 1 ? 's' : ''} — votre assistant peut maintenant répondre aux questions sur ce document.`,
    cta: "Voir l'assistant",
    hint: "Vous pouvez ajouter d'autres documents pour enrichir les réponses de votre assistant.",
  },
  en: {
    subject: (doc: string, ai: string) =>
      `Document "${escapeHtml(doc)}" indexed — ${escapeHtml(ai)}`,
    preheader: (doc: string) => `${doc} is ready. Your assistant can now answer.`,
    heading: 'Document indexed successfully',
    body: (doc: string, ai: string) =>
      `Your document <strong>${escapeHtml(doc)}</strong> has been processed and added to the <strong>${escapeHtml(ai)}</strong> assistant.`,
    success: (chunks: number) =>
      `✓ ${chunks} segment${chunks > 1 ? 's' : ''} indexed — your assistant can now answer questions about this document.`,
    cta: 'View assistant',
    hint: "You can add more documents to improve your assistant's answers.",
  },
};

export function documentIndexedTemplate(
  documentName: string,
  aiName: string,
  chunkCount: number,
  aiSettingsUrl: string,
  locale: Locale = 'fr'
): EmailTemplate {
  const t = copy[locale];
  return {
    subject: t.subject(documentName, aiName),
    html: layout(
      [
        heading(t.heading),
        paragraph(t.body(documentName, aiName)),
        successBox(t.success(chunkCount)),
        button(aiSettingsUrl, t.cta),
        hint(t.hint),
      ].join(''),
      t.preheader(documentName),
      locale
    ),
  };
}
