/**
 * UIAP Edge — Centralized branding configuration.
 *
 * Future: this could be fetched from an API endpoint or
 * stored in the database for per-organization customization.
 */

export const branding = {
  /** Short application name shown in the header and title. */
  applicationName: 'UIAP',
  /** Full application name for subtitles and about pages. */
  applicationFullName: 'Unified Intelligent Application Platform',
  /** Organization name — customized per deployment. */
  organizationName: '',
  /** Logo URL — falls back to the built-in diamond icon. */
  logoUrl: '',
  /** Theme accent color (CSS custom property value). */
  accentColor: '#6c5ce7',
} as const;
