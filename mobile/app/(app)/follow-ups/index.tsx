import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { database } from '@/lib/database'
import { syncDatabase } from '@/lib/sync'
import { supabase } from '@/lib/supabase'

const STATUS_COLOR: Record<string, string> = {
  open: '#2563eb',
  resolved: '#16a34a',
}

export default function FollowUpsScreen() {
  const [followUps, setFollowUps] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [note, setNote] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterOpen, setFilterOpen] = useState<boolean | null>(null) // null = all

  async function load() {
    const fus = await database.get('follow_ups').query().fetch() as any[]
    setFollowUps(fus.sort((a: any, b: any) => b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0))
    const projs = await database.get('projects').query().fetch() as any[]
    setProjects(projs)
    if (projs.length && !selectedProject) setSelectedProject(projs[0].serverId || projs[0].id)
  }

  async function onRefresh() {
    setRefreshing(true)
    await syncDatabase()
    await load()
    setRefreshing(false)
  }

  async function createFollowUp() {
    if (!note.trim()) {
      Alert.alert('Error', 'Note is required')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('follow_ups').insert({
        project_id: selectedProject,
        note: note.trim(),
        status: 'open',
        created_by: user.id,
      })
      setShowAdd(false)
      setNote('')
      await syncDatabase()
      await load()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(fu: any) {
    const newStatus = fu.status === 'open' ? 'resolved' : 'open'
    await supabase.from('follow_ups').update({ status: newStatus }).eq('id', fu.serverId || fu.id)
    await syncDatabase()
    await load()
  }

  useEffect(() => { load() }, [])

  const filtered = filterOpen === null ? followUps : followUps.filter(f => (filterOpen ? f.status === 'open' : f.status === 'resolved'))

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => toggleStatus(item)}
        >
          <Text style={styles.toggleText}>{item.status === 'open' ? 'Mark Resolved' : 'Reopen'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.noteText}>{item.note}</Text>
      {item.nextFollowUpDate && (
        <Text style={styles.dateMeta}>📅 Next: {item.nextFollowUpDate}</Text>
      )}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Follow-ups</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {([null, true, false] as const).map(v => (
          <TouchableOpacity
            key={String(v)}
            style={[styles.tab, filterOpen === v && styles.tabActive]}
            onPress={() => setFilterOpen(v)}
          >
            <Text style={[styles.tabText, filterOpen === v && styles.tabTextActive]}>
              {v === null ? 'All' : v ? 'Open' : 'Resolved'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No follow-ups yet</Text>
          </View>
        }
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Follow-up</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={note}
              onChangeText={setNote}
              placeholder="Follow-up note…"
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.label}>Project</Text>
            <View style={styles.projectList}>
              {projects.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.option, (selectedProject === (p.serverId || p.id)) && styles.optionActive]}
                  onPress={() => setSelectedProject(p.serverId || p.id)}
                >
                  <Text style={[styles.optionText, (selectedProject === (p.serverId || p.id)) && styles.optionTextActive]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createFollowUp} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20, backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  tabActive: { backgroundColor: '#2563eb22', borderWidth: 1, borderColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#60a5fa' },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  noteText: { fontSize: 14, color: '#cbd5e1', lineHeight: 20 },
  dateMeta: { fontSize: 12, color: '#64748b', marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15,
  },
  projectList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxWidth: 160,
  },
  optionActive: { backgroundColor: '#2563eb22', borderColor: '#2563eb' },
  optionText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  optionTextActive: { color: '#60a5fa' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 12, padding: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
})
