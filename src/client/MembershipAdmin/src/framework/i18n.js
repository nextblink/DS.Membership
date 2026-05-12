import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from '../locales/en/common.json'
import enAuth from '../locales/en/auth.json'
import enDashboard from '../locales/en/dashboard.json'
import enMembers from '../locales/en/members.json'
import enForms from '../locales/en/forms.json'
import enOrgUnits from '../locales/en/orgUnits.json'
import enFunctions from '../locales/en/functions.json'
import enUsers from '../locales/en/users.json'
import enProfile from '../locales/en/profile.json'
import enEnums from '../locales/en/enums.json'

import srCommon from '../locales/sr/common.json'
import srAuth from '../locales/sr/auth.json'
import srDashboard from '../locales/sr/dashboard.json'
import srMembers from '../locales/sr/members.json'
import srForms from '../locales/sr/forms.json'
import srOrgUnits from '../locales/sr/orgUnits.json'
import srFunctions from '../locales/sr/functions.json'
import srUsers from '../locales/sr/users.json'
import srProfile from '../locales/sr/profile.json'
import srEnums from '../locales/sr/enums.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        members: enMembers,
        forms: enForms,
        orgUnits: enOrgUnits,
        functions: enFunctions,
        users: enUsers,
        profile: enProfile,
        enums: enEnums,
      },
      sr: {
        common: srCommon,
        auth: srAuth,
        dashboard: srDashboard,
        members: srMembers,
        forms: srForms,
        orgUnits: srOrgUnits,
        functions: srFunctions,
        users: srUsers,
        profile: srProfile,
        enums: srEnums,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'sr'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    ns: ['common', 'auth', 'dashboard', 'members', 'forms', 'orgUnits', 'functions', 'users', 'profile', 'enums'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

export default i18n
