import { Box, Button, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react';
import { withUrqlClient } from "next-urql";
import NextLink from "next/link";
import React, { useState } from "react";
import { DootSection } from "../components/DootSection";
import { EditDeletePostButtons } from "../components/EditDeletePostButtons";
import { Layout } from "../components/Layout";
import { useMeQuery, usePostsQuery } from "../generated/graphql";
import { createUrqlClient } from "../utils/createUrqlClient";

const Index = () =>{
  const [variables,setVariables] = useState({
    limit: 15,
    cursor: null as null | string
  })
  const [{data}] = usePostsQuery({
    variables
  })
  if(!data){
    return <div> uh oh, there are no posts. This maybe and us problem.</div>
  }

return (
  <Layout>
    {!data
      ? <div>loading...</div>
      : (
        <Stack>
          {data!.posts.posts.map((p) =>
          !p ? null : (
          // <div key={p.id}>{p.title}</div>
          <Flex key={p.id} p={5} shadow="md" borderWidth="1px">
            <DootSection post={p}/>
            <Box flex={1}>
              <NextLink href="/post/[id]" as ={`/post/${p.id}`}><Link>
                <Heading fontSize="xl">{p.title}</Heading>
              </Link></NextLink>
              <Text>posted by {p.creator.username}</Text>
              <Flex>
                <Text flex={1} mt={4}>{p.textSnippet}</Text>
                  <Box ml='auto'>
                    <EditDeletePostButtons
                      id={p.id}
                      creatorId={p.creator.id}/>
                  </Box>
              </Flex>
            </Box>
          </Flex>
          ))}
        </Stack>
        )}
        {data && data.posts.hasMore ? (
          <Flex>
            <Button onClick={() =>{
              setVariables({
                limit:variables.limit,
                cursor: data.posts.posts[data.posts.posts.length -1].createdAt
              })
            }}
            m="auto"
            my={8}>
              load more
            </Button>
          </Flex>
        ): null}
  </Layout>
  )
}

export default withUrqlClient(createUrqlClient, {ssr:true}) (Index)
