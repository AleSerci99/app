import { useState } from "react";
import { FlatList, RefreshControl, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/src/api/client";
import { EmployeeReport } from "@/src/types";
import { Header, Card, Badge, EmptyState, LoadingView, Fab, AppButton } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ConfirmDialog } from "@/src/components/confirm";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/context/auth";
import { makeStyles, useTheme } from "@/src/theme";
import { currentMonthKey, formatDateIT, monthLabel } from "@/src/utils/date";

export default function EmployeeHome() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<EmployeeReport | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => api.get<EmployeeReport[]>("/reports/mine"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/reports/${id}`),
    onSuccess: () => {
      toast("Rapportino eliminato", "success");
      qc.invalidateQueries({ queryKey: ["my-reports"] });
    },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
    onSettled: () => setToDelete(null),
  });

  const reports = data ?? [];
  const totalHours = reports.reduce((s, r) => s + r.hours, 0);

  const openNew = () => router.push("/report-form");
  const openEdit = (r: EmployeeReport) =>
    router.push({
      pathname: "/report-form",
      params: {
        id: r.id,
        date: r.date,
        cantiere_id: r.cantiere_id,
        hours: String(r.hours),
        drove_vehicle: r.drove_vehicle ? "1" : "0",
        description: r.description,
      },
    });

  const renderItem = ({ item }: { item: EmployeeReport }) => (
    <Card style={{ marginBottom: 12 }} testID={`report-card-${item.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{formatDateIT(item.date)}</Text>
        </View>
        <View style={styles.hoursPill}>
          <Icon name="clock" size={14} color={colors.onBrandPrimary} />
          <Text style={styles.hoursText}>{item.hours}h</Text>
        </View>
      </View>

      <View style={styles.cantiereRow}>
        <Icon name="map-pin" size={16} color={colors.brandSecondary} />
        <Text style={styles.cantiereName} numberOfLines={1}>{item.cantiere_name}</Text>
      </View>

      {item.description ? (
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.badgeRow}>
        {item.drove_vehicle ? <Badge label="Mezzo guidato" tone="accent" icon="truck" /> : null}
        {item.approved ? (
          <Badge label="Approvato" tone="success" icon="check" />
        ) : (
          <Badge label="In attesa" tone="warning" icon="clock" />
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.action} onPress={() => openEdit(item)} testID={`edit-report-${item.id}`}>
          <Icon name="edit-2" size={16} color={colors.brandPrimary} />
          <Text style={[styles.actionLabel, { color: colors.brandPrimary }]}>Modifica</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => setToDelete(item)} testID={`delete-report-${item.id}`}>
          <Icon name="trash-2" size={16} color={colors.error} />
          <Text style={[styles.actionLabel, { color: colors.error }]}>Elimina</Text>
        </Pressable>
      </View>
    </Card>
  );

  return (
    <View style={styles.root}>
      <Header title={`Ciao, ${user?.name?.split(" ")[0] ?? ""}`} subtitle={monthLabel(currentMonthKey())} />

      {isLoading ? (
        <LoadingView label="Caricamento rapportini…" />
      ) : isError ? (
        <EmptyState
          icon="wifi-off"
          title="Errore di caricamento"
          message="Impossibile caricare i rapportini."
          action={<AppButton label="Riprova" onPress={() => refetch()} testID="retry-button" />}
        />
      ) : reports.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="clipboard"
            title="Nessun rapportino questo mese"
            message="Aggiungi il tuo primo rapportino toccando il pulsante in basso."
          />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Card style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{reports.length}</Text>
                <Text style={styles.summaryLabel}>Rapportini</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalHours}h</Text>
                <Text style={styles.summaryLabel}>Ore totali</Text>
              </View>
            </Card>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />
          }
        />
      )}

      <Fab icon="plus" label="Nuovo" onPress={openNew} testID="new-report-fab" />

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminare il rapportino?"
        message="Questa azione non può essere annullata."
        confirmLabel="Elimina"
        danger
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 16, paddingBottom: 120 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 26, fontWeight: "900", color: colors.onBrand },
  summaryLabel: { fontSize: 13, color: colors.onBrand, opacity: 0.85, marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.onBrand, opacity: 0.25 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateBox: {},
  dateText: { fontSize: 17, fontWeight: "800", color: colors.onSurface, textTransform: "capitalize" },
  hoursPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandPrimary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  hoursText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 13 },
  cantiereRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  cantiereName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurfaceSecondary },
  desc: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  actionRow: {
    flexDirection: "row", gap: 8, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 },
  actionLabel: { fontSize: 14, fontWeight: "700" },
}));
