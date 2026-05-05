import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export class Profile extends Model {
  static table = 'profiles'

  @field('server_id') serverId!: string
  @field('full_name') fullName!: string
  @field('email') email!: string
  @field('role') role!: string
  @field('created_at') createdAt!: string
  @field('updated_at') updatedAt!: string
}
