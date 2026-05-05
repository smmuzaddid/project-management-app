import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Q } from '@nozbe/watermelondb'
import { database } from '@/lib/database'
import { syncDatabase } from '@/lib/sync'

const STATUS_COLOR: Record<string, string> = {
  pending: '#94a3b8',
  in_progress: '#2563eb',
  waiting: '#d97706',
  done: '#16a34a',
  blocked: '#dc2626',
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    // Find project by serverId
    const projects = await database.get('projects').query().fetch() as any[]
    const found = projects.find(p => p.serverId === id || p.id === id)
    setProject(found)

    if (found) {
      // Get tasks for this project
      const allTasks = await database.get('tasks').query().fetch() as any[]
      const projectTasks = allTasks.filter(t => t.projectId === (found.serverId || id))
      setTasks(projectTasks.sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0)))
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await syncDatabase()
    await load()
    setRefreshing(false)
  }

  useEffect(() => { load() }, [id])

  if (!project) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    )
  }

  const doneTasks = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? doneTasks / tasks.length : 0

  return (
    <>
      <Stack.Screen options={{ title: project.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
      >
        {/* Project Info */}
        <View style={styles.info}>
          <Text style={styles.client}>{project.clientName}</Text>
          <View style={styles.row}>
            <View style={styles.chip}><Text style={styles.chipText}>{project.status?.replace('_', ' ')}</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>{project.phase}</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>{project.priority}</Text></View>
          </View>
          {project.notes && <Text style={styles.notes}>{project.notes}</Text>}
        </View>

        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Task Progress</Text>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressSub}>{doneTasks} of {tasks.length} tasks done</Text>
        </View>

        {/* Tasks */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          {tasks.length === 0 && (
            <Text style={styles.emptyText}>No tasks yet</Text>
          )}
          {tasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => router.push(`/(app)/tasks/${task.serverId || task.id}` as never)}
            >
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[task.status] ?? '#475569' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, task.status === 'done' && styles.taskDone]}>{task.title}</Text>
                {task.dueDate && (
                  <Text style={styles.taskDue}>Due {task.dueDate}</Text>
                )}
              </View>
              <View style={[styles.chip, { backgroundColor: STATUS_COLOR[task.status] + '22' }]}>
                <Text style={[styles.chipText, { color: STATUS_COLOR[task.status] }]}>
                  {task.status?.replace('_', ' ')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  loadingText: { color: '#94a3b8' },
  info: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  client: { fontSize: 14, color: '#60a5fa', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textTransform: 'capitalize' },
  notes: { fontSize: 14, color: '#94a3b8', lineHeight: 20 },
  progressWrap: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  progressPct: { fontSize: 14, fontWeight: '700', color: '#60a5fa' },
  progressBar: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, marginBottom: 6 },
  progressFill: { height: 6, backgroundColor: '#2563eb', borderRadius: 3 },
  progressSub: { fontSize: 12, color: '#64748b' },
  tasksSection: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#e2e8f0', marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  taskDone: { textDecorationLine: 'line-through', color: '#64748b' },
  taskDue: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
