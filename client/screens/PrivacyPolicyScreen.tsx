import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";

const EFFECTIVE_DATE = "March 10, 2026";

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: BrandColors.cream }]}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ThemedText style={[styles.date, { color: theme.textTertiary }]}>
        Effective Date: {EFFECTIVE_DATE}
      </ThemedText>

      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        Digital Haute ("we", "our", or "us") operates the Digital Haute mobile
        application (the "App"). This Privacy Policy explains how we collect,
        use, disclose, and safeguard your information when you use the App.
      </ThemedText>

      <ThemedText style={styles.heading}>1. Information We Collect</ThemedText>

      <ThemedText style={styles.subheading}>Account Information</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        When you create an account we collect your name, email address, and
        business name. Authentication is handled by Firebase Authentication;
        passwords are never stored on our servers.
      </ThemedText>

      <ThemedText style={styles.subheading}>Product & Business Data</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        Products, vendors, budgets, and other catalog data you enter are stored
        locally on your device using AsyncStorage and may be synced to our
        servers when you are signed in. This data is used solely to provide the
        App's features to you.
      </ThemedText>

      <ThemedText style={styles.subheading}>Photos & Camera</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        If you use the label scanner or product photo features, we access your
        device camera and photo library with your permission. Photos are
        processed to extract product information and may be sent to third-party
        AI services (Google Gemini) for analysis. We do not store your photos on
        our servers beyond the time needed for processing.
      </ThemedText>

      <ThemedText style={styles.subheading}>Purchase Information</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        Subscriptions are processed by Apple through the App Store and managed
        via RevenueCat. We receive subscription status information but do not
        have access to your payment card details.
      </ThemedText>

      <ThemedText style={styles.subheading}>Usage Data</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        We may collect anonymous usage data such as app opens, feature usage,
        and crash reports to improve the App's performance and reliability.
      </ThemedText>

      <ThemedText style={styles.heading}>2. How We Use Your Information</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        We use the information we collect to:{"\n\n"}
        {"\u2022"} Provide, maintain, and improve the App{"\n"}
        {"\u2022"} Process your label scans and product data{"\n"}
        {"\u2022"} Manage your account and subscription{"\n"}
        {"\u2022"} Sync your data across devices when signed in{"\n"}
        {"\u2022"} Integrate with third-party services you connect (e.g., Shopify){"\n"}
        {"\u2022"} Send transactional notifications related to your account{"\n"}
        {"\u2022"} Respond to your support requests{"\n"}
        {"\u2022"} Comply with legal obligations
      </ThemedText>

      <ThemedText style={styles.heading}>3. Third-Party Services</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        The App uses the following third-party services that may collect or
        process your data according to their own privacy policies:{"\n\n"}
        {"\u2022"} Firebase (Google) — Authentication and backend services{"\n"}
        {"\u2022"} Google Gemini — AI-powered label scanning{"\n"}
        {"\u2022"} RevenueCat — Subscription management{"\n"}
        {"\u2022"} Shopify — Product export (only when you connect your store){"\n"}
        {"\u2022"} Apple — App Store and in-app purchases
      </ThemedText>

      <ThemedText style={styles.heading}>4. Data Storage & Security</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        Your product and vendor data is stored locally on your device and, when
        signed in, on our secured servers. We implement industry-standard
        security measures including encrypted data transmission (HTTPS/TLS),
        secure authentication tokens, and access controls. However, no method of
        electronic storage is 100% secure, and we cannot guarantee absolute
        security.
      </ThemedText>

      <ThemedText style={styles.heading}>5. Data Retention</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        We retain your account and business data for as long as your account is
        active. You can export your data at any time from the Data & Privacy
        screen. When you delete your account, we permanently delete your data
        from our servers within 30 days. Local data on your device is removed
        when you delete the App.
      </ThemedText>

      <ThemedText style={styles.heading}>6. Your Rights</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        You have the right to:{"\n\n"}
        {"\u2022"} Access and export your personal data{"\n"}
        {"\u2022"} Correct inaccurate information{"\n"}
        {"\u2022"} Delete your account and associated data{"\n"}
        {"\u2022"} Opt out of non-essential data collection{"\n\n"}
        You can exercise these rights through the App's Data & Privacy settings
        or by contacting us at privacy@digitalhaute.com.
      </ThemedText>

      <ThemedText style={styles.heading}>7. Children's Privacy</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        The App is not intended for use by anyone under the age of 18. We do not
        knowingly collect personal information from children. If we learn that we
        have collected personal data from a child, we will delete it promptly.
      </ThemedText>

      <ThemedText style={styles.heading}>8. Changes to This Policy</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        We may update this Privacy Policy from time to time. We will notify you
        of any material changes by posting the updated policy in the App and
        updating the effective date. Your continued use of the App after changes
        constitutes acceptance of the updated policy.
      </ThemedText>

      <ThemedText style={styles.heading}>9. Contact Us</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        If you have questions about this Privacy Policy or our data practices,
        contact us at:{"\n\n"}
        privacy@digitalhaute.com
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  date: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
