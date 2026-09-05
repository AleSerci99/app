import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api/client";
import { AdminReport, Cantiere } from "@/src/types";
import { Header, Card, Badge, EmptyState, LoadingView, AppButton, Chip } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { MonthSelector } from "@/src/components/month-selector";
import { makeStyles, useTheme } from "@/src/theme";
import { currentMonthKey, formatDateIT } from "@/src/utils/date";

type StatusFilter = "all" | "pending" | "approved";

export default function AdminReports() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  const [month, setMonth] = useState(currentMonthKey());
  const [cantiereId, setCantiereId] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data: cantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => api.get<Cantiere[]>("/cantieri"),
  });

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admin-reports", month, cantiereId],
    queryFn: () => {
      const q = new URLSearchParams({ month });
      if (cantiereId) q.set("cantiere_id", cantiereId);
      return api.get<AdminReport[]>(`/admin/reports?${q.toString()}`);
    },
  });

  const reports = (data ?? []).filter((r) =>
    status === "all" ? true : status === "approved" ? r.approved : !r.approved,
  );
  const pendingCount = (data ?? []).filter((r) => !r.approved).length;

  const openReport = (r: AdminReport) =>
    router.push({
      pathname: "/admin-report",
      params: {
        id: r.id,
        user_name: r.user_name,
        date: r.date,
        cantiere_id: r.cantiere_id,
        hours: String(r.hours),
        drove_vehicle: r.drove_vehicle ? "1" : "0",
        description: r.description,
        approved: r.approved ? "1" : "0",
        admin_edited: r.admin_edited ? "1" : "0",
        month,
      },
    });

  const renderItem = ({ item }: { item: AdminReport }) => (
    <Card style={{ marginBottom: 12 }} onPress={() => openReport(item)} testID={`admin-report-${item.id}`}>
      <View style={styles.cardTop}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.user_name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName} numberOfLines={1}>{item.user_name}</Text>
            <Text style={styles.dateText}>{formatDateIT(item.date)}</Text>
          </View>
        </View>
        <View style={styles.hoursPill}>
          <Text style={styles.hoursText}>{item.hours}h</Text>
        </View>
      </View>

      <View style={styles.cantiereRow}>
        <Icon name="map-pin" size={15} color={colors.brandSecondary} />
        <Text style={styles.cantiere} numberOfLines={1}>{item.cantiere_name}</Text>
      </View>

      <View style={styles.badgeRow}>
        {item.drove_vehicle ? <Badge label="Mezzo" tone="accent" icon="truck" /> : null}
        {item.admin_edited ? <Badge label="Modificato" tone="info" icon="edit-2" /> : null}
        {item.approved ? <Badge label="Approvato" tone="success" icon="check" /> : <Badge label="In attesa" tone="warning" icon="clock" />}
      </View>
    </Card>
  );

  return (
    <View style={styles.root}>
      <Header title="Tutti i rapportini" subtitle={pendingCount > 0 ? `${pendingCount} in attesa di approvazione` : "Tutto approvato"} />
      <MonthSelector month={month} onChange={setMonth} />

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Tutti" selected={status === "all"} onPress={() => setStatus("all")} testID="filter-all" />
          <Chip label="In attesa" selected={status === "pending"} onPress={() => setStatus("pending")} testID="filter-pending" />
          <Chip label="Approvati" selected={status === "approved"} onPress={() => setStatus("approved")} testID="filter-approved" />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Tutti i cantieri" selected={cantiereId === ""} onPress={() => setCantiereId("")} testID="cantiere-filter-all" />
          {(cantieri ?? []).map((c) => (
            <Chip key={c.id} label={c.name} selected={cantiereId === c.id} onPress={() => setCantiereId(c.id)} testID={`cantiere-filter-${c.id}`} />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingView label="Caricamento…" />
      ) : isError ? (
        <EmptyState icon="wifi-off" title="Errore" message="Impossibile caricare i rapportini." action={<AppButton label="Riprova" onPress={() => refetch()} testID="retry-button" />} />
      ) : reports.length === 0 ? (
        <EmptyState icon="inbox" title="Nessun rapportino" message="Non ci sono rapportini per i filtri selezionati." />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  filters: { paddingVertical: 10, gap: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  chipRow: { gap: 8, paddingHorizontal: 16 },
  list: { padding: 16, paddingBottom: 32 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandSecondary, fontWeight: "800", fontSize: 16 },
  userName: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  dateText: { fontSize: 13, color: colors.muted, marginTop: 1, textTransform: "capitalize" },
  hoursPill: { backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  hoursText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 14 },
  cantiereRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  cantiere: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.onSurfaceSecondary },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
}));
