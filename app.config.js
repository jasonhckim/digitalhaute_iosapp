/**
 * Dynamic Expo config — merges with static `app.json`.
 * Google Sign-In iOS URL scheme comes from REVERSED_CLIENT_ID (committed GoogleService-Info.plist
 * or EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME override).
 * @see https://react-native-google-signin.github.io/docs/setting-up/expo
 */

const fs = require("fs");
const path = require("path");

const GOOGLE_IOS_SCHEME_PREFIX = "com.googleusercontent.apps.";
const PLIST_PATH = path.join(__dirname, "GoogleService-Info.plist");

/** App Store / RFC1738-style rules: alphanumeric, `.`, `-`, `+` only; no underscores. */
function isValidGoogleIosUrlScheme(scheme) {
  if (!scheme || typeof scheme !== "string") return false;
  const t = scheme.trim();
  if (!t.startsWith(GOOGLE_IOS_SCHEME_PREFIX)) return false;
  return /^com\.googleusercontent\.apps\.[a-zA-Z0-9.\-+]+$/u.test(t);
}

function readPlistString(key) {
  try {
    if (!fs.existsSync(PLIST_PATH)) return null;
    const xml = fs.readFileSync(PLIST_PATH, "utf8");
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = xml.match(
      new RegExp(
        `<key>${escaped}<\\/key>\\s*[\\r\\n\\t ]*<string>([^<]+)<\\/string>`,
      ),
    );
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function readReversedClientIdFromPlist() {
  return readPlistString("REVERSED_CLIENT_ID");
}

module.exports = ({ config }) => {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  const fromPlist = readReversedClientIdFromPlist();
  const iosUrlScheme = fromEnv || fromPlist;

  /** For GoogleSignin.configure({ webClientId }). Prefer EXPO_PUBLIC_* on EAS; plist fallbacks for local/CI. */
  const envWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const plistWebClientId = readPlistString("GOOGLE_WEB_CLIENT_ID");
  const plistIosClientId = readPlistString("CLIENT_ID");
  const googleWebClientId =
    envWebClientId || plistWebClientId || plistIosClientId || undefined;

  const plugins = [...(config.plugins ?? [])];

  if (isValidGoogleIosUrlScheme(iosUrlScheme)) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      { iosUrlScheme },
    ]);
  } else if (process.env.EAS_BUILD === "true") {
    throw new Error(
      "[app.config.js] Missing valid Google iOS URL scheme. Add GoogleService-Info.plist at the " +
        "project root (with REVERSED_CLIENT_ID) or set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME. " +
        "The scheme must not contain underscores (App Store validation).",
    );
  } else {
    console.warn(
      "[app.config.js] Google iOS URL scheme not resolved; Google Sign-In may not work until " +
        "GoogleService-Info.plist is present or EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is set.",
    );
    plugins.push("@react-native-google-signin/google-signin");
  }

  return {
    ...config,
    plugins,
    extra: {
      ...(config.extra ?? {}),
      googleWebClientId,
    },
  };
};
