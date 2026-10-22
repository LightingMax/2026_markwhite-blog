import { defineI18n } from 'fumadocs-core/i18n';
export const i18n = defineI18n({ languages: ['zh', 'en'], defaultLanguage: 'zh', hideLocale: 'default-locale', fallbackLanguage: null });
export type Locale = 'zh' | 'en';
