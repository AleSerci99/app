import { View } from "react-native";
import { LoadingView } from "@/src/components/ui";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <LoadingView label="Rapportini" />
    </View>
  );
}
