import { withUrqlClient } from "next-urql"
import NextLink from "next/link"
import React, { useState } from "react"
import { Layout } from "../components/Layout"
import { Box, Button, Flex, Heading, IconButton, Link, Stack, Text } from '@chakra-ui/react';
import { usePostsQuery } from "../generated/graphql"
import { createUrqlClient } from "../utils/createUrqlClient"
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { DootSection } from "../components/DootSection";

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
    <Flex align="center">
      <Heading>LiReddit</Heading>
      <NextLink href="/create-post">
        <Link ml="auto">
          create post
        </Link>
      </NextLink>
    </Flex>

    <br />
    {!data
      ? <div>loading...</div>
      : (
        <Stack>
          {data!.posts.posts.map((p) =>( 
          // <div key={p.id}>{p.title}</div>
          <Flex key={p.id} p={5} shadow="md" borderWidth="1px">
            <DootSection post={p}/>
            <Box>
              <Heading fontSize="xl">{p.title}</Heading>
              <Text>posted by {p.creator.username}</Text>
              <Text mt={4}>{p.textSnippet}</Text>
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
