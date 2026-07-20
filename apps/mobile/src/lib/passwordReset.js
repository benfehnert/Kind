import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import { parsePasswordResetUrl } from "./parsePasswordResetUrl";

export { parsePasswordResetUrl };

export function getPasswordResetRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "kind",
    path: "auth/reset-password"
  });
}

export function subscribeToPasswordResetLinks(onReset) {
  const handleUrl = (url) => {
    const parsed = parsePasswordResetUrl(url);
    if (!parsed || parsed.needsLink || parsed.error) {
      if (parsed?.error) onReset(parsed);
      return;
    }
    onReset(parsed);
  };

  Linking.getInitialURL().then((url) => {
    if (url) handleUrl(url);
  });

  const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));
  return () => subscription.remove();
}
