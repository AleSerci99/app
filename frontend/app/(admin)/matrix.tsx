import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api/client";
import { Matrix } from "@/src/types";
import { Header, EmptyState, LoadingView, AppButton } from "@/src/components/ui";
import { MonthSelector } from "@/src/components/month-selector";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";
import { currentMonthKey, weekdayShort, isWeekend } from "@/src/utils/date";
import { saveAndShare } from "@/src/utils/export";

const NAME_W = 130;
const CELL_W = 42;
const TOT_W = 56;
const ROW_H = 48;

export default function AdminMatrix() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthKey());
  const [exporting, setExporting] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["matrix", month],
    queryFn: () => api.get<Matrix>(`/admin/matrix?month=${month}`),
  });

  const doExport = async (format: "pdf" | "excel") => {
    setExporting(format);
    try {
      const res = await api.get<{ filename: string; mime: string; base64: string }>(
        `/admin/export?month=${month}&format=${format}`,
      );
      await saveAndShare(res.filename, res.mime, res.base64);
      toast("Report esportato", "success");
    } catch (e: any) {
      toast(e?.message ?? "Errore esportazione", "error");
    } finally {
      setExporting(null);
    }
  };

  const employees = data?.employees ?? [];
  const days = data?.days ?? [];
  const grandTotal = employees.reduce((s, e) => s + e.total, 0);

  return (
    <View style={styles.root}>
      <Header title="Report ore" subtitle="Dipendenti × giorni" />
      <MonthSelector month={month} onChange={setMonth} />

      <View style={styles.exportBar}>
        <AppButton label="PDF" icon="file-text" variant="outline" onPress={() => doExport("pdf")} loading={exporting === "pdf"} testID="export-pdf-button" style={{ flex: 1 }} />
        <AppButton label="Excel" icon="grid" variant="secondary" onPress={() => doExport("excel")} loading={exporting === "excel"} testID="export-excel-button" style={{ flex: 1 }} />
      </View>

      {isLoading ? (
        <LoadingView label="Caricamento report…" />
      ) : isError ? (
        <EmptyState icon="wifi-off" title="Errore" message="Impossibile caricare il report." action={<AppButton label="Riprova" onPress={() => refetch()} testID="retry-button" />} />
      ) : employees.length === 0 ? (
        <EmptyState icon="bar-chart-2" title="Nessun dato" message="Non ci sono rapportini per questo mese." />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>{employees.length} dipendenti · {grandTotal}h totali</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            {/* Frozen name column */}
            <View>
              <View style={[styles.headCell, styles.nameHead, { width: NAME_W }]}>
                <Text style={styles.headText}>Dipendente</Text>
              </View>
              {employees.map((e, i) => (
                <View key={e.user_id} style={[styles.nameCell, { width: NAME_W, height: ROW_H }, i % 2 === 1 && styles.rowAlt]}>
                  <Text style={styles.nameText} numberOfLines={2}>{e.name}</Text>
                </View>
              ))}
            </View>

            {/* Scrollable day columns */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={{ flexDirection: "row" }}>
                  {days.map((d) => (
                    <View key={d} style={[styles.headCell, { width: CELL_W }]}>
                      <Text style={[styles.dayWd, isWeekend(month, d) && { color: colors.error }]}>{weekdayShort(month, d).slice(0, 1)}</Text>
                      <Text style={styles.headText}>{d}</Text>
                    </View>
                  ))}
                  <View style={[styles.headCell, styles.totHead, { width: TOT_W }]}>
                    <Text style={styles.headText}>Tot</Text>
                  </View>
                </View>
                {employees.map((e, i) => (
                  <View key={e.user_id} style={{ flexDirection: "row" }}>
                    {days.map((d) => {
                      const v = e.daily[String(d)];
                      return (
                        <View key={d} style={[styles.cell, { width: CELL_W, height: ROW_H }, i % 2 === 1 && styles.rowAlt, isWeekend(month, d) && styles.weekendCell]}>
                          <Text style={[styles.cellText, !v && styles.cellEmpty]}>{v ? v : "·"}</Text>
                        </View>
                      );
                    })}
                    <View style={[styles.cell, styles.totCell, { width: TOT_W, height: ROW_H }, i % 2 === 1 && styles.rowAlt]}>
                      <Text style={styles.totText}>{e.total}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  exportBar: { flexDirection: "row", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider },
  summaryBar: { paddingHorizontal: 16, paddingVertical: 10 },
  summaryText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  headCell: {
    height: 48, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.brand, borderRightWidth: 0.5, borderColor: colors.borderStrong,
  },
  nameHead: { alignItems: "flex-start", paddingHorizontal: 12 },
  totHead: { backgroundColor: colors.brandSecondary },
  headText: { color: colors.onBrand, fontWeight: "800", fontSize: 12 },
  dayWd: { color: colors.onBrand, fontSize: 9, opacity: 0.8, fontWeight: "600" },
  nameCell: {
    justifyContent: "center", paddingHorizontal: 12,
    backgroundColor: colors.surfaceSecondary, borderRightWidth: 1, borderColor: colors.border,
    borderBottomWidth: 0.5,
  },
  nameText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  cell: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: colors.divider,
  },
  weekendCell: { backgroundColor: colors.surfaceTertiary },
  rowAlt: { backgroundColor: colors.surface },
  cellText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  cellEmpty: { color: colors.muted, fontWeight: "400" },
  totCell: { backgroundColor: colors.surfaceTertiary },
  totText: { fontSize: 13, fontWeight: "900", color: colors.brandPrimary },
}));
