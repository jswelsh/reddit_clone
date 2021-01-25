import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/core'
import { __prod__ } from './constants'
// import { Post } from './entities/Post' 
import microConfig from './mikro-orm.config'
import express from 'express'
import { ApolloServer } from 'apollo-server-express'

import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'


import redis from 'redis'
import session from 'express-session'
import connectRedis from 'connect-redis'


const main = async () => {
  const orm = await MikroORM.init(microConfig)
  await orm.getMigrator().up()

  const RedisStore = connectRedis(session)
  const redisClient = redis.createClient()

  const app = express()

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redisClient,
        // disableTTL: true, //may not need
        disableTouch: true
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,// 10years
        httpOnly: true,
        sameSite: 'lax', //csrf
        secure: __prod__ // only in htttps, doesnt work in dev
      },
      secret: 'asgasfsfdsfsadcfsdafcsa', //need this as env variable
      resave: false,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: true
    }),
    context: () => ({ em: orm.em })
  })

  apolloServer.applyMiddleware({ app })

  app.listen(4000, () => {
    console.log('server started on localhost 4000')
  })
}

main().catch(err => {
  console.log(err)
})