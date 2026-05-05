import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class ProjectMember extends Model {
  static table = 'project_members'

  @field('server_id') serverId!: string
  @field('project_id') projectId!: string
  @field('user_id') userId!: string
  @field('access_role') accessRole!: string
  @field('created_at') createdAt!: string
  @field('updated_at') updatedAt!: string
}
