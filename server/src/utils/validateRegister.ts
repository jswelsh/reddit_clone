import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput"

export const validateRegister = (options: UsernamePasswordInput) => {
  if (options.username.length <= 2) {
    return [
      {
        field: 'username',
        message: "Username isn't long enough, must be greater than two characters in length"
      }
    ]
  }

  if (options.username.includes('@')) {
    return [
      {
        field: 'username',
        message: 'Username cannot include an "@"'
      }
    ]
  }
  
  if (!options.email.includes('@')) {
    return [
      {
        field: 'email',
        message: "Invalid email"
      }
    ]
  }
  if (options.password.length <= 3) {
    return [
      {
        field: 'password',
        message: "Password isn't long enough, must be greater than three characters in length"
      }
    ]
  }
  return null
}