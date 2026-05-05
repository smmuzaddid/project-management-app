import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  RefreshControl, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { database } from '@/lib/database'
import { syncDatabase } from '@/lib/sync'
import { supabase } from '@/lib/supabase'

const STATUS_COLOR: Record<string, string> = {
  pending: '#94a3b8',
  in_progress: '#2563eb',
  waiting: '#d97706',
  done: '#16a34a',
  blocked: '#dc2626',
}
const PRIORITY_COLOR: Record<string, string> = {
  low: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
  urgent: '#9333ea',
}

interface TaskSection {
  title: string
  data: any[]
}

function groupTasks(tasks: any[]): TaskSection[] {
  const now = new Date().toISOString().split('T')[0]
  const today = now
  const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today)
  const dueToday = tasks.filter(t => t.status !== 'done' && t.dueDate === today)
  const upcoming = tasks.filter(t => t.status !== 'done' && (!t.dueDate || t.dueDate > today))
  const done = tasks.filter(t => t.status === 'done')
  const sections: TaskSection[] = []
  if (overdue.length) sections.push({ title: '⏰ Overdue', data: overdue })
  if (dueToday.length) sections.push({ title: '📅 Due Today', data: dueToday })
  if (upcoming.length) sections.push({ title: '🗓 Upcoming', data: upcoming })
  if (done.length) sections.push({ title: '✅ Done', data: done })
  return sections
}

export default function TasksScreen() {
  const router = useRouter()
  const [sections, setSections] = useState<TaskSection[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const tasks = await database.get('tasks').query().fetch() as any[]
    setSections(groupTasks(tasks))
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

  async function createTask() {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Task title is required')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('tasks').insert({
        project_id: selectedProject,
        title: newTitle.trim(),
        status: 'pending',
        priority: 'medium',
        created_by: user.id,
      })
      setShowAdd(false)
      setNewTitle('')
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
      style={styles.taskCard}
      onPress={() => router.push(`/(app)/tasks/${item.serverId || item.id}` as never)}
      activeOpacity={0.75}
    >
      <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLOR[item.priority] ?? '#475569' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, item.status === 'done' && styles.done]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.dueDate && <Text style={styles.taskMeta}>Due {item.dueDate}</Text>}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
          {item.status?.replace('_', ' ')}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>No tasks yet</Text>
          </View>
        }
      />

      {/* Add Task Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Task title"
              placeholderTextColor="#64748b"
              multiline
            />
            {/* Project picker */}
            <Text style={styles.label}>Project</Text>
            <View style={styles.projectList}>
              {projects.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.projectOption,
                    (selectedProject === (p.serverId || p.id)) && styles.projectOptionActive,
                  ]}
                  onPress={() => setSelectedProject(p.serverId || p.id)}
                >
                  <Text style={[
                    styles.projectOptionText,
                    (selectedProject === (p.serverId || p.id)) && styles.projectOptionTextActive,
                  ]} numberOfLines={1}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createTask} disabled={saving}>
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
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, marginTop: 4,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    fontSize: 11, color: '#94a3b8', fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 8,
    overflow: 'hidden',
  },
  priorityBar: { width: 4, alignSelf: 'stretch' },
  taskTitle: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', padding: 14, paddingRight: 4 },
  done: { textDecorationLine: 'line-through', color: '#64748b' },
  taskMeta: { fontSize: 11, color: '#64748b', paddingHorizontal: 14, paddingBottom: 10 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
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
  projectOption: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 160,
  },
  projectOptionActive: { backgroundColor: '#2563eb22', borderColor: '#2563eb' },
  projectOptionText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  projectOptionTextActive: { color: '#60a5fa' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 12, padding: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
})
