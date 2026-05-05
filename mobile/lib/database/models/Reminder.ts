import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class Reminder extends Model {
  static table = 'reminders'

  @field('server_id') serverId!: string
  @field('user_id') userId!: string
  @field('project_id') projectId!: string
  @field('task_id') taskId!: string
  @field('remind_at') remindAt!: string
  @field('message') message!: string
  @field('is_done') isDone!: boolean
  @field('created_at') createdAt!: string
  @field('updated_at') updatedAt!: string
}
