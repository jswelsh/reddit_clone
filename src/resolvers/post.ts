import { Resolver, Query, Ctx } from "type-graphql"
import { Post } from "../entities/Post"
import { MyContext } from "../types"

@Resolver()
export class PostResolver {
  @Query(() => [Post])/* graphql type */
  posts(@Ctx() {em}: MyContext): Promise<Post[]> {/* typescript type */
    return em.find(Post, {})
  }
}