import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import he from './locales/he.json';
import en from './locales/en.json';
import ru from './locales/ru.json';

const savedLng = typeof localStorage !== 'undefined' ? (localStorage.getItem('lng') ?? 'he') : 'he';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: savedLng,
    fallbackLng: 'he',
    interpolation: { escapeValue: false },
  });

export default i18n;
