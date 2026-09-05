import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api/client";
import { Matrix, CantiereSummary } from "@/src/types";
import { Header, EmptyState, LoadingView, AppButton, Card, Chip } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
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
  const [view, setView] = useState<"matrix" | "cantieri">("matrix");
  const [exporting, setExporting] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["matrix", month],
    queryFn: () => api.get<Matrix>(`/admin/matrix?month=${month}`),
  });

  const summaryQ = useQuery({
    queryKey: ["cantieri-summary", month],
    queryFn: () => api.get<{ month: string; cantieri: CantiereSummary[] }>(`/admin/cantieri-summary?month=${month}`),
    enabled: view === "cantieri",
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

      <View style={styles.toggle}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Presenze" selected={view === "matrix"} onPress={() => setView("matrix")} testID="view-matrix" />
          <Chip label="Cantieri" selected={view === "cantieri"} onPress={() => setView("cantieri")} testID="view-cantieri" />
        </ScrollView>
      </View>

      {view === "cantieri" ? (
        <CantieriSummaryView query={summaryQ} />
      ) : (
        <>
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
        </>
      )}
    </View>
  );
}

function CantieriSummaryView({ query }: { query: any }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { data, isLoading, isError, refetch } = query;
  const cantieri: CantiereSummary[] = data?.cantieri ?? [];

  if (isLoading) return <LoadingView label="Caricamento cantieri…" />;
  if (isError) return <EmptyState icon="wifi-off" title="Errore" message="Impossibile caricare il riepilogo." action={<AppButton label="Riprova" onPress={() => refetch()} testID="retry-button" />} />;
  if (cantieri.length === 0) return <EmptyState icon="map-pin" title="Nessun cantiere attivo" message="Non ci sono rapportini per questo mese." />;

  const totalHours = cantieri.reduce((s, c) => s + c.hours, 0);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.grandCard}>
        <Text style={styles.grandValue}>{totalHours}h</Text>
        <Text style={styles.grandLabel}>Ore totali su {cantieri.length} cantieri</Text>
      </View>
      {cantieri.map((c) => (
        <Card key={c.cantiere_id} style={{ marginTop: 12 }} testID={`cantiere-summary-${c.cantiere_id}`}>
          <View style={styles.sumTop}>
            <View style={styles.sumIcon}>
              <Icon name="map-pin" size={20} color={colors.onBrandSecondary} />
            </View>
            <Text style={styles.sumName} numberOfLines={1}>{c.cantiere_name}</Text>
            <View style={styles.sumHoursPill}>
              <Text style={styles.sumHoursText}>{c.hours}h</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Icon name="calendar" size={16} color={colors.brandPrimary} />
              <Text style={styles.statValue}>{c.days}</Text>
              <Text style={styles.statLabel}>giorni</Text>
            </View>
            <View style={styles.stat}>
              <Icon name="users" size={16} color={colors.brandPrimary} />
              <Text style={styles.statValue}>{c.employees}</Text>
              <Text style={styles.statLabel}>dipendenti</Text>
            </View>
            <View style={styles.stat}>
              <Icon name="file-text" size={16} color={colors.brandPrimary} />
              <Text style={styles.statValue}>{c.reports}</Text>
              <Text style={styles.statLabel}>rapportini</Text>
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
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
  toggle: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  chipRow: { gap: 8, paddingHorizontal: 16 },
  grandCard: { backgroundColor: colors.brand, borderRadius: 16, padding: 20, alignItems: "center" },
  grandValue: { fontSize: 34, fontWeight: "900", color: colors.onBrand },
  grandLabel: { fontSize: 14, color: colors.onBrand, opacity: 0.9, marginTop: 2 },
  sumTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  sumIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  sumName: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.onSurface },
  sumHoursPill: { backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  sumHoursText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 14 },
  statRow: { flexDirection: "row", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.divider },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 18, fontWeight: "900", color: colors.onSurface },
  statLabel: { fontSize: 12, color: colors.muted },
}));
