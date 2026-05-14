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
    subject: (inviter: string, aiName: string) =>
      `${escapeHtml(inviter)} vous invite à collaborer sur ${escapeHtml(aiName)}`,
    preheader: (aiName: string) => `Rejoignez l'équipe de ${aiName} sur CorpusAI.`,
    heading: 'Invitation à collaborer',
    body: (inviter: string, aiName: string) =>
      `<strong>${escapeHtml(inviter)}</strong> vous invite à collaborer sur l'assistant IA <strong>${escapeHtml(aiName)}</strong>. En tant que collaborateur, vous pourrez éditer la configuration, les documents et le system prompt.`,
    cta: "Accepter l'invitation",
    hint: (inviter: string) =>
      `Cet email vous a été envoyé car ${escapeHtml(inviter)} vous a ajouté à son équipe sur CorpusAI. Le lien d'invitation expire dans 7 jours.`,
  },
  en: {
    subject: (inviter: string, aiName: string) =>
      `${escapeHtml(inviter)} invited you to collaborate on ${escapeHtml(aiName)}`,
    preheader: (aiName: string) => `Join the ${aiName} team on CorpusAI.`,
    heading: 'Collaboration invitation',
    body: (inviter: string, aiName: string) =>
      `<strong>${escapeHtml(inviter)}</strong> invited you to collaborate on the <strong>${escapeHtml(aiName)}</strong> AI assistant. As a collaborator, you'll be able to edit the configuration, documents and system prompt.`,
    cta: 'Accept invitation',
    hint: (inviter: string) =>
      `You received this email because ${escapeHtml(inviter)} added you to their team on CorpusAI. The invite link expires in 7 days.`,
  },
};

export function collaboratorInviteTemplate(
  aiName: string,
  inviterName: string,
  acceptUrl: string,
  locale: Locale = 'fr'
): EmailTemplate {
  const t = copy[locale];
  return {
    subject: t.subject(inviterName, aiName),
    html: layout(
      [
        heading(t.heading),
        paragraph(t.body(inviterName, aiName)),
        button(acceptUrl, t.cta),
        hint(t.hint(inviterName)),
      ].join(''),
      t.preheader(aiName),
      locale
    ),
  };
}
