import * as Linking from "expo-linking";

import { getApiUrl } from "@/lib/query-client";

/** App scheme from app.json */
export const APP_SCHEME = "digitalhaute";

/**
 * Opens the app with token in query (share this in SMS).
 */
export function buildTeamInviteDeepLink(token: string): string {
  return `${APP_SCHEME}://team-invite?token=${encodeURIComponent(token)}`;
}

/**
 * HTTPS page with “Open in app” (opens in Safari / Messages preview).
 */
export function buildTeamInviteWebUrl(token: string): string {
  const base = getApiUrl();
  return new URL(`join-team/${encodeURIComponent(token)}`, base).toString();
}

/**
 * Parse team invite token from deep link or web join URL.
 */
export function extractTeamInviteTokenFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  if (/team-invite/i.test(url)) {
    const qMatch = url.match(/[?&]token=([^&]+)/);
    if (qMatch?.[1]) {
      try {
        return decodeURIComponent(qMatch[1]);
      } catch {
        return qMatch[1];
      }
    }
  }

  try {
    const parsed = Linking.parse(url);
    const path =
      typeof parsed.path === "string" ? parsed.path.replace(/^\//, "") : "";
    if (path === "team-invite" || path.startsWith("team-invite")) {
      const q = parsed.queryParams?.token;
      if (typeof q === "string" && q.trim()) return q.trim();
    }
    if (path.startsWith("join-team/")) {
      const rest = path.slice("join-team/".length);
      if (rest) return decodeURIComponent(rest.split("/")[0] ?? "");
    }
  } catch {
    // fall through to regex
  }

  const joinMatch = url.match(/join-team\/([^?#/]+)/);
  if (joinMatch?.[1]) {
    try {
      return decodeURIComponent(joinMatch[1]);
    } catch {
      return joinMatch[1];
    }
  }

  try {
    const u = new URL(url);
    if (u.protocol === `${APP_SCHEME}:` && u.hostname === "team-invite") {
      const t = u.searchParams.get("token");
      if (t?.trim()) return t.trim();
    }
    if (u.pathname.includes("/join-team/")) {
      const seg = u.pathname.split("/join-team/")[1]?.split("/")[0];
      if (seg) return decodeURIComponent(seg);
    }
  } catch {
    // ignore
  }

  return null;
}
