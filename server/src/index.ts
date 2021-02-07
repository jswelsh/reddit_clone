import 'reflect-metadata'

import { COOKIE_NAME, __prod__ } from './constants'
import express from 'express'
import { ApolloServer } from 'apollo-server-express'

import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'


import Redis from 'ioredis'
import session from 'express-session'
import connectRedis from 'connect-redis'
import { MyContext } from './types'

import cors from 'cors'
import {createConnection} from 'typeorm'
import { Post } from './entities/Post'
import { User } from './entities/User'

import path from "path"
import { Updoot } from './entities/Updoot'

const main = async () => {
  const conn = await createConnection({
    type: 'postgres',
    database: 'lireddit2',
    username: 'postgres',
    password: 'postgres',
    logging: true,
    synchronize: true, //keep this in development
    // synchronize: false, //keep this in development
    migrations: [path.join(__dirname, './migrations/*')],
    entities: [Post, User, Updoot]
  })
  await conn.runMigrations()
  //used to clear the db of posts
  // await Post.delete({})

  const app = express()
  const RedisStore = connectRedis(session)
  const redis = new Redis()
  app.use(
    cors({
      origin:'http://localhost:3000',
      credentials: true
    })
  )
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        // disableTTL: true, //may not need
        disableTouch: true
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,// 10years
        httpOnly: true,
        sameSite: 'lax', //csrf
        secure: __prod__ // only in https, doesn't work in dev if set to true
      },
      saveUninitialized: false,
      secret: 'asgasfsfdsfsadcfsdafcsa', //need this as env variable
      resave: false,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false
    }),
    context: ({req, res}): MyContext => ({ req, res, redis })
  })

  apolloServer.applyMiddleware({
    app,
    cors: false/* { origin: 'http://localhost:3000' } */ })

  app.listen(4000, () => {
    console.log('server started on localhost 4000')
  })
}

main().catch(err => {
  console.log(err)
})