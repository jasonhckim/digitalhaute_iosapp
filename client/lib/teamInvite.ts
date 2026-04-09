import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth } from "@/lib/firebase";
import { extractTeamInviteTokenFromUrl } from "@/lib/inviteLinks";
import { apiRequest, queryClient } from "@/lib/query-client";

const PENDING_TOKEN_KEY = "@pending_team_invite_token";

export { extractTeamInviteTokenFromUrl };

/** Persist token from an incoming URL (idempotent). */
export async function stashTeamInviteTokenFromUrl(
  url: string,
): Promise<boolean> {
  const token = extractTeamInviteTokenFromUrl(url);
  if (!token) return false;
  await AsyncStorage.setItem(PENDING_TOKEN_KEY, token);
  return true;
}

export type TeamInviteFlushResult =
  | null
  | { ok: true }
  | { ok: false; message: string; clearPending?: boolean };

function parseApiErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong.";
  const m = err.message;
  const jsonMatch = m.match(/^\d+:\s*(.+)$/);
  return jsonMatch ? jsonMatch[1] : m;
}

/**
 * If there is a pending token and the user is signed in (Firebase), accept the invite.
 */
export async function tryFlushPendingTeamInvite(): Promise<TeamInviteFlushResult> {
  const pending = await AsyncStorage.getItem(PENDING_TOKEN_KEY);
  if (!pending?.trim()) return null;
  if (!auth.currentUser) return null;

  try {
    await apiRequest(
      "POST",
      `/api/team/invitations/${encodeURIComponent(pending.trim())}/accept`,
    );
    await AsyncStorage.removeItem(PENDING_TOKEN_KEY);
    await queryClient.invalidateQueries({ queryKey: ["api", "team"] });
    await queryClient.invalidateQueries({ queryKey: ["api"] });
    return { ok: true };
  } catch (err) {
    const message = parseApiErrorMessage(err);
    const lower = message.toLowerCase();
    const clearPending =
      lower.includes("no longer valid") ||
      lower.includes("not found") ||
      lower.includes("expired") ||
      lower.includes("already on this team") ||
      lower.includes("cannot accept your own");

    if (clearPending) {
      await AsyncStorage.removeItem(PENDING_TOKEN_KEY);
    }

    return { ok: false, message, clearPending };
  }
}
