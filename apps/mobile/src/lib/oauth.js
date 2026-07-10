import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { publicPost } from "./api";

WebBrowser.maybeCompleteAuthSession();

export function getOAuthRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "kind",
    path: "auth/callback"
  });
}

function parseAuthCode(resultUrl) {
  const queryIndex = resultUrl.indexOf("?");
  if (queryIndex === -1) return null;
  const params = new URLSearchParams(resultUrl.slice(queryIndex + 1).split("#")[0]);
  return params.get("code");
}

export async function startOAuthSignIn(provider) {
  const redirectTo = getOAuthRedirectUri();
  const { url, codeVerifier } = await publicPost("/auth/oauth/url", { provider, redirectTo });
  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("OAuth sign-in was cancelled");
  }

  if (result.type !== "success" || !result.url) {
    throw new Error("OAuth sign-in did not complete");
  }

  const code = parseAuthCode(result.url);
  if (!code) {
    throw new Error("OAuth sign-in did not return an authorization code");
  }

  return publicPost("/auth/oauth/callback", { provider, code, redirectTo, codeVerifier });
}
