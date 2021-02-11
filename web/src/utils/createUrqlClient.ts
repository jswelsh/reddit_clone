import { cacheExchange, Resolver, Cache } from '@urql/exchange-graphcache';
import Router from 'next/router';
import { dedupExchange, Exchange, fetchExchange, stringifyVariables } from "urql";
import { pipe, tap } from "wonka"
import { DeletePostMutation, DeletePostMutationVariables, LoginMutation, LogoutMutation, MeDocument, MeQuery, RegisterMutation, VoteMutationVariables } from "../generated/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import { gql } from '@urql/core';
import { isServer } from './isServer';
import { argsToArgsConfig } from 'graphql/type/definition';

const errorExchange: Exchange = ({ forward }) => (ops$) => {
  return pipe(
    forward(ops$),
    tap(({ error }) => {
      if (error?.message.includes("not authenticated")) {
        Router.replace("/login")
      }
    })
  )
}

const cursorPagination = (): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info
    const allFields = cache.inspectFields(entityKey)
    const fieldInfos = allFields.filter((info) => info.fieldName === fieldName)
    const size = fieldInfos.length
    if (size === 0) {
      return undefined
    }
    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`
    const isItInTheCache = cache.resolve(
      cache.resolveFieldByKey(entityKey, fieldKey) as string, "posts"
    )
    
    info.partial = !isItInTheCache
    let hasMore = true
    const results: string[] = []
    fieldInfos.forEach((fi) => {
      const key = cache.resolveFieldByKey(entityKey, fi.fieldKey) as string
      const data = cache.resolve(key, "posts") as string[]
      const _hasMore = cache.resolve(key, "hasMore")
      if (!_hasMore) {
        hasMore = _hasMore as boolean
      }
      results.push(...data)
    })

    return {
      __typename: "PaginatedPosts",
      hasMore,
      posts: results,
    }
  }
}

const invalidateAllPosts = (cache: Cache) => {
  //invalidating all the posts arguments 
  const allFields = cache.inspectFields('Query')
  const fieldInfos = allFields.filter(
    (info) => info.fieldName === 'posts'
  )
  fieldInfos.forEach((fi) => {
    cache.invalidate('Query', 'posts', fi.arguments || {})
  })
}

export const createUrqlClient = (ssrExchange: any, ctx:any) => {
//adding cookies to server side renderer pages
  let cookie = ''
if(isServer()) {
  cookie = ctx?.req?.headers?.cookie
}
return {
  url: 'http://localhost:4000/graphql',
  fetchOptions: {
    credentials:'include' as const,
    headers:cookie
    ? {cookie}
    : undefined,
  },
  exchanges: [
      dedupExchange,
      cacheExchange({
        keys:{
          PaginatedPosts: () => null,
        },
        resolvers:{
          Query: {
            posts: cursorPagination()
          }
        },
    updates: {
      Mutation: {
        deletePost: (_result, args, cache, _) => {
          cache.invalidate({__typename: 'Post', id: (args as DeletePostMutationVariables).id})
        },
        vote: (_result, args, cache, __ /* info */) => {
          const {postId, value} = args as VoteMutationVariables
          const data = cache.readFragment(
            gql`
              fragment _ on Post {
                id
                points
                voteStatus
              }
            `,
            { id: postId }
          ); // Data or null
          if (data) {
            if (data.voteStatus === args.value ) return;
            const newPoints = data.points + ((!data.voteStatus ? 1 : 2)*value)
            cache.writeFragment(
              gql`
                fragment __ on Post {
                  points
                  voteStatus
                }
              `,
              { id: postId, points: newPoints, voteStatus: value }
            );
          }
        },
        createPost: (_result, _, cache, __) => {
          invalidateAllPosts(cache)
        },
        logout: (_result, _, cache, __) => {
          betterUpdateQuery<LogoutMutation, MeQuery>(
            cache,
            { query: MeDocument },
            _result,
            () => ({ me: null})
          )
        },
        login: (_result, _, cache, __) => {
          betterUpdateQuery<LoginMutation, MeQuery>(
            cache,
            { query: MeDocument },
            _result,
            (result, query) => /* {
              if (result.login.errors) {
                return query
              } else {
                return {
                  me: result.login.user
                }
              } 
            } */(
              result.login.errors
              ? query
              : { me: result.login.user}
            )
            
          )
          invalidateAllPosts(cache)
        },
        register: (_result, _, cache, __) => {
          betterUpdateQuery<RegisterMutation, MeQuery>(
            cache,
            { query: MeDocument },
            _result,
            (result, query) => /* {
              if (result.register.errors) {
                return query
              } else {
                return {
                  me: result.register.user
                }
              }
            } */(
              result.register.errors
              ? query
              : { me: result.register.user }
            )
          )
        },
      },
    }
  }),
    errorExchange,
    ssrExchange,
    fetchExchange,
  ],
}}