import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { Cantiere } from "@/src/types";
import { AppButton, AppInput, Header, Badge } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";
import { daysInMonth, weekdayShort, isWeekend, monthLabel } from "@/src/utils/date";

export default function AdminReportForm() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string; user_name: string; date: string; cantiere_id: string; hours: string;
    drove_vehicle: string; description: string; approved: string; admin_edited: string; month: string;
  }>();

  const monthKey = params.date.slice(0, 7);
  const dim = daysInMonth(monthKey);

  const [date, setDate] = useState(params.date);
  const [cantiereId, setCantiereId] = useState(params.cantiere_id);
  const [hours, setHours] = useState(params.hours);
  const [drove, setDrove] = useState(params.drove_vehicle === "1");
  const [description, setDescription] = useState(params.description ?? "");
  const [approved, setApproved] = useState(params.approved === "1");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: cantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => api.get<Cantiere[]>("/cantieri"),
  });
  const selectedCantiere = useMemo(() => cantieri?.find((c) => c.id === cantiereId), [cantieri, cantiereId]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["matrix"] });
  };

  const saveMut = useMutation({
    mutationFn: (payload: any) => api.patch(`/admin/reports/${params.id}`, payload),
    onSuccess: () => { toast("Rapportino aggiornato", "success"); invalidate(); router.back(); },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
  });

  const approveMut = useMutation({
    mutationFn: (val: boolean) => api.patch(`/admin/reports/${params.id}/approve`, { approved: val }),
    onSuccess: (_d, val) => { setApproved(val); toast(val ? "Rapportino approvato" : "Approvazione rimossa", "success"); invalidate(); },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
  });

  const onSave = () => {
    const h = parseFloat(hours.replace(",", "."));
    if (!cantiereId) return toast("Seleziona un cantiere", "error");
    if (isNaN(h) || h <= 0 || h > 24) return toast("Ore non valide (0-24)", "error");
    saveMut.mutate({ date, cantiere_id: cantiereId, hours: h, drove_vehicle: drove, description: description.trim() });
  };

  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const selectedDay = parseInt(date.slice(8, 10), 10);

  return (
    <View style={styles.root}>
      <Header title={params.user_name} subtitle={monthLabel(monthKey)} onBack={() => router.back()} />

      <KeyboardAwareScrollView contentContainerStyle={styles.content} bottomOffset={90} keyboardShouldPersistTaps="handled">
        <View style={styles.approveCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.approveTitle}>Stato approvazione</Text>
            <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
              {approved ? <Badge label="Approvato" tone="success" icon="check" /> : <Badge label="In attesa" tone="warning" icon="clock" />}
            </View>
          </View>
          <AppButton
            label={approved ? "Rimuovi" : "Approva"}
            variant={approved ? "outline" : "secondary"}
            onPress={() => approveMut.mutate(!approved)}
            loading={approveMut.isPending}
            testID="approve-toggle-button"
            style={{ minWidth: 130 }}
          />
        </View>

        {params.admin_edited === "1" ? (
          <Text style={styles.note}>Questo rapportino è già stato modificato dall’amministratore. Il dipendente non vede queste modifiche.</Text>
        ) : (
          <Text style={styles.note}>Le modifiche dell’amministratore non sono visibili al dipendente.</Text>
        )}

        <Text style={styles.label}>Data</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {days.map((d) => {
            const iso = `${monthKey}-${d < 10 ? "0" : ""}${d}`;
            const active = d === selectedDay;
            const we = isWeekend(monthKey, d);
            return (
              <Pressable key={d} onPress={() => setDate(iso)} style={[styles.dayChip, active && styles.dayChipActive]} testID={`day-chip-${d}`}>
                <Text style={[styles.dayWd, active && styles.dayTextActive, we && !active && { color: colors.error }]}>{weekdayShort(monthKey, d)}</Text>
                <Text style={[styles.dayNum, active && styles.dayTextActive]}>{d}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Cantiere</Text>
        <Pressable style={styles.select} onPress={() => setPickerOpen(true)} testID="cantiere-select">
          <Icon name="map-pin" size={18} color={colors.brandSecondary} />
          <Text style={[styles.selectText, !selectedCantiere && { color: colors.muted }]} numberOfLines={1}>
            {selectedCantiere ? selectedCantiere.name : "Seleziona cantiere"}
          </Text>
          <Icon name="chevron-down" size={18} color={colors.muted} />
        </Pressable>

        <View style={{ marginTop: 18 }}>
          <AppInput label="Ore lavorate" icon="clock" placeholder="es. 8" keyboardType="decimal-pad" value={hours} onChangeText={setHours} testID="hours-input" />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Icon name="truck" size={20} color={colors.onSurfaceSecondary} />
            <Text style={styles.switchLabel}>Guidato mezzo</Text>
          </View>
          <Switch value={drove} onValueChange={setDrove} trackColor={{ true: colors.brandSecondary, false: colors.borderStrong }} thumbColor={colors.surfaceSecondary} testID="drove-switch" />
        </View>

        <View style={{ marginTop: 18 }}>
          <AppInput label="Descrizione lavorazioni" placeholder="Descrizione…" value={description} onChangeText={setDescription} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: "top", paddingTop: 12 } as any} testID="description-input" />
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <AppButton label="Salva modifiche" onPress={onSave} loading={saveMut.isPending} testID="save-report-button" />
        </View>
      </KeyboardStickyView>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.pickerSheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Seleziona cantiere</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(cantieri ?? []).map((c) => (
                <Pressable key={c.id} style={styles.pickerRow} onPress={() => { setCantiereId(c.id); setPickerOpen(false); }} testID={`cantiere-option-${c.id}`}>
                  <Text style={styles.pickerName}>{c.name}</Text>
                  {c.id === cantiereId ? <Icon name="check" size={20} color={colors.brandPrimary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  approveCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  approveTitle: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  note: { fontSize: 13, color: colors.muted, marginTop: 12, lineHeight: 19, fontStyle: "italic" },
  label: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary, marginBottom: 8, marginTop: 18 },
  dayRow: { gap: 8, paddingBottom: 4 },
  dayChip: { flexShrink: 0, width: 52, height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, gap: 2 },
  dayChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dayWd: { fontSize: 11, fontWeight: "600", color: colors.muted },
  dayNum: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  dayTextActive: { color: colors.onBrandPrimary },
  select: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 14, minHeight: 52, borderWidth: 1, borderColor: colors.border },
  selectText: { flex: 1, fontSize: 16, color: colors.onSurface, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  switchLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { fontSize: 16, fontWeight: "600", color: colors.onSurfaceSecondary },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  pickerHandle: { width: 40, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: 14 },
  pickerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginBottom: 12 },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  pickerName: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
}));
