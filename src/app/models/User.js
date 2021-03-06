import Sequelize, { Model } from 'sequelize'
import bcrypt from 'bcryptjs'

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        email: Sequelize.STRING,
        username: Sequelize.STRING,
        birth_date: Sequelize.DATEONLY,
        user_type: Sequelize.STRING,
        is_active: Sequelize.BOOLEAN,
        password_hash: Sequelize.STRING,
        password: Sequelize.VIRTUAL,
        created_at: Sequelize.DATE,
      },
      {
        sequelize,
      }
    )

    this.addHook('beforeSave', async user => {
      if (user.password) {
        user.password_hash = await bcrypt.hash(user.password, 8)
      }
    })

    return this
  }

  checkPassword(password) {
    return bcrypt.compare(password, this.password_hash)
  }
}

export default User
