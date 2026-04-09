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
    subject: 'Réinitialisez votre mot de passe — CorpusAI',
    preheader: 'Cliquez pour choisir un nouveau mot de passe.',
    heading: 'Réinitialisation du mot de passe',
    body: (name?: string) =>
      `Bonjour${name ? ` ${escapeHtml(name)}` : ''}, nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.`,
    cta: 'Réinitialiser le mot de passe',
    hint: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.",
  },
  en: {
    subject: 'Reset your password — CorpusAI',
    preheader: 'Click to choose a new password.',
    heading: 'Password reset',
    body: (name?: string) =>
      `Hi${name ? ` ${escapeHtml(name)}` : ''}, we received a request to reset your password. Click the button below to choose a new one.`,
    cta: 'Reset password',
    hint: "If you didn't request this reset, you can safely ignore this email. Your current password will remain unchanged.",
  },
};

export function resetPasswordTemplate(
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
