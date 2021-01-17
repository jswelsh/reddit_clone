import { User } from "../entities/User"
import { MyContext } from "../types"
import argon2 from 'argon2'
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Resolver } from "type-graphql"

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string
  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
class UserResponse{
  @Field(() => [FieldError], {nullable: true})
  errors?: FieldError[]
  @Field(() => User, {nullable: true})
  user?: User
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)/* graphql type */
  async register(
    @Arg('options') options: UsernamePasswordInput, /* , () => UsernamePasswordInput */
    @Ctx() {em}: MyContext
    ): Promise<UserResponse> {
      if (options.username.length <= 2) {
        return {
          errors: [{
            field: 'username',
            message: "Username isn't log enough, must be greater than two characters in length"
          }]
        }
      }
      if (options.password.length <= 3) {
        return {
          errors: [{
            field: 'password',
            message: "Password isn't log enough, must be greater than three characters in length"
          }]
        }
      }
      const hashedPassword = await argon2.hash(options.password)
      const user = em.create(User, {
        username: options.username,
        password: hashedPassword
      })
      try {
        await em.persistAndFlush(user)
      } catch (error) {
        console.log("ERROR", error)
      }
      return {user}
    }

  @Mutation(() => UserResponse)/* graphql type */
  async login(
    @Arg('options') options: UsernamePasswordInput, /* , () => UsernamePasswordInput */
    @Ctx() {em}: MyContext
    ): Promise<UserResponse> {
    const user = await em.findOne(User, {username: options.username})
    if (!user) {
      return {
        errors: [{
          field: 'username',
          message: "Username doesn't exist"
        }]
      }
    }

    const valid = await argon2.verify(user.password, options.password)
    if (!valid) {
      return {
        errors: [{
          field: 'password',
          message: "password invalid"
        }]
      }
    }
    return {user}
  }
}