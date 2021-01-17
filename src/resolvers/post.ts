import { Resolver, Query, Ctx, Arg, Int, Mutation } from "type-graphql"
import { Post } from "../entities/Post"
import { MyContext } from "../types"

@Resolver()
export class PostResolver {
  @Query(() => [Post])/* graphql type */
  posts(@Ctx() {em}: MyContext): Promise<Post[]> {/* typescript type */
    return em.find(Post, {})
  }

  @Query(() => Post, {nullable: true})/* graphql type */
  post(
    @Arg('id', () => Int) id: number,
    @Ctx() {em}: MyContext
  ): Promise<Post | null> {/* typescript type */
    return em.findOne(Post, { id })
  }

  @Mutation(() => Post)/* graphql type */
  async createPost(
    @Arg('title') title: string,
    @Ctx() {em}: MyContext
  ): Promise<Post> {/* typescript type */
    const post = em.create(Post,{title})
    await em.persistAndFlush(post)
    return post
  }

  @Mutation(() => Post, {nullable: true})/* graphql type */
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, {nullable:true}) title: string,
    @Ctx() {em}: MyContext
  ): Promise<Post | null> {/* typescript type */
    const post = await em.findOne(Post, {id})
    if (!post) {
      return null
    }
    if (typeof title !== 'undefined'){
      post.title = title
      await em.persistAndFlush(post)
    }
    return post
  }

  @Mutation(() => Boolean)/* graphql type */
  async deletePost(
    @Arg('id') id: number,
    @Ctx() {em}: MyContext
  ): Promise<boolean> {/* typescript type */
    await em.nativeDelete(Post, { id })
    return true
  }
}
