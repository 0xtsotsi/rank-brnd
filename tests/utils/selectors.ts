/**
 * Reusable selector definitions for common page elements
 *
 * Centralizes selector strings to make tests more maintainable
 */

export const Selectors = {
  // Auth
  signInButton:
    'button[type="submit"], button:has-text("Sign In"), button:has-text("Sign in")',
  signOutButton:
    'button:has-text("Sign Out"), button:has-text("Sign out"), button:has-text("Logout")',
  emailInput: 'input[name="email"], input[type="email"]',
  passwordInput: 'input[name="password"], input[type="password"]',

  // Navigation
  navBar: 'nav, [role="navigation"]',
  homeLink: 'a[href="/"], a:has-text("Home")',
  dashboardLink: 'a[href="/dashboard"], a:has-text("Dashboard")',
  articlesLink: 'a[href="/articles"], a:has-text("Articles")',
  keywordsLink: 'a[href="/keywords"], a:has-text("Keywords")',
  settingsLink: 'a[href="/settings"], a:has-text("Settings")',

  // Common elements
  primaryButton: 'button:not([disabled]):not([type="submit"]), .btn-primary',
  submitButton: 'button[type="submit"]',
  cancelButton: 'button:has-text("Cancel"), .btn-cancel',
  deleteButton: 'button:has-text("Delete"), .btn-delete',
  editButton: 'button:has-text("Edit"), .btn-edit',
  saveButton: 'button:has-text("Save")',

  // Forms
  formInput:
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])',
  formSelect: 'select',
  formTextarea: 'textarea',
  formCheckbox: 'input[type="checkbox"]',
  formRadio: 'input[type="radio"]',
  formLabel: 'label',

  // Notifications
  toast: '[role="status"], .toast, .notification',
  successToast:
    '.toast.success, .notification.success, [role="status"][data-type="success"]',
  errorToast:
    '.toast.error, .notification.error, [role="status"][data-type="error"]',
  warningToast:
    '.toast.warning, .notification.warning, [role="status"][data-type="warning"]',
  infoToast:
    '.toast.info, .notification.info, [role="status"][data-type="info"]',

  // Loading states
  spinner: '.spinner, .loading, [role="status"][aria-busy="true"]',
  skeleton: '.skeleton, [aria-busy="true"]',

  // Modals
  modal: '.modal, [role="dialog"], .dialog',
  modalOverlay: '.modal-overlay, .dialog-overlay, [role="dialog"] + div',
  modalClose:
    'button[aria-label="Close"], button:has-text("Close"), button:has-text("×")',
  modalTitle: '.modal-title, [role="dialog"] h1, [role="dialog"] h2',

  // Dashboard
  dashboardHeading: 'h1:has-text("Dashboard")',
  statsCard: '.stat-card, .metric-card, [data-testid="stat"]',

  // Articles
  articleList: '.article-list, [data-testid="article-list"]',
  articleCard: '.article-card, [data-testid="article-card"]',
  articleTitle: '.article-title, [data-testid="article-title"]',
  createArticleButton:
    'button:has-text("Create Article"), a[href="/articles/new"]',

  // Keywords
  keywordList: '.keyword-list, [data-testid="keyword-list"]',
  keywordCard: '.keyword-card, [data-testid="keyword-card"]',
  keywordSearch:
    'input[placeholder*="search" i], input[name="search"], [data-testid="keyword-search"]',

  // Onboarding
  onboardingProgress: '.progress-bar, [data-testid="onboarding-progress"]',
  onboardingStep: '.onboarding-step, [data-testid="onboarding-step"]',
  skipButton: 'button:has-text("Skip"), button:has-text("Skip for now")',
  nextButton: 'button:has-text("Next"), button:has-text("Continue")',

  // Integrations
  cmsOption: '.cms-option, [data-testid="cms-option"]',
  integrationCard: '.integration-card, [data-testid="integration-card"]',
  connectButton: 'button:has-text("Connect"), button:has-text("Connect")',

  // Settings
  settingsSection: '.settings-section, [data-testid="settings-section"]',
  settingsTab: '.settings-tab, [role="tab"]',

  // Common data attributes
  dataTestId: (testId: string) => `[data-testid="${testId}"]`,
  dataRole: (role: string) => `[data-role="${role}"]`,
};

/**
 * Page-specific selector groups
 */
export const PageSelectors = {
  signIn: {
    form: 'form[action*="/sign-in"], form[data-testid="sign-in-form"]',
    ...Selectors,
  },
  signUp: {
    form: 'form[action*="/sign-up"], form[data-testid="sign-up-form"]',
    ...Selectors,
  },
  dashboard: {
    heading: 'h1',
    statsCards: '.stat-card',
    ...Selectors,
  },
  articles: {
    list: '.article-list',
    card: '.article-card',
    createButton: 'a[href="/articles/new"]',
    ...Selectors,
  },
  keywords: {
    list: '.keyword-list',
    searchInput: 'input[placeholder*="search"]',
    ...Selectors,
  },
  onboarding: {
    progressBar: '.progress-bar',
    stepIndicator: '.step-indicator',
    ...Selectors,
  },
};

/**
 * Dynamic selector builders
 */
export const SelectorBuilders = {
  /**
   * Build a selector for an element with specific text
   */
  withText: (selector: string, text: string) =>
    `${selector}:has-text("${text}")`,

  /**
   * Build a selector for an element with exact text
   */
  withExactText: (selector: string, text: string) =>
    `${selector}:text("${text}")`,

  /**
   * Build a selector for an element with specific attribute
   */
  withAttribute: (selector: string, attribute: string, value: string) =>
    `${selector}[${attribute}="${value}"]`,

  /**
   * Build a selector for nth element
   */
  nth: (selector: string, index: number) => `${selector} >> nth=${index}`,

  /**
   * Build a selector for an element containing specific child
   */
  withChild: (parent: string, child: string) => `${parent} >> ${child}`,

  /**
   * Build a selector for an element following another
   */
  following: (selector: string, following: string) =>
    `${selector} + ${following}`,

  /**
   * Build a selector for an element following another (siblings)
   */
  followingAll: (selector: string, following: string) =>
    `${selector} ~ ${following}`,
};
