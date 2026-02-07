import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, BrandColors, Shadows } from "@/constants/theme";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

export function Select({
  label,
  placeholder = "Select...",
  options,
  value,
  onChange,
  error,
}: SelectProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText style={[styles.label, { color: BrandColors.gold }]}>
          {label}
        </ThemedText>
      ) : null}

      <Pressable
        style={[
          styles.select,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: error ? BrandColors.error : theme.border,
          },
        ]}
        onPress={() => setIsOpen(true)}
      >
        <ThemedText
          style={[
            styles.selectText,
            { color: selectedOption ? theme.text : theme.textTertiary },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={20} color={theme.textTertiary} />
      </Pressable>

      {error ? (
        <ThemedText style={[styles.error, { color: BrandColors.error }]}>
          {error}
        </ThemedText>
      ) : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.backgroundRoot,
                marginBottom: insets.bottom + Spacing.lg,
              },
              Shadows.card,
            ]}
          >
            <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
              <ThemedText style={styles.dropdownTitle}>
                {label || "Select Option"}
              </ThemedText>
              <Pressable onPress={() => setIsOpen(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.option,
                    { borderBottomColor: theme.border },
                    item.value === value && {
                      backgroundColor: `${BrandColors.gold}10`,
                    },
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      item.value === value && {
                        color: BrandColors.gold,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                  {item.value === value ? (
                    <Feather name="check" size={20} color={BrandColors.gold} />
                  ) : null}
                </Pressable>
              )}
              style={styles.optionsList}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  select: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: 16,
    flex: 1,
  },
  error: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dropdown: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    maxHeight: 400,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
  },
});
