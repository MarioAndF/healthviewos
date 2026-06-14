import type { HealthViewIconKey } from "@healthviewos/app-model";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlatformIcon } from "./platform-icon";
import { colors, radii, spacing, typography } from "../theme/tokens";

export function ScreenScrollView({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, 20) + spacing.pageBottom,
        paddingHorizontal: spacing.pageX,
        paddingTop: spacing.pageTop,
      }}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      {children}
    </ScrollView>
  );
}

export function PageHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <View
      style={{
        alignItems: "flex-start",
        flexDirection: "row",
        gap: 16,
        justifyContent: "space-between",
        marginBottom: 24,
      }}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <Text selectable style={{ color: colors.text, ...typography.pageTitle }}>
          {title}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
          {description}
        </Text>
      </View>
      {action}
    </View>
  );
}

export function PageSection({
  children,
  onShowMorePress,
  showMore = false,
  title,
  topSpacing = 0,
}: {
  children: ReactNode;
  onShowMorePress?: () => void;
  showMore?: boolean;
  title: string;
  topSpacing?: number;
}) {
  const titleContent = (
    <>
      <Text selectable style={{ color: colors.text, ...typography.sectionTitle }}>
        {title}
      </Text>
      {showMore ? <PlatformIcon color={colors.textSubtle} icon="chevron-right" size={20} /> : null}
    </>
  );

  return (
    <View style={{ marginTop: topSpacing }}>
      {onShowMorePress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onShowMorePress}
          style={({ pressed }) => ({
            alignItems: "center",
            flexDirection: "row",
            gap: 3,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          {titleContent}
        </Pressable>
      ) : (
        <View style={{ alignItems: "center", flexDirection: "row", gap: 3 }}>
          {titleContent}
        </View>
      )}
      <View style={{ marginTop: spacing.sectionContentGap }}>{children}</View>
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.card,
          padding: spacing.cardPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HorizontalRail({
  children,
  edgeBleed = 0,
  gap = 12,
  sideInset = 0,
}: {
  children: ReactNode;
  edgeBleed?: number;
  gap?: number;
  sideInset?: number;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={{
        gap,
        paddingLeft: sideInset,
        paddingRight: sideInset || 18,
      }}
      showsHorizontalScrollIndicator={false}
      style={edgeBleed ? { marginHorizontal: -edgeBleed } : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.pill,
        paddingHorizontal: 9,
        paddingVertical: 5,
      }}
    >
      <Text selectable style={{ color: colors.textMuted, fontSize: 11, fontWeight: "600" }}>
        {children}
      </Text>
    </View>
  );
}

export function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  size = 44,
}: {
  accessibilityLabel: string;
  icon: HealthViewIconKey;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        borderRadius: radii.pill,
        height: size,
        justifyContent: "center",
        width: size,
      })}
    >
      <PlatformIcon color={colors.text} icon={icon} size={21} />
    </Pressable>
  );
}

export function GroupedList({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      {rows.map((child, index) => {
        if (!isValidElement<GroupedListRowProps>(child)) return child;
        return cloneElement(child, { showDivider: index < rows.length - 1 });
      })}
    </View>
  );
}

type GroupedListRowProps = {
  description?: string;
  icon: HealthViewIconKey;
  onPress?: () => void;
  showDivider?: boolean;
  title: string;
  trailing?: ReactNode;
};

export function GroupedListRow({
  description,
  icon,
  onPress,
  showDivider = true,
  title,
  trailing,
}: GroupedListRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      android_ripple={{ color: colors.surfacePressed }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        borderBottomColor: colors.divider,
        borderBottomWidth: showDivider ? 1 : 0,
        flexDirection: "row",
        gap: spacing.rowGap,
        minHeight: 64,
        paddingHorizontal: 14,
        paddingVertical: 10,
      })}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.pill,
          height: 40,
          justifyContent: "center",
          width: 40,
        }}
      >
        <PlatformIcon color={colors.textMuted} icon={icon} size={19} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
        {description ? (
          <Text selectable numberOfLines={2} style={{ color: colors.textSubtle, fontSize: 12.5, lineHeight: 17 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        borderBottomColor: colors.divider,
        borderBottomWidth: 1,
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 11,
      }}
    >
      <Text selectable style={textStyles.label}>
        {label}
      </Text>
      <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 20 }}>
        {value}
      </Text>
    </View>
  );
}

export const textStyles = {
  label: {
    color: colors.textSubtle,
    ...typography.label,
  } satisfies TextStyle,
  value: {
    color: colors.text,
    fontSize: typography.value.fontSize,
    fontVariant: ["tabular-nums"],
    fontWeight: typography.value.fontWeight,
  } satisfies TextStyle,
};
