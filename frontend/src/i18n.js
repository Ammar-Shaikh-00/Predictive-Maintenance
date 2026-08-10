// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "./locales/en.json";
import deTranslation from "./locales/de.json";

i18n
  .use(LanguageDetector) // automatically detect user language
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      de: { translation: deTranslation },
    },
    fallbackLng: "de",
    lng: "de",
    interpolation: { escapeValue: false },
  });

export default i18n;