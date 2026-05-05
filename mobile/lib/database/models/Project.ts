import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class Project extends Model {
  static table = 'projects'

  @field('server_id') serverId!: string
  @field('name') name!: string
  @field('client_name') clientName!: string
  @field('location') location!: string
  @field('budget') budget!: number
  @field('start_date') startDate!: string
  @field('due_date') dueDate!: string
  @field('status') status!: string
  @field('priority') priority!: string
  @field('phase') phase!: string
  @field('planning_category') planningCategory!: string
  @field('notes') notes!: string
  @field('created_by') createdBy!: string
  @field('created_at') createdAt!: string
  @field('updated_at') updatedAt!: string
}
