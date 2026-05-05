import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class FollowUp extends Model {
  static table = 'follow_ups'

  @field('server_id') serverId!: string
  @field('project_id') projectId!: string
  @field('task_id') taskId!: string
  @field('note') note!: string
  @field('next_follow_up_date') nextFollowUpDate!: string
  @field('responsible_user_id') responsibleUserId!: string
  @field('status') status!: string
  @field('created_by') createdBy!: string
  @field('created_at') createdAt!: string
  @field('updated_at') updatedAt!: string
}
