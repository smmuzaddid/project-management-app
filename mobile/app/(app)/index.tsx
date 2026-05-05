import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { database } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { syncDatabase } from '@/lib/sync'

interface Stats {
  totalProjects: number
  activeTasks: number
  overdueTasks: number
  openFollowUps: number
}

export default function DashboardScreen() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalProjects: 0, activeTasks: 0, overdueTasks: 0, openFollowUps: 0 })
  const [userName, setUserName] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function loadStats() {
    const projectsCol = database.get('projects')
    const tasksCol = database.get('tasks')
    const followUpsCol = database.get('follow_ups')

    const now = new Date().toISOString().split('T')[0]

    const [projects, allTasks, followUps] = await Promise.all([
      projectsCol.query().fetch(),
      tasksCol.query().fetch(),
      followUpsCol.query().fetch(),
    ])

    const activeTasks = allTasks.filter((t: any) => t.status !== 'done')
    const overdueTasks = activeTasks.filter((t: any) => t.dueDate && t.dueDate < now)
    const openFollowUps = followUps.filter((f: any) => f.status === 'open')

    setStats({
      totalProjects: projects.length,
      activeTasks: activeTasks.length,
      overdueTasks: overdueTasks.length,
      openFollowUps: openFollowUps.length,
    })
  }

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const profiles = await database.get('profiles').query().fetch() as any[]
      const me = profiles.find(p => p.serverId === user.id)
      setUserName(me?.fullName?.split(' ')[0] ?? 'there')
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await syncDatabase()
    await Promise.all([loadStats(), loadUser()])
    setRefreshing(false)
  }

  useEffect(() => {
    loadStats()
    loadUser()
  }, [])

  const cards = [
    { label: 'Projects', value: stats.totalProjects, emoji: '📁', color: '#2563eb', route: '/(app)/projects' },
    { label: 'Active Tasks', value: stats.activeTasks, emoji: '✅', color: '#16a34a', route: '/(app)/tasks' },
    { label: 'Overdue', value: stats.overdueTasks, emoji: '⏰', color: '#dc2626', route: '/(app)/tasks' },
    { label: 'Follow-ups', value: stats.openFollowUps, emoji: '💬', color: '#d97706', route: '/(app)/follow-ups' },
  ]

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
    >
      <Text style={styles.greeting}>Good day, {userName} 👋</Text>
      <Text style={styles.subheading}>Here's what's happening</Text>

      <View style={styles.grid}>
        {cards.map(card => (
          <TouchableOpacity
            key={card.label}
            style={[styles.card, { borderLeftColor: card.color }]}
            onPress={() => router.push(card.route as never)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardEmoji}>{card.emoji}</Text>
            <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/tasks' as never)}>
          <Text style={styles.actionEmoji}>✅</Text>
          <Text style={styles.actionText}>View All Tasks</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/projects' as never)}>
          <Text style={styles.actionEmoji}>📁</Text>
          <Text style={styles.actionText}>View All Projects</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/reminders' as never)}>
          <Text style={styles.actionEmoji}>🔔</Text>
          <Text style={styles.actionText}>My Reminders</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
  },
  cardEmoji: { fontSize: 22, marginBottom: 8 },
  cardValue: { fontSize: 32, fontWeight: '800', marginBottom: 2 },
  cardLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  quickActions: {},
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#e2e8f0', marginBottom: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  actionEmoji: { fontSize: 18, width: 28 },
  actionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  actionArrow: { fontSize: 20, color: '#475569' },
})
