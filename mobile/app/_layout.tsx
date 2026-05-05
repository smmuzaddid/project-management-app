import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { useAuth } from '@/hooks/useAuth'
import { registerPushToken } from '@/lib/notifications'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(app)')
    }
  }, [session, loading, segments])

  return <>{children}</>
}

export default function RootLayout() {
  // Handle notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as {
        taskId?: string
        type?: string
      }
      if (data?.taskId) {
        // Navigation handled in (app) layout via useRouter
      }
    })
    return () => subscription.remove()
  }, [])

  // Register push token after login (handled in useAuth + login screen)

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar style="light" />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AuthGuard>
    </GestureHandlerRootView>
  )
}
