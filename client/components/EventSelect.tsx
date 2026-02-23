import React, { useState, useEffect } from "react";
import { View, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  BrandColors,
  Typography,
} from "@/constants/theme";
import { EventStorage } from "@/lib/storage";

interface EventSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function EventSelect({ value, onChange, label }: EventSelectProps) {
  const { theme } = useTheme();
  const [events, setEvents] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    EventStorage.getAll().then(setEvents);
  }, []);

  const filtered = value.trim()
    ? events.filter((e) => e.toLowerCase().includes(value.toLowerCase()))
    : events;

  const showDropdown = isFocused && filtered.length > 0;

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText style={[styles.label, { color: theme.text }]}>
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isFocused ? BrandColors.gold : "transparent",
          },
        ]}
      >
        <Feather name="calendar" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="e.g., Magic Las Vegas 2026"
          placeholderTextColor={theme.textTertiary}
          value={value}
          onChangeText={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          selectionColor={BrandColors.gold}
        />
        {value.length > 0 ? (
          <Pressable onPress={() => onChange("")}>
            <Feather name="x" size={18} color={theme.textTertiary} />
          </Pressable>
        ) : null}
      </View>
      {showDropdown ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <FlatList
            data={filtered.slice(0, 5)}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.dropdownItem}
                onPress={() => {
                  onChange(item);
                  setIsFocused(false);
                }}
              >
                <Feather name="clock" size={14} color={theme.textSecondary} />
                <ThemedText
                  style={[styles.dropdownText, { color: theme.text }]}
                >
                  {item}
                </ThemedText>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    zIndex: 10,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  dropdownText: {
    fontSize: 15,
  },
});
