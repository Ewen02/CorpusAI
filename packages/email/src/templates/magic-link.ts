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
    subject: (aiName?: string) =>
      aiName ? `Votre lien d'accès — ${escapeHtml(aiName)}` : 'Votre lien de connexion — CorpusAI',
    preheader: (aiName?: string) =>
      aiName ? `Accédez à ${aiName} en un clic.` : 'Connectez-vous à CorpusAI en un clic.',
    heading: 'Votre lien de connexion',
    body: (aiName?: string) =>
      aiName
        ? `Cliquez sur le bouton ci-dessous pour accéder à <strong>${escapeHtml(aiName)}</strong>. Ce lien est valide pendant <strong>15 minutes</strong>.`
        : 'Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valide pendant <strong>15 minutes</strong>.',
    cta: 'Se connecter',
    hint: "Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email en toute sécurité.",
  },
  en: {
    subject: (aiName?: string) =>
      aiName ? `Your access link — ${escapeHtml(aiName)}` : 'Your sign-in link — CorpusAI',
    preheader: (aiName?: string) =>
      aiName ? `Access ${aiName} in one click.` : 'Sign in to CorpusAI in one click.',
    heading: 'Your sign-in link',
    body: (aiName?: string) =>
      aiName
        ? `Click the button below to access <strong>${escapeHtml(aiName)}</strong>. This link is valid for <strong>15 minutes</strong>.`
        : 'Click the button below to sign in. This link is valid for <strong>15 minutes</strong>.',
    cta: 'Sign in',
    hint: "If you didn't request this link, you can safely ignore this email.",
  },
};

export function magicLinkTemplate(
  url: string,
  aiName?: string,
  locale: Locale = 'fr'
): EmailTemplate {
  const t = copy[locale];
  return {
    subject: t.subject(aiName),
    html: layout(
      [heading(t.heading), paragraph(t.body(aiName)), button(url, t.cta), hint(t.hint)].join(''),
      t.preheader(aiName),
      locale
    ),
  };
}
