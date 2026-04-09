import { storage } from "./storage";

export type TeamViewerRole = "owner" | "member";

export type WorkspaceContext = {
  workspaceOwnerId: string;
  viewerRole: TeamViewerRole;
  teamRole?: string;
};

/**
 * Resolves which user's data (products, vendors, budgets, etc.) the request should use.
 * Team members work in the workspace owner's account.
 */
export async function resolveWorkspaceForRequest(
  userId: string,
): Promise<WorkspaceContext> {
  const team = await storage.getTeamForUser(userId);
  if (team) {
    return {
      workspaceOwnerId: team.ownerUserId,
      viewerRole: "member",
      teamRole: team.role,
    };
  }
  return { workspaceOwnerId: userId, viewerRole: "owner" };
}
