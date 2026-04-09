/**
 * Email templates for CorpusAI.
 *
 * Each template function returns { subject, html }.
 * The service only handles sending — all content lives here.
 */

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 24px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #3b82f6; color: #fff; font-weight: 700; font-size: 14px; width: 32px; height: 32px; line-height: 32px; border-radius: 8px; text-align: center;">C</div>
      <span style="margin-left: 8px; font-size: 16px; font-weight: 600; color: #0f172a; vertical-align: middle;">CorpusAI</span>
    </div>
    <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
      ${content}
    </div>
    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px; line-height: 1.5;">
      <p style="margin: 0;">CorpusAI — Plateforme d'assistants IA</p>
      <p style="margin: 4px 0 0;">Vous recevez cet email car vous utilisez CorpusAI.</p>
    </div>
  </div>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h2 style="color: #0f172a; margin: 0 0 8px; font-size: 20px;">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="color: #64748b; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">${text}</p>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">${label}</a>`;
}

function hint(text: string): string {
  return `<p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">${text}</p>`;
}

function successBox(text: string): string {
  return `<div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin: 0 0 24px;">
    <p style="color: #166534; font-size: 13px; margin: 0;">${text}</p>
  </div>`;
}

function errorBox(text: string): string {
  return `<div style="background: #fef2f2; border-radius: 8px; padding: 12px 16px; margin: 0 0 24px;">
    <p style="color: #991b1b; font-size: 13px; margin: 0;">${text}</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface EmailTemplate {
  subject: string;
  html: string;
}

export function magicLinkTemplate(url: string, aiName?: string): EmailTemplate {
  return {
    subject: aiName ? `Votre lien d'accès à ${aiName}` : 'Votre lien de connexion CorpusAI',
    html: layout(
      [
        heading('Connexion à votre espace'),
        paragraph(
          aiName
            ? `Cliquez ci-dessous pour accéder à <strong>${aiName}</strong>. Ce lien expire dans <strong>15 minutes</strong>.`
            : 'Cliquez ci-dessous pour vous connecter. Ce lien expire dans <strong>15 minutes</strong>.'
        ),
        button(url, 'Se connecter'),
        hint("Si vous n'avez pas demandé ce lien, ignorez cet email."),
      ].join('\n')
    ),
  };
}

export function inviteTemplate(
  aiName: string,
  creatorName: string,
  accessUrl: string
): EmailTemplate {
  return {
    subject: `${creatorName} vous invite à accéder à ${aiName}`,
    html: layout(
      [
        heading('Vous avez été invité'),
        paragraph(
          `<strong>${creatorName}</strong> vous invite à accéder à l'assistant IA <strong>${aiName}</strong>.`
        ),
        button(accessUrl, `Accéder à ${aiName}`),
        hint(`Cet email vous a été envoyé car ${creatorName} a partagé cet assistant avec vous.`),
      ].join('\n')
    ),
  };
}

export function welcomeTemplate(name: string, dashboardUrl: string): EmailTemplate {
  return {
    subject: 'Bienvenue sur CorpusAI',
    html: layout(
      [
        heading('Bienvenue sur CorpusAI !'),
        paragraph(
          `Bonjour ${name || ''}, votre compte est prêt. Vous pouvez maintenant créer votre premier assistant IA en quelques minutes.`
        ),
        `<p style="color: #64748b; margin: 0 0 8px; font-size: 14px;"><strong>Pour démarrer :</strong></p>`,
        `<ol style="color: #64748b; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
        <li>Créez un assistant et configurez son comportement</li>
        <li>Uploadez vos documents (PDF, DOCX, TXT...)</li>
        <li>Partagez le lien de chat avec vos utilisateurs</li>
      </ol>`,
        button(dashboardUrl, 'Accéder au dashboard'),
      ].join('\n')
    ),
  };
}

export function documentIndexedTemplate(
  documentName: string,
  aiName: string,
  chunkCount: number,
  aiSettingsUrl: string
): EmailTemplate {
  return {
    subject: `Document "${documentName}" indexé — ${aiName}`,
    html: layout(
      [
        heading('Document indexé avec succès'),
        `<p style="color: #64748b; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
        Votre document <strong>${documentName}</strong> a été traité et ajouté à l'assistant <strong>${aiName}</strong>.
      </p>`,
        successBox(
          `✓ ${chunkCount} segments indexés — votre assistant peut maintenant répondre aux questions sur ce document.`
        ),
        button(aiSettingsUrl, "Voir l'assistant"),
      ].join('\n')
    ),
  };
}

export function verifyEmailTemplate(url: string, name?: string): EmailTemplate {
  return {
    subject: 'Vérifiez votre adresse email — CorpusAI',
    html: layout(
      [
        heading('Vérifiez votre email'),
        paragraph(
          `Bonjour${name ? ` ${name}` : ''}, cliquez ci-dessous pour vérifier votre adresse email et activer votre compte CorpusAI.`
        ),
        button(url, 'Vérifier mon email'),
        hint(
          "Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email."
        ),
      ].join('\n')
    ),
  };
}

export function documentFailedTemplate(
  documentName: string,
  aiName: string,
  errorMessage: string,
  retryUrl: string
): EmailTemplate {
  return {
    subject: `Erreur — "${documentName}" — ${aiName}`,
    html: layout(
      [
        heading('Erreur lors du traitement'),
        `<p style="color: #64748b; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
        Le document <strong>${documentName}</strong> n'a pas pu être traité pour l'assistant <strong>${aiName}</strong>.
      </p>`,
        errorBox(`Erreur : ${errorMessage}`),
        paragraph(
          'Vous pouvez réessayer le traitement ou uploader une nouvelle version du document.'
        ),
        button(retryUrl, 'Réessayer'),
      ].join('\n')
    ),
  };
}
