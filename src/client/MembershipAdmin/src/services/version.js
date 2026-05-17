import pkg from '../../package.json'

export const APP_VERSION = pkg.version
export const BUILD_DATE = __BUILD_DATE__

export function getVersionInfo() {
  return {
    version: APP_VERSION,
    buildDate: BUILD_DATE,
  }
}
