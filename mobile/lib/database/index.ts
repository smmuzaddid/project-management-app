import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import schema from './schema'
import { Profile, Project, ProjectMember, Task, FollowUp, Reminder } from './models'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'projectmanager',
  jsi: false, // Disabled — JSI requires a native build; Expo Go uses the JS bridge
  onSetUpError: (error) => {
    console.error('WatermelonDB setup error:', error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [Profile, Project, ProjectMember, Task, FollowUp, Reminder],
})
