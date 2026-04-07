import { useCallback, useEffect } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";

import { useAuth } from "@/contexts/AuthContext";
import {
  stashTeamInviteTokenFromUrl,
  tryFlushPendingTeamInvite,
  type TeamInviteFlushResult,
} from "@/lib/teamInvite";

function presentFlushResult(r: TeamInviteFlushResult) {
  if (!r) return;
  if (r.ok) {
    Alert.alert("You're on the team", "You have successfully joined the team.");
  } else {
    Alert.alert("Team invitation", r.message);
  }
}

/**
 * Handles team invite deep links / web join URLs: stash token, accept when signed in.
 */
export function TeamInviteBootstrap() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  const handleFlushResult = useCallback((r: TeamInviteFlushResult) => {
    presentFlushResult(r);
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      void (async () => {
        const stashed = await stashTeamInviteTokenFromUrl(url);
        if (!stashed) return;
        const r = await tryFlushPendingTeamInvite();
        handleFlushResult(r);
      })();
    });
    return () => sub.remove();
  }, [handleFlushResult]);

  useEffect(() => {
    void (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) await stashTeamInviteTokenFromUrl(initial);
      const r = await tryFlushPendingTeamInvite();
      handleFlushResult(r);
    })();
  }, [handleFlushResult]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || isGuest) return;
    void (async () => {
      const r = await tryFlushPendingTeamInvite();
      handleFlushResult(r);
    })();
  }, [isLoading, isAuthenticated, isGuest, handleFlushResult]);

  return null;
}
