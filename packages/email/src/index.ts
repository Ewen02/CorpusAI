// Builder primitives
export {
  escapeHtml,
  layout,
  heading,
  paragraph,
  button,
  hint,
  successBox,
  errorBox,
  infoBox,
  divider,
  spacer,
  type Locale,
  type EmailTemplate,
} from './builder';

// Templates
export {
  verifyEmailTemplate,
  resetPasswordTemplate,
  magicLinkTemplate,
  inviteTemplate,
  welcomeTemplate,
  documentIndexedTemplate,
  documentFailedTemplate,
} from './templates';
