import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { PLANS } from "@/lib/plans";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";

type TeamRole = "buyer" | "assistant";

interface TeamMemberEntry {
  id: string;
  ownerUserId: string;
  memberUserId: string;
  role: TeamRole;
  joinedAt: string;
  removedAt: string | null;
  memberName: string;
  memberEmail: string;
}

interface TeamInvitationEntry {
  id: string;
  inviterUserId: string;
  email: string;
  role: TeamRole;
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface MembersResponse {
  members: TeamMemberEntry[];
  count: number;
  plan: string;
}

interface InvitationsResponse {
  invitations: TeamInvitationEntry[];
}

const PLAN_MAX_USERS: Record<string, number> = {
  free: 1,
  starter: 1,
  growth: 4,
  vip: 6,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TeamMembersScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("buyer");

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useQuery<MembersResponse>({
    queryKey: ["api", "team", "members"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const {
    data: invitationsData,
    isLoading: isLoadingInvitations,
    error: invitationsError,
  } = useQuery<InvitationsResponse>({
    queryKey: ["api", "team", "invitations"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const invalidateTeam = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["api", "team", "members"] });
    queryClient.invalidateQueries({ queryKey: ["api", "team", "invitations"] });
  }, [queryClient]);

  const inviteMutation = useMutation({
    mutationFn: async (input: { email: string; role: TeamRole }) => {
      const res = await apiRequest("POST", "/api/team/invite", input);
      return res.json();
    },
    onSuccess: () => {
      invalidateTeam();
      setInviteEmail("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Invitation Sent", "Your team invitation has been sent.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to send invitation.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiRequest("DELETE", `/api/team/members/${memberId}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateTeam();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to remove team member.");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TeamRole }) => {
      const res = await apiRequest("PATCH", `/api/team/members/${memberId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      invalidateTeam();
      Haptics.selectionAsync();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to update role.");
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await apiRequest("DELETE", `/api/team/invitations/${invitationId}`);
      return res.json();
    },
    onSuccess: () => {
      invalidateTeam();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to cancel invitation.");
    },
  });

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) {
      Alert.alert("Email Required", "Please enter an email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    inviteMutation.mutate({ email, role: inviteRole });
  };

  const handleRemoveMember = (member: TeamMemberEntry) => {
    Alert.alert(
      "Remove Team Member",
      `Are you sure you want to remove ${member.memberName} from your team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMutation.mutate(member.id),
        },
      ],
    );
  };

  const handleMemberAction = (member: TeamMemberEntry) => {
    Haptics.selectionAsync();
    if (Platform.OS === "ios") {
      const newRole: TeamRole = member.role === "buyer" ? "assistant" : "buyer";
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            `Change to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`,
            "Remove from Team",
            "Cancel",
          ],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            updateRoleMutation.mutate({ memberId: member.id, role: newRole });
          } else if (buttonIndex === 1) {
            handleRemoveMember(member);
          }
        },
      );
    } else {
      const newRole: TeamRole = member.role === "buyer" ? "assistant" : "buyer";
      Alert.alert("Team Member Options", `${member.memberName}`, [
        {
          text: `Change to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`,
          onPress: () =>
            updateRoleMutation.mutate({ memberId: member.id, role: newRole }),
        },
        {
          text: "Remove from Team",
          style: "destructive",
          onPress: () => handleRemoveMember(member),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleCancelInvite = (invitation: TeamInvitationEntry) => {
    Alert.alert(
      "Cancel Invitation",
      `Cancel the invitation sent to ${invitation.email}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Invitation",
          style: "destructive",
          onPress: () => cancelInviteMutation.mutate(invitation.id),
        },
      ],
    );
  };

  const members = membersData?.members ?? [];
  const plan = membersData?.plan ?? user?.subscriptionPlan ?? "free";
  const maxUsers = PLAN_MAX_USERS[plan] ?? 1;
  const currentCount = members.length + 1; // +1 for owner
  const pendingInvitations =
    invitationsData?.invitations.filter((i) => i.status === "pending") ?? [];
  const isLoading = isLoadingMembers || isLoadingInvitations;
  const canInvite = currentCount + pendingInvitations.length < maxUsers;
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={BrandColors.gold} />
      </ThemedView>
    );
  }

  if (membersError && !membersData) {
    const errMsg =
      membersError instanceof Error
        ? membersError.message
        : String(membersError);
    const isAuth = errMsg.includes("401");
    const isDbHint =
      errMsg.includes("does not exist") || errMsg.includes("relation");
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather
          name={isAuth ? "lock" : "alert-circle"}
          size={40}
          color={theme.textTertiary}
        />
        <ThemedText
          style={{
            color: theme.textSecondary,
            marginTop: Spacing.md,
            textAlign: "center",
            paddingHorizontal: Spacing.xl,
          }}
        >
          {isAuth
            ? "Your session has expired. Log out and log back in, then open Team Members again."
            : isDbHint
              ? "The server database is still updating. Wait a minute after deploy, force-quit the app, and try again."
              : "Unable to load team data. Check your connection or try again later."}
        </ThemedText>
        <ThemedText
          style={{
            color: theme.textTertiary,
            marginTop: Spacing.sm,
            fontSize: 12,
            textAlign: "center",
            paddingHorizontal: Spacing.lg,
          }}
        >
          {errMsg.length > 180 ? `${errMsg.slice(0, 180)}…` : errMsg}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Capacity Header */}
        <View
          style={[
            styles.capacityCard,
            { backgroundColor: `${BrandColors.gold}10` },
          ]}
        >
          <View style={styles.capacityRow}>
            <View>
              <ThemedText style={styles.capacityTitle}>Team Capacity</ThemedText>
              <ThemedText style={[styles.capacitySubtitle, { color: theme.textSecondary }]}>
                {PLANS[plan as keyof typeof PLANS]?.name ?? "Free"} Plan
              </ThemedText>
            </View>
            <View style={styles.capacityBadge}>
              <ThemedText style={[styles.capacityCount, { color: BrandColors.gold }]}>
                {currentCount}
              </ThemedText>
              <ThemedText style={[styles.capacityMax, { color: theme.textTertiary }]}>
                /{maxUsers}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: `${BrandColors.gold}20` }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: BrandColors.gold,
                  width: `${Math.min((currentCount / maxUsers) * 100, 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Invite Form */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundRoot },
            Shadows.card,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}
            >
              <Feather name="user-plus" size={20} color={BrandColors.gold} />
            </View>
            <ThemedText style={styles.sectionTitle}>Invite Team Member</ThemedText>
          </View>

          {canInvite ? (
            <>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Email Address
              </ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="colleague@example.com"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Role
              </ThemedText>
              <View style={styles.roleRow}>
                {(["buyer", "assistant"] as TeamRole[]).map((role) => (
                  <Pressable
                    key={role}
                    style={[
                      styles.roleOption,
                      {
                        borderColor:
                          inviteRole === role ? BrandColors.gold : theme.border,
                        backgroundColor:
                          inviteRole === role ? `${BrandColors.gold}10` : "transparent",
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setInviteRole(role);
                    }}
                  >
                    <View style={styles.radioOuter}>
                      {inviteRole === role && (
                        <View
                          style={[styles.radioInner, { backgroundColor: BrandColors.gold }]}
                        />
                      )}
                    </View>
                    <View style={styles.roleOptionText}>
                      <ThemedText style={styles.roleOptionLabel}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </ThemedText>
                      <ThemedText
                        style={[styles.roleOptionHint, { color: theme.textSecondary }]}
                      >
                        {role === "buyer"
                          ? "Can view and manage products"
                          : "View-only access to inventory"}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.inviteButton,
                  {
                    backgroundColor: BrandColors.gold,
                    opacity: pressed || inviteMutation.isPending ? 0.8 : 1,
                  },
                ]}
                onPress={handleInvite}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <ThemedText style={styles.inviteButtonText}>Send Invitation</ThemedText>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.limitReached}>
              <Feather name="alert-circle" size={20} color={theme.textTertiary} />
              <ThemedText style={[styles.limitText, { color: theme.textSecondary }]}>
                Team limit reached. Upgrade your plan to invite more members.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.backgroundRoot },
              Shadows.card,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View
                style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}
              >
                <Feather name="clock" size={20} color={BrandColors.gold} />
              </View>
              <ThemedText style={styles.sectionTitle}>
                Pending Invitations ({pendingInvitations.length})
              </ThemedText>
            </View>

            {pendingInvitations.map((invitation) => (
              <View
                key={invitation.id}
                style={[styles.memberRow, { borderColor: theme.border }]}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: `${theme.textTertiary}15` },
                  ]}
                >
                  <Feather name="mail" size={16} color={theme.textTertiary} />
                </View>
                <View style={styles.memberInfo}>
                  <ThemedText style={styles.memberName}>{invitation.email}</ThemedText>
                  <ThemedText style={[styles.memberMeta, { color: theme.textTertiary }]}>
                    {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)} &middot; Sent{" "}
                    {formatDate(invitation.createdAt)}
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.cancelButton, { borderColor: BrandColors.error }]}
                  onPress={() => handleCancelInvite(invitation)}
                  hitSlop={8}
                >
                  <Feather name="x" size={14} color={BrandColors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Active Members */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundRoot },
            Shadows.card,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}
            >
              <Feather name="users" size={20} color={BrandColors.gold} />
            </View>
            <ThemedText style={styles.sectionTitle}>Team Members</ThemedText>
          </View>

          {/* Owner row (always shown) */}
          <View style={[styles.memberRow, { borderColor: theme.border }]}>
            <View
              style={[styles.memberAvatar, { backgroundColor: `${BrandColors.gold}15` }]}
            >
              <ThemedText style={[styles.memberInitial, { color: BrandColors.gold }]}>
                {user?.name?.[0]?.toUpperCase() ?? "Y"}
              </ThemedText>
            </View>
            <View style={styles.memberInfo}>
              <ThemedText style={styles.memberName}>
                {user?.name ?? "You"}{" "}
                <ThemedText style={[styles.youBadge, { color: theme.textTertiary }]}>
                  (You)
                </ThemedText>
              </ThemedText>
              <ThemedText style={[styles.memberMeta, { color: theme.textTertiary }]}>
                {user?.email}
              </ThemedText>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: `${BrandColors.gold}15` }]}>
              <ThemedText style={[styles.roleBadgeText, { color: BrandColors.gold }]}>
                Owner
              </ThemedText>
            </View>
          </View>

          {members.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="user-plus" size={32} color={theme.textTertiary} />
              <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
                No team members yet. Invite someone above to get started.
              </ThemedText>
            </View>
          ) : (
            members.map((member) => (
              <Pressable
                key={member.id}
                style={[styles.memberRow, { borderColor: theme.border }]}
                onPress={() => handleMemberAction(member)}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: `${BrandColors.gold}15` },
                  ]}
                >
                  <ThemedText
                    style={[styles.memberInitial, { color: BrandColors.gold }]}
                  >
                    {member.memberName?.[0]?.toUpperCase() ?? "?"}
                  </ThemedText>
                </View>
                <View style={styles.memberInfo}>
                  <ThemedText style={styles.memberName}>
                    {member.memberName}
                  </ThemedText>
                  <ThemedText style={[styles.memberMeta, { color: theme.textTertiary }]}>
                    {member.memberEmail} &middot; Joined{" "}
                    {formatDate(member.joinedAt)}
                  </ThemedText>
                </View>
                <View style={styles.memberTrailing}>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor:
                          member.role === "buyer"
                            ? `${BrandColors.gold}15`
                            : `${theme.textTertiary}15`,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.roleBadgeText,
                        {
                          color:
                            member.role === "buyer"
                              ? BrandColors.gold
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </ThemedText>
                  </View>
                  <Feather
                    name="more-vertical"
                    size={16}
                    color={theme.textTertiary}
                  />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  capacityCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  capacityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  capacityTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  capacitySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  capacityBadge: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  capacityCount: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: "700",
  },
  capacityMax: {
    fontSize: 16,
    fontWeight: "500",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  roleRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BrandColors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleOptionText: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  roleOptionHint: {
    fontSize: 12,
    marginTop: 2,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  limitReached: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  limitText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
  },
  youBadge: {
    fontSize: 13,
    fontWeight: "400",
  },
  memberMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  memberTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cancelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
});
