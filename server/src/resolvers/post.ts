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
    textSnippet(@Root() root: Post) {
      return root.text.slice(0,50)
    }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() {req}: MyContext
  ) {
    const isUpdoot = value !== -1
    const realValue = isUpdoot ? 1 : -1
    const { userId } = req.session

    await getConnection().query(`
    START TRANSACTION;

    insert into updoot ("userId", "postId", value)
    values (${userId},${postId},${realValue});

    update post
    set points = points + ${realValue}
    where id = ${postId};

    COMMIT;
    `)

    return true
  }
  @Query(() => PaginatedPosts)/* graphql type */
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {/* typescript type */
    const realLimit = Math.min(50, limit)
    const realLimitPlusOne = realLimit + 1

    const replacements: any[] = [realLimitPlusOne]
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
    }
    const posts = await getConnection().query(`
    select p.*,
    json_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
    ) creator
    from post p
    inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $2` : ""}
    order by p."createdAt" DESC
    limit $1
    `, replacements)
/*     const qb = getConnection()
    .getRepository(Post)
    .createQueryBuilder('p')
    .innerJoinAndSelect(
      "p.creator",
      "u",
      'u.id = p."creatorId"'
    )
    .orderBy('p."createdAt"', "DESC")
    .take(realLimitPlusOne)
 */
/*     if(cursor) {
      qb.where('p."createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)) 
      })
    } */
    // const posts = await qb.getMany()
    // console.log("posts:", posts)
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
      //don't need to include points as it defaults to zero
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
