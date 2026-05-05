import { Stack } from 'expo-router'

export default function TasksLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTitleStyle: { color: '#fff', fontWeight: '700' },
        headerTintColor: '#60a5fa',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    />
  )
}
