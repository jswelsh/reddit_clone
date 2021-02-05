import { User } from "../entities/User"
import { MyContext } from "../types"
import argon2 from 'argon2'
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql"
import { EntityManager } from '@mikro-orm/postgresql'
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants"
import { UsernamePasswordInput } from "./UsernamePasswordInput"
import { validateRegister } from "../utils/validateRegister"
import { sendEmail } from "../utils/sendEmail"
import {v4} from 'uuid'

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

  @Mutation(() => UserResponse) 
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, em, req }: MyContext
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

    const user = await em.findOne(User, { id: parseInt(userId)})

    if (!user) {
      return {errors: [
        {
          field: 'token',
          message: "User no longer exists"
        }
      ]}
    }

    user.password = await argon2.hash(newPassword)
    await em.persistAndFlush(user)
    await redis.del(key) //delete the key so it cant be used again

    //log user in
    req.session.userId = user.id

    return { user }
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() {em, redis}: MyContext
  ) {
    const user = await em.findOne(User, {email})
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
  async me(@Ctx() { em, req }: MyContext) {
    //if you are not logged in
    if ( !req.session.userId) {
      return null
    }
    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)/* graphql type */
  async register(
    @Arg('options') options: UsernamePasswordInput, /* , () => UsernamePasswordInput */
    @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
      
      const errors = validateRegister(options)
      if(errors) {
        return {errors}
      }
      const hashedPassword = await argon2.hash(options.password)
      let user
/*    //use this when using mikro-orm
      const user = em.create(User, {
        username: options.username,
        password: hashedPassword
      }) */
      try {
        const result  = await (em as EntityManager)
          .createQueryBuilder(User)
          .getKnexQuery()
          .insert({
            email: options.email,
            username: options.username,
            password: hashedPassword,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('*')
        user = result[0]
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
    @Ctx() {em, req}: MyContext
    ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes('@')
      ? {email: usernameOrEmail}
      : {username: usernameOrEmail}
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