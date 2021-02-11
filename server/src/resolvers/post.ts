import { Post } from "../entities/Post"
import { Resolver, Query, Arg, Mutation, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType } from "type-graphql"
import { MyContext } from "../types"
import { isAuth } from "../middleware/isAuth"
import { getConnection } from "typeorm"
import { Updoot } from "../entities/Updoot"

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
    const updoot = await Updoot.findOne({where: {
      postId,
      userId
    }})

    if(updoot && updoot.value !== realValue){
      //user has voted on post before
      //but changing vote
      await getConnection().transaction(async tm => {
        await tm.query(`
          update updoot
          set value = $1
          where "postId" = $2 and "userId" = $3`, [realValue, postId, userId]
        )
        await tm.query(`
        update post
        set points = points + $1
        where id = $2`, [2*realValue, postId]
        )
      })
    } else if (!updoot) {
      //user hasn't voted on post before
      await getConnection().transaction(async tm => {
        await tm.query(`
          insert into updoot ("userId", "postId", value)
          values ($1,$2,$3)`, [userId, postId, realValue]
        )
        await tm.query(`
        update post
        set points = points + $1
        where id = $2`, [realValue, postId]
        )
      })
    }
    return true
  }
  @Query(() => PaginatedPosts)/* graphql type */
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() {req}: MyContext
  ): Promise<PaginatedPosts> {/* typescript type */
    const realLimit = Math.min(50, limit)
    const realLimitPlusOne = realLimit + 1

    const replacements: any[] = [realLimitPlusOne]
    //this is necessary if userId exist we CAN push it on.
    //if it doesn't it would break if it was in the array above
    if (req.session.userId) {
      replacements.push(req.session.userId)
    }
    let cursorIndex = 3

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
      cursorIndex = replacements.length
    }
    const posts = await getConnection().query(`
    select p.*,
    json_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
    ) creator,
    ${req.session.userId
      ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
      : 'null as "voteStatus"'
    }
    from post p
    inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $${cursorIndex}` : ""}
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
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ["creator"]})
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
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg('id',() => Int) id: number,
    @Arg('title') title: string,
    @Arg('text') text: string,
    @Ctx() {req}: MyContext
    ): Promise<Post | null> {/* typescript type */
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({title, text})
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId
      })
      .returning('*')
      .execute()
      return result.raw[0]
  }

  @Mutation(() => Boolean)/* graphql type */
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg('id', () => Int) id: number,
    @Ctx() {req}: MyContext
  ): Promise<boolean> {/* typescript type */
    const post = await Post.findOne(id)
    if (!post) {
      return false
    }
    if (post.creatorId !== req.session.userId){
      throw new Error('not authorized')
    }
    await Updoot.delete({postId:id})
    await Post.delete({id})
    // await Post.delete({id/* , creatorId: req.session.userId */})
    return true
  }
}
