/**
 * Dynamic Expo config — merges with static `app.json`.
 * Google Sign-In iOS requires `iosUrlScheme` (REVERSED_CLIENT_ID from Firebase iOS app / Google Cloud).
 * @see https://react-native-google-signin.github.io/docs/setting-up/expo
 */
module.exports = ({ config }) => {
  const iosUrlScheme =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
    "com.googleusercontent.apps.REPLACE_WITH_REVERSED_CLIENT_ID";

  if (
    iosUrlScheme === "com.googleusercontent.apps.REPLACE_WITH_REVERSED_CLIENT_ID"
  ) {
    console.warn(
      "[app.config.js] Set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME to your iOS reversed client ID for Google Sign-In (Firebase Console → Project settings → Your apps → iOS → GoogleService-Info.plist → REVERSED_CLIENT_ID).",
    );
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "@react-native-google-signin/google-signin",
        { iosUrlScheme },
      ],
    ],
  };
};
