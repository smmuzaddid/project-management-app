import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { database } from '@/lib/database'
import { syncDatabase } from '@/lib/sync'
import { supabase } from '@/lib/supabase'
import type { TaskStatus } from '@/lib/types'

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'waiting', 'done', 'blocked']
const STATUS_LABEL: Record<string, string> = {
  pending: '⬜ Pending',
  in_progress: '🔵 In Progress',
  waiting: '🟡 Waiting',
  done: '✅ Done',
  blocked: '🚫 Blocked',
}
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

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [assignee, setAssignee] = useState<any>(null)
  const [updating, setUpdating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const tasks = await database.get('tasks').query().fetch() as any[]
    const found = tasks.find(t => t.serverId === id || t.id === id)
    setTask(found)

    if (found) {
      const projects = await database.get('projects').query().fetch() as any[]
      setProject(projects.find(p => p.serverId === found.projectId || p.id === found.projectId))

      if (found.assignedTo) {
        const profiles = await database.get('profiles').query().fetch() as any[]
        setAssignee(profiles.find(p => p.serverId === found.assignedTo))
      }
    }
  }

  async function updateStatus(newStatus: TaskStatus) {
    if (!task) return
    setUpdating(true)
    try {
      const taskId = task.serverId || task.id
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
      if (error) throw error
      await syncDatabase()
      await load()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await syncDatabase()
    await load()
    setRefreshing(false)
  }

  useEffect(() => { load() }, [id])

  if (!task) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#60a5fa" />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Task Detail' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
      >
        {/* Title */}
        <Text style={styles.title}>{task.title}</Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          {project && (
            <TouchableOpacity
              style={styles.metaChip}
              onPress={() => router.push(`/(app)/projects/${project.serverId || project.id}` as never)}
            >
              <Text style={styles.metaChipText}>📁 {project.name}</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.metaChip, { backgroundColor: PRIORITY_COLOR[task.priority] + '22' }]}>
            <Text style={[styles.metaChipText, { color: PRIORITY_COLOR[task.priority] }]}>
              {task.priority} priority
            </Text>
          </View>
        </View>

        {task.dueDate && (
          <Text style={styles.dueDate}>📅 Due {task.dueDate}</Text>
        )}

        {task.description && (
          <View style={styles.descBox}>
            <Text style={styles.descText}>{task.description}</Text>
          </View>
        )}

        {assignee && (
          <View style={styles.assigneeRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{assignee.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={styles.assigneeLabel}>Assigned to</Text>
              <Text style={styles.assigneeName}>{assignee.fullName}</Text>
            </View>
          </View>
        )}

        {/* Status selector */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionLabel}>Status</Text>
          {updating && <ActivityIndicator color="#60a5fa" size="small" />}
          <View style={styles.statusGrid}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusBtn,
                  task.status === s && { backgroundColor: STATUS_COLOR[s] + '22', borderColor: STATUS_COLOR[s] },
                ]}
                onPress={() => updateStatus(s)}
                disabled={updating || task.status === s}
              >
                <Text style={[styles.statusBtnText, task.status === s && { color: STATUS_COLOR[s] }]}>
                  {STATUS_LABEL[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 14, lineHeight: 30 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  metaChipText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  dueDate: { fontSize: 14, color: '#94a3b8', marginBottom: 14 },
  descBox: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 14,
  },
  descText: { fontSize: 14, color: '#cbd5e1', lineHeight: 22 },
  assigneeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  assigneeLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  assigneeName: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  statusSection: {},
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  statusGrid: { gap: 8 },
  statusBtn: {
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statusBtnText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
})
