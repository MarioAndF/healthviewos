import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlatformIcon } from "../components/platform-icon";
import { useWorkspace } from "../context/workspace-context";
import { colors, radii } from "../theme/tokens";

type ChatMessage = {
  id: string;
  sender: "assistant" | "user";
  text: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "assistant-1",
    sender: "assistant",
    text: "Ask about HealthView OS workspace context.",
  },
];

const sheetClosedOffset = 320;
const mobileAssistantUnavailableText =
  "Assistant execution is available in the web and desktop apps. This mobile chat keeps the workspace UI in place for now.";

export function ChatSheet() {
  const insets = useSafeAreaInsets();
  const { assistantOpen: open, setAssistantOpen } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [sheetTranslateY] = useState(() => new Animated.Value(sheetClosedOffset));

  useEffect(() => {
    if (!open) return;

    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(sheetClosedOffset);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: 180,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, open, sheetTranslateY]);

  const closeChat = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: 140,
        easing: Easing.in(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        duration: 200,
        easing: Easing.in(Easing.cubic),
        toValue: sheetClosedOffset,
        useNativeDriver: true,
      }),
    ]).start(() => setAssistantOpen(false));
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;

    setMessages((items) => [
      ...items,
      { id: `user-${Date.now()}`, sender: "user", text },
      {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: mobileAssistantUnavailableText,
      },
    ]);
    setDraft("");
    await Haptics.selectionAsync();
  };

  return (
    <>
      <FloatingChatButton bottom={Math.max(insets.bottom, 8) + 58} onPress={() => setAssistantOpen(true)} />

      <Modal animationType="none" onRequestClose={closeChat} presentationStyle="overFullScreen" transparent visible={open}>
        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              absoluteFillStyle,
              {
                backgroundColor: "rgba(0,0,0,0.22)",
                opacity: backdropOpacity,
              },
            ]}
          />
          <Pressable accessibilityRole="button" onPress={closeChat} style={absoluteFillStyle} />
          <Animated.View
            style={{
              alignSelf: "stretch",
              maxHeight: "78%",
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                gap: 18,
                paddingBottom: Math.max(insets.bottom, 16),
                paddingHorizontal: 18,
                paddingTop: 12,
              }}
            >
              <View
                style={{
                  alignSelf: "center",
                  backgroundColor: "rgba(23,23,23,0.18)",
                  borderRadius: radii.pill,
                  height: 5,
                  width: 42,
                }}
              />
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text selectable style={{ color: colors.text, fontSize: 24, fontWeight: "600" }}>
                    HealthView AI
                  </Text>
                  <Text selectable style={{ color: colors.textMuted, fontSize: 13 }}>
                    Local workspace chat
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close chat"
                  accessibilityRole="button"
                  onPress={closeChat}
                  style={{
                    alignItems: "center",
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radii.pill,
                    height: 34,
                    justifyContent: "center",
                    width: 34,
                  }}
                >
                  <PlatformIcon color={colors.textMuted} icon="close" />
                </Pressable>
              </View>

              <View style={{ gap: 10 }}>
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={{
                      alignSelf: message.sender === "user" ? "flex-end" : "flex-start",
                      backgroundColor: message.sender === "user" ? colors.text : colors.surfaceMuted,
                      borderRadius: 22,
                      maxWidth: "82%",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        color: message.sender === "user" ? colors.inverse : colors.text,
                        fontSize: 15,
                        lineHeight: 21,
                      }}
                    >
                      {message.text}
                    </Text>
                  </View>
                ))}
              </View>

              <View
                style={{
                  alignItems: "center",
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: 24,
                  flexDirection: "row",
                  gap: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <TextInput
                  onChangeText={setDraft}
                  onSubmitEditing={sendMessage}
                  placeholder="Message HealthView"
                  placeholderTextColor={colors.textSubtle}
                  returnKeyType="send"
                  style={{ color: colors.text, flex: 1, fontSize: 15, minHeight: 34 }}
                  value={draft}
                />
                <Pressable
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                  disabled={!draft.trim()}
                  onPress={sendMessage}
                  style={{
                    alignItems: "center",
                    backgroundColor: draft.trim() ? colors.text : colors.surface,
                    borderRadius: radii.pill,
                    height: 34,
                    justifyContent: "center",
                    width: 34,
                  }}
                >
                  <PlatformIcon color={draft.trim() ? colors.inverse : colors.textSubtle} icon="message" size={18} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const absoluteFillStyle = {
  bottom: 0,
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
} as const;

function FloatingChatButton({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Open chat"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        borderColor: colors.border,
        borderRadius: radii.pill,
        borderWidth: 1,
        bottom,
        height: 56,
        justifyContent: "center",
        position: "absolute",
        right: 18,
        width: 56,
      })}
    >
      <PlatformIcon color={colors.text} icon="message" size={24} strokeWidth={2.1} />
    </Pressable>
  );
}
