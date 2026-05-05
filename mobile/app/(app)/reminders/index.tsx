import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { database } from '@/lib/database'
import { syncDatabase } from '@/lib/sync'
import { supabase } from '@/lib/supabase'
import { format, parseISO, isPast } from 'date-fns'

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [message, setMessage] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDone, setShowDone] = useState(false)

  async function load() {
    const rows = await database.get('reminders').query().fetch() as any[]
    setReminders(rows.sort((a: any, b: any) => a.remindAt?.localeCompare(b.remindAt ?? '') ?? 0))
  }

  async function onRefresh() {
    setRefreshing(true)
    await syncDatabase()
    await load()
    setRefreshing(false)
  }

  async function createReminder() {
    if (!message.trim() || !remindAt.trim()) {
      Alert.alert('Error', 'Message and date/time are required')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('reminders').insert({
        user_id: user.id,
        message: message.trim(),
        remind_at: remindAt,
        is_done: false,
      })
      setShowAdd(false)
      setMessage('')
      setRemindAt('')
      await syncDatabase()
      await load()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleDone(reminder: any) {
    await supabase.from('reminders')
      .update({ is_done: !reminder.isDone })
      .eq('id', reminder.serverId || reminder.id)
    await syncDatabase()
    await load()
  }

  useEffect(() => { load() }, [])

  const displayed = reminders.filter(r => showDone ? true : !r.isDone)

  const renderItem = ({ item }: { item: any }) => {
    const date = item.remindAt ? parseISO(item.remindAt) : null
    const overdue = date && !item.isDone && isPast(date)
    return (
      <View style={[styles.card, item.isDone && styles.cardDone]}>
        <TouchableOpacity style={styles.checkbox} onPress={() => toggleDone(item)}>
          <Text style={styles.checkboxIcon}>{item.isDone ? '☑️' : '⬜'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.msgText, item.isDone && styles.msgDone]}>{item.message}</Text>
          {date && (
            <Text style={[styles.dateText, overdue && styles.dateOverdue]}>
              {overdue ? '⏰ ' : '📅 '}{format(date, 'MMM d, yyyy HH:mm')}
              {overdue ? ' — OVERDUE' : ''}
            </Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.filterBtn, showDone && styles.filterBtnActive]}
            onPress={() => setShowDone(!showDone)}
          >
            <Text style={[styles.filterBtnText, showDone && styles.filterBtnTextActive]}>
              {showDone ? 'Hide Done' : 'Show All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>No reminders yet</Text>
          </View>
        }
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Reminder</Text>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Reminder message…"
              placeholderTextColor="#64748b"
              multiline
            />
            <TextInput
              style={styles.input}
              value={remindAt}
              onChangeText={setRemindAt}
              placeholder="Date & time (e.g. 2026-05-15T09:00)"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Format: YYYY-MM-DDTHH:MM (e.g. 2026-05-15T09:00)</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createReminder} disabled={saving}>
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
  headerBtns: { flexDirection: 'row', gap: 8 },
  filterBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.06)' },
  filterBtnActive: { backgroundColor: '#2563eb22', borderWidth: 1, borderColor: '#2563eb' },
  filterBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  filterBtnTextActive: { color: '#60a5fa' },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardDone: { opacity: 0.5 },
  checkbox: { paddingTop: 2 },
  checkboxIcon: { fontSize: 20 },
  msgText: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', lineHeight: 20 },
  msgDone: { textDecorationLine: 'line-through', color: '#64748b' },
  dateText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  dateOverdue: { color: '#f87171' },
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
  hint: { fontSize: 11, color: '#475569' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  saveBtn: { flex: 1, borderRadius: 12, padding: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
})
