import { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { TouchableOpacity, Text, Alert } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useSync } from '@/hooks/useSync'
import { supabase } from '@/lib/supabase'
import { unregisterPushToken } from '@/lib/notifications'

function TabBarIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  )
}

export default function AppLayout() {
  // Auto sync on network changes and foreground
  useSync()

  const router = useRouter()

  // Deep-link handling from notification tap
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as {
        taskId?: string
        type?: string
      }
      if (data?.taskId) {
        router.push(`/(app)/tasks/${data.taskId}` as never)
      }
    })
    return () => sub.remove()
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTitleStyle: { color: '#fff', fontWeight: '700' },
        headerTintColor: '#60a5fa',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: 'rgba(255,255,255,0.05)',
          paddingBottom: 4,
        },
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🏠" focused={focused} />,
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={async () => {
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out', style: 'destructive', onPress: async () => {
                      await unregisterPushToken()
                      await supabase.auth.signOut()
                      router.replace('/(auth)/login')
                    }
                  },
                ])
              }}
            >
              <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '600' }}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="📁" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="✅" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: 'Follow-ups',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="💬" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🔔" focused={focused} />,
          headerShown: false,
        }}
      />
    </Tabs>
  )
}
