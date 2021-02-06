import { Post } from "../entities/Post"
import { Resolver, Query, Arg, Mutation, InputType, Field, Ctx } from "type-graphql"
import { MyContext } from "src/types"

@InputType()
class PostInput {
  @Field()
  title: string
  @Field()
  text: string
}

@Resolver()
export class PostResolver {
  @Query(() => [Post])/* graphql type */
  posts(): Promise<Post[]> {/* typescript type */
    return Post.find()
  }

  @Query(() => Post, {nullable: true})/* graphql type */
  post(@Arg('id') id: number): Promise<Post | undefined> {
    return Post.findOne(id)
  }

  @Mutation(() => Post)/* graphql type */
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() {req}: MyContext
    ): Promise<Post> {/* typescript type */
      if (!req.session.userId){
        throw new Error('not authenticated')
      }
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
