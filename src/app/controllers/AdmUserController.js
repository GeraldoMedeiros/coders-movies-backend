import * as Yup from 'yup'
import User from '../models/User'

class AdmUserController {
  async index(req, res) {
    /*
     * list with pagination
     */
    const { page } = req.query

    const users = await User.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'birth_date',
        'user_type',
        'username',
      ],
      order: [['created_at', 'DESC']],
      limit: 20,
      offset: (page - 1) * 20,
    })

    return res.json(users)
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string()
        .email()
        .required(),
      username: Yup.string().required(),
      birth_date: Yup.date().required(),
      user_type: Yup.string().required(),
      password: Yup.string()
        .required()
        .min(6),
    })

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Dados inválidos' })
    }

    const userEmailExists = await User.findOne({
      where: { email: req.body.email },
    })

    if (userEmailExists) {
      return res
        .status(400)
        .json({ error: 'O e-mail digitado já existe na nossa base de dados' })
    }

    const usernameExists = await User.findOne({
      where: { username: req.body.username },
    })

    if (usernameExists) {
      return res
        .status(400)
        .json({ error: 'O username digitado já existe na nossa base de dados' })
    }

    const { user_type } = req.body

    if (user_type !== 'admin' && user_type !== 'common') {
      return res.status(400).json({
        error: 'O tipo de usuário selecionado não é permitido',
      })
    }

    const { id, name, email, username } = await User.create(req.body)

    return res.json({ id, name, username, email })
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      username: Yup.string(),
      oldPassword: Yup.string().min(6),
      birth_date: Yup.date(),
      user_type: Yup.string(),
      password: Yup.string()
        .min(6)
        .when('oldPassword', (oldPassword, field) =>
          oldPassword ? field.required() : field
        ),
      confirmPassword: Yup.string().when('password', (password, field) =>
        password ? field.required().oneOf([Yup.ref('password')]) : field
      ),
    })

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Dados inválidos' })
    }

    const { email, oldPassword, username, user_type } = req.body

    const user = await User.findByPk(req.params.id)
    const admin = await User.findByPk(req.userId)

    if (!user) {
      return res.status(400).json({ error: 'Usuário não encontrado' })
    }

    if (email && email !== user.email) {
      const userEmailExists = await User.findOne({ where: { email } })

      if (userEmailExists) {
        return res
          .status(400)
          .json({ error: 'Já existe um usuário com o e-mail fornecido' })
      }
    }

    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ where: { username } })

      if (usernameExists) {
        return res
          .status(400)
          .json({ error: 'Já existe um usuário com o username fornecido' })
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(401).json({ error: 'Senha antiga inválida' })
    }

    if (user_type && user_type !== 'admin' && user_type !== 'common') {
      return res.status(400).json({
        error: 'O tipo de usuário selecionado não é permitido',
      })
    }

    const priorities = [
      { user_type: 'superadmin', priority: 3 },
      { user_type: 'admin', priority: 2 },
      { user_type: 'common', priority: 1 },
    ]
    const userProperty = priorities.find(
      userObj => userObj.user_type === user.user_type
    )
    const adminProperty = priorities.find(
      userObj => userObj.user_type === admin.user_type
    )

    if (userProperty.priority > adminProperty.priority) {
      return res.status(400).json({
        error:
          'Você não possui permissões necessárias para alterar o usuário selecionado',
      })
    }

    const { id, name } = await user.update(req.body)

    return res.json({ id, name, email, username })
  }

  async delete(req, res) {
    const user = await User.findByPk(req.params.id)
    const admin = await User.findByPk(req.userId)

    if (!user) {
      return res.status(400).json({ error: 'Usuário não encontrado' })
    }

    const priorities = [
      { user_type: 'superadmin', priority: 3 },
      { user_type: 'admin', priority: 2 },
      { user_type: 'common', priority: 1 },
    ]
    const userProperty = priorities.find(
      ({ user_type }) => user_type === user.user_type
    )
    const adminProperty = priorities.find(
      ({ user_type }) => user_type === admin.user_type
    )

    if (userProperty.priority > adminProperty.priority) {
      return res.status(400).json({
        error:
          'Você não possui permissões necessárias para apagar o usuário selecionado',
      })
    }

    await user.destroy()

    return res.send()
  }
}

export default new AdmUserController()
