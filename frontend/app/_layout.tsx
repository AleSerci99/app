import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/context/auth";
import { ThemeModeProvider, useThemeMode } from "@/src/context/theme-mode";
import { ToastProvider } from "@/src/components/toast";
import { LoadingView } from "@/src/components/ui";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;
    const group = segments[0];
    const inAuth = group === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace(user.role === "admin" ? "/(admin)" : "/(employee)");
    } else if (user) {
      if (user.role === "admin" && group === "(employee)") router.replace("/(admin)");
      if (user.role !== "admin" && group === "(admin)") router.replace("/(employee)");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <LoadingView label="Caricamento…" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="report-form" options={{ presentation: "modal" }} />
      <Stack.Screen name="admin-report" options={{ presentation: "modal" }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { scheme } = useThemeMode();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeModeProvider>
              <AuthProvider>
                <ToastProvider>
                  <ThemedStatusBar />
                  <RootNavigator />
                </ToastProvider>
              </AuthProvider>
            </ThemeModeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
