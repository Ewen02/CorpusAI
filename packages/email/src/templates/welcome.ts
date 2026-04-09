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
    subject: 'Bienvenue sur CorpusAI',
    preheader: 'Votre compte est prêt. Créez votre premier assistant IA.',
    heading: 'Bienvenue sur CorpusAI !',
    body: (name: string) =>
      `Bonjour ${escapeHtml(name)}, votre compte est prêt. Vous pouvez dès maintenant créer votre premier assistant IA en quelques minutes.`,
    steps: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
      <tr><td style="padding:6px 0;color:#A0A0B8;font-size:14px;line-height:1.6"><strong style="color:#7C3AED">1.</strong> Créez un assistant et configurez son comportement</td></tr>
      <tr><td style="padding:6px 0;color:#A0A0B8;font-size:14px;line-height:1.6"><strong style="color:#7C3AED">2.</strong> Importez vos documents (PDF, DOCX, TXT, Markdown...)</td></tr>
      <tr><td style="padding:6px 0;color:#A0A0B8;font-size:14px;line-height:1.6"><strong style="color:#7C3AED">3.</strong> Partagez le lien de chat avec vos utilisateurs</td></tr>
    </table>`,
    cta: 'Accéder au dashboard',
    hint: 'Des questions ? Répondez directement à cet email.',
  },
  en: {
    subject: 'Welcome to CorpusAI',
    preheader: 'Your account is ready. Create your first AI assistant.',
    heading: 'Welcome to CorpusAI!',
    body: (name: string) =>
      `Hi ${escapeHtml(name)}, your account is ready. You can now create your first AI assistant in just a few minutes.`,
    steps: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
      <tr><td style="padding:6px 0;color:#A0A0B8;font-size:14px;line-height:1.6"><strong style="color:#7C3AED">1.</strong> Create an assistant and configure its behavior</td></tr>
      <tr><td style="padding:6px 0;color:#A0A0B8;font-size:14px;line-height:1.6"><strong style="color:#7C3AED">2.</strong> Upload your documents (PDF, DOCX, TXT, Markdown...)</td></tr>
      <tr><td style="padding:6px 0;color:#A0A0B8;font-size:14px;line-height:1.6"><strong style="color:#7C3AED">3.</strong> Share the chat link with your users</td></tr>
    </table>`,
    cta: 'Go to dashboard',
    hint: 'Any questions? Just reply to this email.',
  },
};

export function welcomeTemplate(
  name: string,
  dashboardUrl: string,
  locale: Locale = 'fr'
): EmailTemplate {
  const t = copy[locale];
  return {
    subject: t.subject,
    html: layout(
      [
        heading(t.heading),
        paragraph(t.body(name)),
        t.steps,
        button(dashboardUrl, t.cta),
        hint(t.hint),
      ].join(''),
      t.preheader,
      locale
    ),
  };
}
