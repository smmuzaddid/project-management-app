import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications are not available in simulator')
    return null
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted')
    return null
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Project Manager',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    })
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync()
  const token = tokenData.data

  // Save token to Supabase
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('push_tokens')
      .upsert({ user_id: user.id, token, platform: Platform.OS }, { onConflict: 'token' })
  }

  return token
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    await supabase.from('push_tokens').delete().eq('token', tokenData.data)
  } catch {
    // Ignore errors on logout
  }
}
