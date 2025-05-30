import Joi from "joi"

const validateRegistration = (data) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(15).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  })

  return schema.validate(data)
}

const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  })

  return schema.validate(data)
}

export {validateRegistration, validateLogin}