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
    subject: 'Vérifiez votre adresse email — CorpusAI',
    preheader: 'Confirmez votre email pour activer votre compte.',
    heading: 'Confirmez votre adresse email',
    body: (name?: string) =>
      `Bonjour${name ? ` ${escapeHtml(name)}` : ''}, merci de vous être inscrit sur CorpusAI. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.`,
    cta: 'Confirmer mon email',
    hint: "Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte sur CorpusAI, vous pouvez ignorer cet email.",
  },
  en: {
    subject: 'Verify your email address — CorpusAI',
    preheader: 'Confirm your email to activate your account.',
    heading: 'Confirm your email address',
    body: (name?: string) =>
      `Hi${name ? ` ${escapeHtml(name)}` : ''}, thanks for signing up for CorpusAI. Click the button below to confirm your email address and activate your account.`,
    cta: 'Confirm my email',
    hint: "This link expires in 24 hours. If you didn't create a CorpusAI account, you can safely ignore this email.",
  },
};

export function verifyEmailTemplate(
  url: string,
  name?: string,
  locale: Locale = 'fr'
): EmailTemplate {
  const t = copy[locale];
  return {
    subject: t.subject,
    html: layout(
      [heading(t.heading), paragraph(t.body(name)), button(url, t.cta), hint(t.hint)].join(''),
      t.preheader,
      locale
    ),
  };
}
