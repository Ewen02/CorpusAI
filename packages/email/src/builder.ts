/**
 * @corpusai/email — Core email builder
 *
 * Table-based layout for Outlook/Gmail compatibility.
 * Dark theme matching the CorpusAI design system (violet #7C3AED primary).
 * All user-provided strings MUST be passed through escapeHtml() before insertion.
 */

// ── Types ────────────────────────────────────────────────────

export type Locale = 'fr' | 'en';

export interface EmailTemplate {
  subject: string;
  html: string;
}

// ── Colors (CorpusAI dark theme) ─────────────────────────────

const c = {
  bg: '#0D0A1A',
  card: '#1A1630',
  border: '#2A2847',
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  accent: '#3B82F6',
  textPrimary: '#F0F0F5',
  textSecondary: '#A0A0B8',
  textHint: '#6B6B80',
  successBg: '#0D2818',
  successText: '#22C55E',
  errorBg: '#2D0F0F',
  errorText: '#EF4444',
  infoBg: '#0F1A2D',
  infoText: '#60A5FA',
} as const;

// ── Font stack ───────────────────────────────────────────────

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// ── Security ─────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS in email content. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Layout ───────────────────────────────────────────────────

const footerCopy = {
  fr: {
    brand: "CorpusAI — Plateforme d'assistants IA",
    notice: 'Vous recevez cet email car vous utilisez CorpusAI.',
  },
  en: {
    brand: 'CorpusAI — AI Assistant Platform',
    notice: 'You are receiving this email because you use CorpusAI.',
  },
};

/**
 * Wrap email content in the CorpusAI branded layout.
 * Table-based for maximum client compatibility (Outlook, Gmail, Apple Mail).
 */
export function layout(content: string, preheader?: string, locale: Locale = 'fr'): string {
  const footer = footerCopy[locale];
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:0;line-height:0;color:transparent">${escapeHtml(preheader)}${'&zwnj;&nbsp;'.repeat(20)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>CorpusAI</title>
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${c.bg};font-family:${fontFamily};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.bg}">
  <tr>
    <td align="center" style="padding:40px 16px">
      <!--[if mso]><table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:32px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${c.primary};width:32px;height:32px;border-radius:8px;text-align:center;color:#fff;font-weight:700;font-size:14px;line-height:32px;mso-line-height-rule:exactly">C</td>
                <td style="padding-left:10px;font-size:18px;font-weight:600;color:${c.textPrimary};letter-spacing:-0.02em">CorpusAI</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td style="background:${c.card};border-radius:12px;padding:32px 28px;border:1px solid ${c.border}">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:24px">
            <p style="margin:0;font-size:11px;line-height:1.5;color:${c.textHint}">${footer.brand}</p>
            <p style="margin:4px 0 0;font-size:11px;line-height:1.5;color:${c.textHint}">${footer.notice}</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── Components ───────────────────────────────────────────────

export function heading(text: string): string {
  return `<h2 style="color:${c.textPrimary};margin:0 0 8px;font-size:20px;font-weight:700;line-height:1.3;font-family:${fontFamily}">${text}</h2>`;
}

export function paragraph(text: string): string {
  return `<p style="color:${c.textSecondary};margin:0 0 20px;font-size:14px;line-height:1.65;font-family:${fontFamily}">${text}</p>`;
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
  <tr>
    <td align="center" style="background:${c.primary};border-radius:8px">
      <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${fontFamily};mso-padding-alt:0">
        <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:18pt">&nbsp;</i><![endif]-->
        ${escapeHtml(label)}
        <!--[if mso]><i style="mso-font-width:150%">&nbsp;</i><![endif]-->
      </a>
    </td>
  </tr>
</table>`;
}

export function hint(text: string): string {
  return `<p style="color:${c.textHint};font-size:12px;margin:20px 0 0;line-height:1.5;font-family:${fontFamily}">${text}</p>`;
}

export function successBox(text: string): string {
  return `<div style="background:${c.successBg};border-radius:8px;padding:12px 16px;margin:0 0 20px;border:1px solid ${c.successText}22">
  <p style="color:${c.successText};font-size:13px;margin:0;line-height:1.5;font-family:${fontFamily}">${text}</p>
</div>`;
}

export function errorBox(text: string): string {
  return `<div style="background:${c.errorBg};border-radius:8px;padding:12px 16px;margin:0 0 20px;border:1px solid ${c.errorText}22">
  <p style="color:${c.errorText};font-size:13px;margin:0;line-height:1.5;font-family:${fontFamily}">${text}</p>
</div>`;
}

export function infoBox(text: string): string {
  return `<div style="background:${c.infoBg};border-radius:8px;padding:12px 16px;margin:0 0 20px;border:1px solid ${c.infoText}22">
  <p style="color:${c.infoText};font-size:13px;margin:0;line-height:1.5;font-family:${fontFamily}">${text}</p>
</div>`;
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${c.border};margin:24px 0" />`;
}

export function spacer(height = 16): string {
  return `<div style="height:${height}px;line-height:${height}px;font-size:0">&nbsp;</div>`;
}
