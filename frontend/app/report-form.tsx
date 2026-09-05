import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { Cantiere, EmployeeReport } from "@/src/types";
import { AppButton, AppInput, Header } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";
import { currentMonthKey, daysInMonth, weekdayShort, todayISO, isWeekend } from "@/src/utils/date";

export default function ReportForm() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string; date?: string; cantiere_id?: string; hours?: string; drove_vehicle?: string; description?: string;
  }>();
  const isEdit = !!params.id;

  const monthKey = currentMonthKey();
  const dim = daysInMonth(monthKey);
  const initialDate = params.date && params.date.startsWith(monthKey) ? params.date : todayISO();

  const [date, setDate] = useState(initialDate);
  const [cantiereId, setCantiereId] = useState(params.cantiere_id ?? "");
  const [hours, setHours] = useState(params.hours ?? "");
  const [drove, setDrove] = useState(params.drove_vehicle === "1");
  const [description, setDescription] = useState(params.description ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: cantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => api.get<Cantiere[]>("/cantieri"),
  });

  const selectedCantiere = useMemo(
    () => cantieri?.find((c) => c.id === cantiereId),
    [cantieri, cantiereId],
  );

  const saveMut = useMutation({
    mutationFn: (payload: any) =>
      isEdit ? api.patch(`/reports/${params.id}`, payload) : api.post<EmployeeReport>("/reports", payload),
    onSuccess: () => {
      toast(isEdit ? "Rapportino aggiornato" : "Rapportino salvato", "success");
      qc.invalidateQueries({ queryKey: ["my-reports"] });
      router.back();
    },
    onError: (e: any) => toast(e?.message ?? "Errore nel salvataggio", "error"),
  });

  const onSave = () => {
    const h = parseFloat(hours.replace(",", "."));
    if (!cantiereId) return toast("Seleziona un cantiere", "error");
    if (isNaN(h) || h <= 0 || h > 24) return toast("Inserisci ore valide (0-24)", "error");
    saveMut.mutate({
      date,
      cantiere_id: cantiereId,
      hours: h,
      drove_vehicle: drove,
      description: description.trim(),
    });
  };

  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const selectedDay = parseInt(date.slice(8, 10), 10);

  return (
    <View style={styles.root}>
      <Header title={isEdit ? "Modifica rapportino" : "Nuovo rapportino"} onBack={() => router.back()} />

      <KeyboardAwareScrollView contentContainerStyle={styles.content} bottomOffset={90} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Data</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayRow}
        >
          {days.map((d) => {
            const iso = `${monthKey}-${d < 10 ? "0" : ""}${d}`;
            const active = d === selectedDay;
            const we = isWeekend(monthKey, d);
            return (
              <Pressable
                key={d}
                onPress={() => setDate(iso)}
                style={[styles.dayChip, active && styles.dayChipActive]}
                testID={`day-chip-${d}`}
              >
                <Text style={[styles.dayWd, active && styles.dayTextActive, we && !active && { color: colors.error }]}>
                  {weekdayShort(monthKey, d)}
                </Text>
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
          <AppInput
            label="Ore lavorate"
            icon="clock"
            placeholder="es. 8"
            keyboardType="decimal-pad"
            value={hours}
            onChangeText={setHours}
            testID="hours-input"
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Icon name="truck" size={20} color={colors.onSurfaceSecondary} />
            <Text style={styles.switchLabel}>Guidato mezzo</Text>
          </View>
          <Switch
            value={drove}
            onValueChange={setDrove}
            trackColor={{ true: colors.brandSecondary, false: colors.borderStrong }}
            thumbColor={colors.surfaceSecondary}
            testID="drove-switch"
          />
        </View>

        <View style={{ marginTop: 18 }}>
          <AppInput
            label="Descrizione lavorazioni"
            placeholder="Descrivi le attività svolte…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: "top", paddingTop: 12 } as any}
            testID="description-input"
          />
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <AppButton
            label={isEdit ? "Aggiorna rapportino" : "Salva rapportino"}
            onPress={onSave}
            loading={saveMut.isPending}
            testID="save-report-button"
          />
        </View>
      </KeyboardStickyView>

      <CantierePicker
        visible={pickerOpen}
        cantieri={cantieri ?? []}
        selected={cantiereId}
        onSelect={(id) => { setCantiereId(id); setPickerOpen(false); }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function CantierePicker({ visible, cantieri, selected, onSelect, onClose }: {
  visible: boolean;
  cantieri: Cantiere[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={[styles.pickerSheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Seleziona cantiere</Text>
          {cantieri.length === 0 ? (
            <Text style={styles.pickerEmpty}>Nessun cantiere disponibile. Chiedi all’amministratore di aggiungerne.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {cantieri.map((c) => {
                const active = c.id === selected;
                return (
                  <Pressable key={c.id} style={styles.pickerRow} onPress={() => onSelect(c.id)} testID={`cantiere-option-${c.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerName}>{c.name}</Text>
                      {c.address ? <Text style={styles.pickerAddr}>{c.address}</Text> : null}
                    </View>
                    {active ? <Icon name="check" size={20} color={colors.brandPrimary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary, marginBottom: 8, marginTop: 4 },
  dayRow: { gap: 8, paddingBottom: 4 },
  dayChip: {
    flexShrink: 0, width: 52, height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  dayChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dayWd: { fontSize: 11, fontWeight: "600", color: colors.muted },
  dayNum: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  dayTextActive: { color: colors.onBrandPrimary },
  select: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 14, minHeight: 52,
    borderWidth: 1, borderColor: colors.border,
  },
  selectText: { flex: 1, fontSize: 16, color: colors.onSurface, fontWeight: "600" },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 18, backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  switchLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { fontSize: 16, fontWeight: "600", color: colors.onSurfaceSecondary },
  footer: {
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  pickerHandle: { width: 40, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: 14 },
  pickerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginBottom: 12 },
  pickerEmpty: { fontSize: 14, color: colors.muted, lineHeight: 20, paddingVertical: 16 },
  pickerRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  pickerName: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  pickerAddr: { fontSize: 13, color: colors.muted, marginTop: 2 },
}));
