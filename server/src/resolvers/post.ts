import { Post } from "../entities/Post"
import { Resolver, Query, Arg, Mutation, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType } from "type-graphql"
import { MyContext } from "../types"
import { isAuth } from "../middleware/isAuth"
import { getConnection } from "typeorm"

@InputType()
class PostInput {
  @Field()
  title: string
  @Field()
  text: string
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[]
  @Field()
  hasMore: boolean
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
    textSnippet(
      @Root() root: Post
    ) {
      return root.text.slice(0,50)
    }

  @Query(() => PaginatedPosts)/* graphql type */
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {/* typescript type */
    const realLimit = Math.min(50, limit)
    const realLimitPlusOne = realLimit + 1
    const qb = getConnection()
    .getRepository(Post)
    .createQueryBuilder('p')
    .orderBy('"createdAt"', "DESC")
    .take(realLimitPlusOne)

    if(cursor) {
      qb.where('"createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)) 
      })
    }
    const posts = await qb.getMany()
    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne
    }
    
  }

  @Query(() => Post, {nullable: true})/* graphql type */
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id)
  }

  @Mutation(() => Post)/* graphql type */
  @UseMiddleware(isAuth) //check if the user is logged in else throw an error
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() {req}: MyContext
    ): Promise<Post> {/* typescript type */
    return Post.create({
      ...input,
      creatorId: req.session.userId
      //dont need to include points as it defaults to zero
    }).save()
  }

  @Mutation(() => Post, {nullable: true})/* graphql type */
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, {nullable:true}) title: string,
  ): Promise<Post | null> {/* typescript type */
    const post = await Post.findOne(id)
    if (!post) {
      return null
    }
    if (typeof title !== 'undefined'){
      await Post.update({id}, {title})
    }
    return post
  }

  @Mutation(() => Boolean)/* graphql type */
  async deletePost(@Arg('id') id: number,): Promise<boolean> {/* typescript type */
    await Post.delete(id)
    return true
  }
}
