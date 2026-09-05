import { Text, View, Pressable } from "react-native";
import { Icon } from "@/src/components/icon";
import { makeStyles, useTheme } from "@/src/theme";
import { monthLabel, shiftMonth, currentMonthKey } from "@/src/utils/date";

export function MonthSelector({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isCurrent = month === currentMonthKey();
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.arrow} onPress={() => onChange(shiftMonth(month, -1))} hitSlop={10} testID="month-prev">
        <Icon name="chevron-left" size={22} color={colors.onSurface} />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.label}>{monthLabel(month)}</Text>
        {isCurrent ? <Text style={styles.badge}>Mese in corso</Text> : null}
      </View>
      <Pressable style={styles.arrow} onPress={() => onChange(shiftMonth(month, 1))} hitSlop={10} testID="month-next">
        <Icon name="chevron-right" size={22} color={colors.onSurface} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  arrow: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  center: { alignItems: "center" },
  label: { fontSize: 17, fontWeight: "800", color: colors.onSurface, textTransform: "capitalize" },
  badge: { fontSize: 11, fontWeight: "700", color: colors.brandSecondary, marginTop: 2 },
}));
