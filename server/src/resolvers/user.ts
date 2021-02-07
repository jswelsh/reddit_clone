import { User } from "../entities/User"
import { MyContext } from "../types"
import argon2 from 'argon2'
import { Arg, Ctx, Field, FieldResolver, Mutation, ObjectType, Query, Resolver, Root } from "type-graphql"
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants"
import { UsernamePasswordInput } from "./UsernamePasswordInput"
import { validateRegister } from "../utils/validateRegister"
import { sendEmail } from "../utils/sendEmail"
import {v4} from 'uuid'
import { getConnection } from "typeorm"

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

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() {req}: MyContext){
    //this is the current user
    if (req.session.userId === user.id) {
      return user.email
    }
    //current user wants to see someone elses email
    return ""
  }

  @Mutation(() => UserResponse) 
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, req }: MyContext
  ):Promise<UserResponse> {
    if (newPassword.length <= 3) {//this needs to be abstracted out
      return { errors: [
        {
          field: 'newPassword',
          message: "Password isn't long enough, must be greater than three characters in length"
        }
      ]}
    }
    const key = FORGET_PASSWORD_PREFIX + token
    const userId = await redis.get(key)
    if (!userId) {
      return {errors: [
        {
          field: 'token',
          message: "Token invalid or expired, request a new one through the forgot password link"
        }
      ]}
    }
    const userIdNum= parseInt(userId)
    const user = await User.findOne(userIdNum)

    if (!user) {
      return {errors: [
        {
          field: 'token',
          message: "User no longer exists"
        }
      ]}
    }

    await User.update({
      id:userIdNum}, {
      password: await argon2.hash(newPassword) })

    await redis.del(key) //delete the key so it cant be used again

    //log user in
    req.session.userId = user.id

    return { user }
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } })
    if(!user) {
      //email doesnt exist
    return true
    }
    const token = v4(); //create a token
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60 * 24
    ) //one day to reset using this token
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    )
    return true
  }
  @Query(()=> User, {nullable: true})
  me(@Ctx() { req }: MyContext) {
    //if you are not logged in
    if ( !req.session.userId) {
      return null
    }
    return User.findOne(req.session.userId)
  }

  @Mutation(() => UserResponse)/* graphql type */
  async register(
    @Arg('options') options: UsernamePasswordInput, /* , () => UsernamePasswordInput */
    @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
      
      const errors = validateRegister(options)
      if(errors) {
        return {errors}
      }
      const hashedPassword = await argon2.hash(options.password)
      let user
      try {
        //this is the same as below
/*         User.create({email: options.email,
          username: options.username,
          password: hashedPassword}).save() */
        //this is the verbose way to make a query
        const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          email: options.email,
          username: options.username,
          password: hashedPassword,
        })
        .returning('*')
        .execute()
        user = result.raw[0]
        // await em.persistAndFlush( user)//used with mikro-orm
      } catch (err) {
        //duplicate username
        if ( err.code === '23505' /* err.details.include('already exists') */) {
          return {
            errors: [{
              field: 'username',
              message: 'This username already exists'
            }]
          }
        }
      }
      //store user id in cookie
      //keep them logged in
      req.session.userId = user.id
      return {user}
    }

  @Mutation(() => UserResponse)/* graphql type */
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password:string,
    @Ctx() { req}: MyContext
    ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
      ? { where: { email: usernameOrEmail }}
      : { where: { username: usernameOrEmail }}
    )
    if (!user) {
      return {
        errors: [{
          field: 'usernameOrEmail',
          message: "Username doesn't exist"
        }]
      }
    }

    const valid = await argon2.verify(user.password, password)
    if (!valid) {
      return {
        errors: [{
          field: 'password',
          message: "password invalid"
        }]
      }
    }
    //store user id in cookie
    //keep them logged in
    req.session.userId = user.id
    return {user}
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext){
    return new Promise(resolve =>
      req.session.destroy( err => {
        res.clearCookie(COOKIE_NAME)//maybe move below if, only clear if session is destroyed???
        if(err) {
          
          resolve(false)
          return
        }
        resolve(true)
      })
    )
  }
}