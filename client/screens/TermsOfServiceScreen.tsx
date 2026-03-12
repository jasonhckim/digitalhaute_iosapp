import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";

const EFFECTIVE_DATE = "March 10, 2026";

export default function TermsOfServiceScreen() {
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
        These Terms of Service ("Terms") govern your use of the Digital Haute
        mobile application (the "App") operated by Digital Haute ("we", "our",
        or "us"). By downloading, installing, or using the App, you agree to
        these Terms. If you do not agree, do not use the App.
      </ThemedText>

      <ThemedText style={styles.heading}>1. Eligibility</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        You must be at least 18 years old and capable of forming a binding
        contract to use the App. By using the App, you represent that you meet
        these requirements.
      </ThemedText>

      <ThemedText style={styles.heading}>2. Account Registration</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        You must create an account to access certain features. You are
        responsible for maintaining the confidentiality of your login credentials
        and for all activities that occur under your account. You agree to
        provide accurate and complete information and to notify us immediately of
        any unauthorized use of your account.
      </ThemedText>

      <ThemedText style={styles.heading}>3. Subscription Plans & Billing</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        The App offers free and paid subscription plans (Starter, Growth, and
        VIP). Paid subscriptions are billed through the Apple App Store on a
        monthly or yearly basis.{"\n\n"}
        {"\u2022"} Subscriptions automatically renew unless canceled at least 24
        hours before the end of the current billing period.{"\n"}
        {"\u2022"} You can manage or cancel your subscription through your Apple
        ID settings.{"\n"}
        {"\u2022"} Refunds are handled by Apple according to their refund
        policies.{"\n"}
        {"\u2022"} We reserve the right to change pricing with reasonable notice.
        Price changes will not affect your current billing period.
      </ThemedText>

      <ThemedText style={styles.heading}>4. Acceptable Use</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        You agree to use the App only for lawful business purposes related to
        product sourcing, inventory management, and retail operations. You agree
        not to:{"\n\n"}
        {"\u2022"} Use the App for any illegal or unauthorized purpose{"\n"}
        {"\u2022"} Attempt to reverse-engineer, decompile, or disassemble the
        App{"\n"}
        {"\u2022"} Interfere with or disrupt the App's servers or networks{"\n"}
        {"\u2022"} Upload malicious content or attempt to gain unauthorized
        access to other users' data{"\n"}
        {"\u2022"} Resell, sublicense, or redistribute the App or its features{"\n"}
        {"\u2022"} Use automated systems to access the App in a manner that
        exceeds reasonable use
      </ThemedText>

      <ThemedText style={styles.heading}>5. Your Content & Data</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        You retain ownership of all product data, photos, vendor information,
        and other content you enter into the App ("Your Content"). By using the
        App, you grant us a limited license to store, process, and display Your
        Content solely to provide the App's services to you.{"\n\n"}
        You are responsible for ensuring you have the right to use any photos,
        product images, or other materials you upload to the App.
      </ThemedText>

      <ThemedText style={styles.heading}>6. AI-Powered Features</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        The App uses artificial intelligence for features such as label scanning
        and product data extraction. AI-generated results are provided as
        suggestions and may not always be accurate. You are responsible for
        reviewing and verifying any information produced by AI features before
        relying on it for business decisions.
      </ThemedText>

      <ThemedText style={styles.heading}>7. Third-Party Integrations</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        The App may integrate with third-party services such as Shopify. Your
        use of third-party services is subject to their respective terms and
        policies. We are not responsible for the availability, accuracy, or
        practices of any third-party services.
      </ThemedText>

      <ThemedText style={styles.heading}>8. Intellectual Property</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        The App, including its design, code, features, and branding, is the
        property of Digital Haute and is protected by copyright, trademark, and
        other intellectual property laws. These Terms do not grant you any right
        to use our trademarks, logos, or branding.
      </ThemedText>

      <ThemedText style={styles.heading}>9. Disclaimer of Warranties</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
        KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE
        UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DISCLAIM ALL WARRANTIES,
        INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </ThemedText>

      <ThemedText style={styles.heading}>10. Limitation of Liability</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIGITAL HAUTE SHALL NOT BE
        LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES
        ARISING OUT OF OR RELATED TO YOUR USE OF THE APP. OUR TOTAL LIABILITY
        SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS
        PRECEDING THE CLAIM.
      </ThemedText>

      <ThemedText style={styles.heading}>11. Termination</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        We may suspend or terminate your access to the App at any time for
        violation of these Terms or for any other reason at our discretion. You
        may delete your account at any time through the App's Data & Privacy
        settings. Upon termination, your right to use the App ceases
        immediately.
      </ThemedText>

      <ThemedText style={styles.heading}>12. Changes to These Terms</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        We may update these Terms from time to time. We will notify you of
        material changes by posting the updated Terms in the App and updating
        the effective date. Your continued use of the App after changes
        constitutes acceptance of the updated Terms.
      </ThemedText>

      <ThemedText style={styles.heading}>13. Governing Law</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        These Terms are governed by and construed in accordance with the laws of
        the State of California, without regard to its conflict of law
        provisions. Any disputes arising from these Terms shall be resolved in
        the courts located in Los Angeles County, California.
      </ThemedText>

      <ThemedText style={styles.heading}>14. Contact Us</ThemedText>
      <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
        If you have questions about these Terms, contact us at:{"\n\n"}
        support@digitalhaute.com
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
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
