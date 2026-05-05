import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { database } from '@/lib/database'
import { syncDatabase } from '@/lib/sync'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const STATUS_COLOR: Record<string, string> = {
  active: '#16a34a',
  on_hold: '#d97706',
  completed: '#2563eb',
  archived: '#475569',
}
const PRIORITY_COLOR: Record<string, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
  urgent: '#9333ea',
}

export default function ProjectsScreen() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [newName, setNewName] = useState('')
  const [newClient, setNewClient] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const rows = await database.get('projects').query().fetch()
    setProjects([...rows].sort((a: any, b: any) =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    ))
    // Check admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const profiles = await database.get('profiles').query().fetch() as any[]
      const me = profiles.find(p => p.serverId === user.id)
      setIsAdmin(me?.role === 'admin')
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await syncDatabase()
    await load()
    setRefreshing(false)
  }

  async function createProject() {
    if (!newName.trim() || !newClient.trim()) {
      Alert.alert('Error', 'Name and client are required')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('projects').insert({
        name: newName.trim(),
        client_name: newClient.trim(),
        status: 'active',
        priority: 'medium',
        phase: 'planning',
        created_by: user.id,
      }).select().single()
      if (error) throw error
      // Add creator as owner
      await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: user.id,
        access_role: 'owner',
      })
      setShowAdd(false)
      setNewName('')
      setNewClient('')
      await syncDatabase()
      await load()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { load() }, [])

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/projects/${item.serverId || item.id}` as never)}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
            {item.status?.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={styles.cardClient}>{item.clientName}</Text>
      <View style={styles.cardBottom}>
        <View style={[styles.badge, { backgroundColor: PRIORITY_COLOR[item.priority] + '22' }]}>
          <Text style={[styles.badgeText, { color: PRIORITY_COLOR[item.priority] }]}>{item.priority}</Text>
        </View>
        {item.dueDate && (
          <Text style={styles.cardDate}>Due {format(new Date(item.dueDate), 'MMM d, yyyy')}</Text>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={styles.emptyText}>No projects yet</Text>
          </View>
        }
      />

      {/* Add Project Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Project</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Project name"
              placeholderTextColor="#64748b"
            />
            <TextInput
              style={styles.input}
              value={newClient}
              onChangeText={setNewClient}
              placeholder="Client name"
              placeholderTextColor="#64748b"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createProject} disabled={saving}>
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
    padding: 16, paddingTop: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#e2e8f0', flex: 1, marginRight: 8 },
  cardClient: { fontSize: 13, color: '#94a3b8', marginBottom: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDate: { fontSize: 12, color: '#64748b' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 12, padding: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
})
