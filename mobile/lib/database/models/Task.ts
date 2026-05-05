import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class Task extends Model {
  static table = 'tasks'

  @field('server_id') serverId!: string
  @field('project_id') projectId!: string
  @field('title') title!: string
  @field('description') description!: string
  @field('status') status!: string
  @field('priority') priority!: string
  @field('due_date') dueDate!: string
  @field('assigned_to') assignedTo!: string
  @field('created_by') createdBy!: string
  @field('created_at') createdAt!: string
  @field('updated_at') updatedAt!: string
}
