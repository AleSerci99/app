import { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { Cantiere, ManagedUser } from "@/src/types";
import { Header, Card, Badge, EmptyState, LoadingView, Fab, AppButton, AppInput, Chip } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ConfirmDialog } from "@/src/components/confirm";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/context/auth";
import { makeStyles, useTheme } from "@/src/theme";

type Tab = "users" | "cantieri";

export default function AdminManage() {
  const styles = useStyles();
  const [tab, setTab] = useState<Tab>("users");
  return (
    <View style={styles.root}>
      <Header title="Gestione" />
      <View style={styles.segment}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Utenti" selected={tab === "users"} onPress={() => setTab("users")} testID="tab-users" />
          <Chip label="Cantieri" selected={tab === "cantieri"} onPress={() => setTab("cantieri")} testID="tab-cantieri" />
        </ScrollView>
      </View>
      {tab === "users" ? <UsersTab /> : <CantieriTab />}
    </View>
  );
}

// ---------------------------------------------------------------------------
function UsersTab() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [toDelete, setToDelete] = useState<ManagedUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<ManagedUser[]>("/admin/users"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const approveMut = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => api.patch(`/admin/users/${id}/approve`, { approved }),
    onSuccess: () => { toast("Aggiornato", "success"); invalidate(); },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
  });
  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { toast("Ruolo aggiornato", "success"); invalidate(); },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/admin/users/${id}`),
    onSuccess: () => { toast("Utente eliminato", "success"); invalidate(); },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
    onSettled: () => setToDelete(null),
  });

  const users = data ?? [];
  const pending = users.filter((u) => !u.approved);
  const active = users.filter((u) => u.approved);
  const ordered = [...pending, ...active];

  if (isLoading) return <LoadingView label="Caricamento utenti…" />;
  if (users.length === 0) return <EmptyState icon="users" title="Nessun utente" />;

  const renderItem = ({ item }: { item: ManagedUser }) => {
    const isMe = item.id === me?.id;
    return (
      <Card style={{ marginBottom: 12 }} testID={`user-row-${item.id}`}>
        <View style={styles.userTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.name}{isMe ? " (tu)" : ""}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={item.role === "admin" ? "Admin" : "Dipendente"} tone={item.role === "admin" ? "info" : "accent"} icon={item.role === "admin" ? "shield" : "user"} />
          {item.approved ? <Badge label="Attivo" tone="success" icon="check" /> : <Badge label="Da approvare" tone="warning" icon="clock" />}
        </View>
        {!isMe && (
          <View style={styles.actionGrid}>
            {!item.approved ? (
              <AppButton label="Approva" variant="secondary" icon="check" onPress={() => approveMut.mutate({ id: item.id, approved: true })} testID={`approve-user-${item.id}`} style={{ flex: 1 }} />
            ) : (
              <AppButton label="Sospendi" variant="outline" icon="slash" onPress={() => approveMut.mutate({ id: item.id, approved: false })} testID={`suspend-user-${item.id}`} style={{ flex: 1 }} />
            )}
            {item.role === "admin" ? (
              <AppButton label="Rendi dip." variant="outline" icon="arrow-down" onPress={() => roleMut.mutate({ id: item.id, role: "employee" })} testID={`demote-user-${item.id}`} style={{ flex: 1 }} />
            ) : (
              <AppButton label="Rendi admin" variant="outline" icon="arrow-up" onPress={() => roleMut.mutate({ id: item.id, role: "admin" })} testID={`promote-user-${item.id}`} style={{ flex: 1 }} />
            )}
            <Pressable style={styles.iconBtn} onPress={() => setToDelete(item)} testID={`delete-user-${item.id}`}>
              <Icon name="trash-2" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}
      </Card>
    );
  };

  return (
    <>
      <FlatList
        data={ordered}
        keyExtractor={(u) => u.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={pending.length > 0 ? <Text style={styles.pendingHint}>{pending.length} utenti in attesa di approvazione</Text> : null}
      />
      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminare l'utente?"
        message={`${toDelete?.name} verrà rimosso e non potrà più accedere.`}
        confirmLabel="Elimina"
        danger
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
function CantieriTab() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<Cantiere | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Cantiere | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => api.get<Cantiere[]>("/cantieri"),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["cantieri"] });

  const saveMut = useMutation({
    mutationFn: (payload: { name: string; address: string }) =>
      editing ? api.patch(`/cantieri/${editing.id}`, payload) : api.post("/cantieri", payload),
    onSuccess: () => { toast(editing ? "Cantiere aggiornato" : "Cantiere creato", "success"); invalidate(); closeForm(); },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.del(`/cantieri/${id}`),
    onSuccess: () => { toast("Cantiere eliminato", "success"); invalidate(); },
    onError: (e: any) => toast(e?.message ?? "Errore", "error"),
    onSettled: () => setToDelete(null),
  });

  const openNew = () => { setEditing(null); setName(""); setAddress(""); setFormOpen(true); };
  const openEdit = (c: Cantiere) => { setEditing(c); setName(c.name); setAddress(c.address ?? ""); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); setName(""); setAddress(""); };
  const onSave = () => {
    if (name.trim().length < 1) return toast("Inserisci il nome del cantiere", "error");
    saveMut.mutate({ name: name.trim(), address: address.trim() });
  };

  const cantieri = data ?? [];

  return (
    <>
      {isLoading ? (
        <LoadingView label="Caricamento cantieri…" />
      ) : cantieri.length === 0 ? (
        <EmptyState icon="map-pin" title="Nessun cantiere" message="Aggiungi il primo cantiere con il pulsante in basso." />
      ) : (
        <FlatList
          data={cantieri}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }} testID={`cantiere-row-${item.id}`}>
              <View style={styles.cantiereRow}>
                <View style={styles.cantiereIcon}>
                  <Icon name="map-pin" size={20} color={colors.onBrandSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cantiereName}>{item.name}</Text>
                  {item.address ? <Text style={styles.cantiereAddr} numberOfLines={1}>{item.address}</Text> : null}
                </View>
                <Pressable style={styles.iconBtn} onPress={() => openEdit(item)} testID={`edit-cantiere-${item.id}`}>
                  <Icon name="edit-2" size={18} color={colors.brandPrimary} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => setToDelete(item)} testID={`delete-cantiere-${item.id}`}>
                  <Icon name="trash-2" size={18} color={colors.error} />
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}

      <Fab icon="plus" label="Cantiere" onPress={openNew} testID="new-cantiere-fab" />

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={closeForm}>
        <Pressable style={styles.backdrop} onPress={closeForm}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.handle} />
            <KeyboardAwareScrollView bottomOffset={20} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editing ? "Modifica cantiere" : "Nuovo cantiere"}</Text>
              <View style={{ gap: 14, marginTop: 16 }}>
                <AppInput label="Nome cantiere" icon="briefcase" placeholder="es. Via Roma 12" value={name} onChangeText={setName} testID="cantiere-name-input" />
                <AppInput label="Indirizzo (opzionale)" icon="map" placeholder="Città, via…" value={address} onChangeText={setAddress} testID="cantiere-address-input" />
              </View>
              <AppButton label={editing ? "Salva" : "Crea cantiere"} onPress={onSave} loading={saveMut.isPending} testID="save-cantiere-button" style={{ marginTop: 20 }} />
            </KeyboardAwareScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminare il cantiere?"
        message={`${toDelete?.name} non sarà più selezionabile nei nuovi rapportini.`}
        confirmLabel="Elimina"
        danger
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  segment: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  chipRow: { gap: 8, paddingHorizontal: 16 },
  list: { padding: 16, paddingBottom: 120 },
  pendingHint: { fontSize: 13, fontWeight: "700", color: colors.warning, marginBottom: 12 },
  userTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 18 },
  userName: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  userEmail: { fontSize: 13, color: colors.muted, marginTop: 1 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  actionGrid: { flexDirection: "row", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" },
  iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  cantiereRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cantiereIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  cantiereName: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  cantiereAddr: { fontSize: 13, color: colors.muted, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  handle: { width: 40, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
}));
