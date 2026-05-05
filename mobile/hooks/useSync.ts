import { useEffect, useRef, useCallback } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { AppState, AppStateStatus } from 'react-native'
import { syncDatabase } from '@/lib/sync'

/**
 * Automatically syncs when:
 * 1. App mounts (initial sync)
 * 2. Network goes from offline → online
 * 3. App comes back to foreground
 */
export function useSync() {
  const wasOffline = useRef(false)
  const appState = useRef<AppStateStatus>(AppState.currentState)

  const sync = useCallback(async () => {
    await syncDatabase()
  }, [])

  useEffect(() => {
    // Initial sync on mount
    sync()

    // Watch network state
    const unsubscribeNet = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected) {
        if (wasOffline.current) {
          // Coming back online — sync immediately
          wasOffline.current = false
          sync()
        }
      } else {
        wasOffline.current = true
      }
    })

    // Watch app foreground
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        sync()
      }
      appState.current = nextState
    })

    return () => {
      unsubscribeNet()
      subscription.remove()
    }
  }, [sync])
}
