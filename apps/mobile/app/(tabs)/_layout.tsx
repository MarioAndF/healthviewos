import { mainDestinations, type MainDestinationId } from "@healthviewos/app-model";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import {
  ClipboardList,
  CreditCard,
  Heart,
  Hospital,
  Settings,
} from "lucide-react-native";
import { ChatSheet } from "../../src/features/chat-sheet";
import { colors } from "../../src/theme/tokens";

const tabIconByDestination: Record<MainDestinationId, typeof Heart> = {
  billing: CreditCard,
  health: Heart,
  records: ClipboardList,
  services: Hospital,
  settings: Settings,
};

export default function TabsLayout() {
  if (process.env.EXPO_OS === "ios") {
    return (
      <>
        <NativeTabs
          iconColor={{ default: colors.textSubtle, selected: colors.text }}
          labelStyle={{
            color: colors.text,
            fontSize: 11,
            fontWeight: "600",
          }}
          tintColor={colors.text}
        >
          {mainDestinations.map((tab) => (
            <NativeTabs.Trigger key={tab.id} name={tab.id}>
              {renderNativeIcon(tab.iosSymbol)}
              <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
          ))}
        </NativeTabs>
        <ChatSheet />
      </>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        }}
      >
        {mainDestinations.map((tab) => (
          <Tabs.Screen
            key={tab.id}
            name={tab.id}
            options={{
              title: tab.label,
              tabBarIcon: ({ color, size }) => {
                const Icon = tabIconByDestination[tab.id];
                return <Icon color={color} size={size} strokeWidth={2.2} />;
              },
            }}
          />
        ))}
      </Tabs>
      <ChatSheet />
    </>
  );
}

function renderNativeIcon(iosSymbol: { default: string; selected: string }) {
  return <NativeTabs.Trigger.Icon sf={iosSymbol as never} />;
}
