import {
  layout,
  heading,
  paragraph,
  button,
  hint,
  escapeHtml,
  type Locale,
  type EmailTemplate,
} from '../builder';

const copy = {
  fr: {
    subject: (creator: string, aiName: string) =>
      `${escapeHtml(creator)} vous invite à utiliser ${escapeHtml(aiName)}`,
    preheader: (aiName: string) => `Accédez à l'assistant IA ${aiName}.`,
    heading: 'Vous avez reçu une invitation',
    body: (creator: string, aiName: string) =>
      `<strong>${escapeHtml(creator)}</strong> vous donne accès à l'assistant IA <strong>${escapeHtml(aiName)}</strong>. Cliquez ci-dessous pour commencer à l'utiliser.`,
    cta: (aiName: string) => `Accéder à ${escapeHtml(aiName)}`,
    hint: (creator: string) =>
      `Cet email vous a été envoyé car ${escapeHtml(creator)} a partagé cet assistant avec vous sur CorpusAI.`,
  },
  en: {
    subject: (creator: string, aiName: string) =>
      `${escapeHtml(creator)} invited you to use ${escapeHtml(aiName)}`,
    preheader: (aiName: string) => `Access the ${aiName} AI assistant.`,
    heading: "You've been invited",
    body: (creator: string, aiName: string) =>
      `<strong>${escapeHtml(creator)}</strong> has given you access to the <strong>${escapeHtml(aiName)}</strong> AI assistant. Click below to start using it.`,
    cta: (aiName: string) => `Access ${escapeHtml(aiName)}`,
    hint: (creator: string) =>
      `You received this email because ${escapeHtml(creator)} shared this assistant with you on CorpusAI.`,
  },
};

export function inviteTemplate(
  aiName: string,
  creatorName: string,
  accessUrl: string,
  locale: Locale = 'fr'
): EmailTemplate {
  const t = copy[locale];
  return {
    subject: t.subject(creatorName, aiName),
    html: layout(
      [
        heading(t.heading),
        paragraph(t.body(creatorName, aiName)),
        button(accessUrl, t.cta(aiName)),
        hint(t.hint(creatorName)),
      ].join(''),
      t.preheader(aiName),
      locale
    ),
  };
}
