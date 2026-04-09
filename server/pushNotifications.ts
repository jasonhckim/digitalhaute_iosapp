import { storage } from "./storage";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type NotificationChannel =
  | "deliveryAlerts"
  | "budgetAlerts"
  | "orderStatusUpdates"
  | "weeklySummary";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  channelId?: string;
}

interface PushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Resolve all user IDs in a workspace: the owner plus active team members.
 */
export async function resolveWorkspaceRecipients(workspaceOwnerId: string): Promise<string[]> {
  const members = await storage.listTeamMembers(workspaceOwnerId);
  const ids = new Set<string>([workspaceOwnerId]);
  for (const m of members) {
    ids.add(m.memberUserId);
  }
  return Array.from(ids);
}

/**
 * Determine which user IDs should receive a notification on a given channel.
 * Loads preferences per user and filters by the channel boolean.
 */
export async function filterByChannel(
  userIds: string[],
  channel: NotificationChannel,
): Promise<string[]> {
  const eligible: string[] = [];
  for (const uid of userIds) {
    const prefs = await storage.getNotificationPreferences(uid);
    const enabled = prefs ? prefs[channel] : getDefaultForChannel(channel);
    if (enabled) eligible.push(uid);
  }
  return eligible;
}

function getDefaultForChannel(channel: NotificationChannel): boolean {
  return channel !== "weeklySummary";
}

/**
 * Send push notifications to a list of user IDs filtered by channel.
 * Fire-and-forget: errors are logged but never thrown to callers.
 */
export async function sendPushToWorkspace(
  workspaceOwnerId: string,
  channel: NotificationChannel,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const recipients = await resolveWorkspaceRecipients(workspaceOwnerId);
    const eligible = await filterByChannel(recipients, channel);
    if (eligible.length === 0) return;

    const tokens = await storage.listPushTokensForUsers(eligible);
    if (tokens.length === 0) return;

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expoPushToken,
      title,
      body,
      data,
      sound: "default",
      channelId: "default",
    }));

    await sendExpoPushBatch(messages);
  } catch (err) {
    console.error("[push] sendPushToWorkspace error:", err);
  }
}

/**
 * Send push to specific user IDs (no workspace expansion, no channel filter).
 * Used by the weekly cron which has already resolved recipients.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const tokens = await storage.listPushTokensForUsers(userIds);
    if (tokens.length === 0) return;

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expoPushToken,
      title,
      body,
      data,
      sound: "default",
      channelId: "default",
    }));

    await sendExpoPushBatch(messages);
  } catch (err) {
    console.error("[push] sendPushToUsers error:", err);
  }
}

/**
 * Post messages to the Expo Push API in chunks of 100 (Expo's batch limit).
 * Prunes tokens that receive a DeviceNotRegistered error.
 */
async function sendExpoPushBatch(messages: PushMessage[]): Promise<void> {
  const CHUNK_SIZE = 100;

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        console.error(`[push] Expo API ${res.status}: ${await res.text()}`);
        continue;
      }

      const json = (await res.json()) as { data: PushTicket[] };

      for (let j = 0; j < json.data.length; j++) {
        const ticket = json.data[j];
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const badToken = chunk[j].to;
          console.warn(`[push] Pruning unregistered token: ${badToken.slice(0, 20)}...`);
          await storage.deletePushToken(badToken).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[push] Expo fetch error:", err);
    }
  }
}
