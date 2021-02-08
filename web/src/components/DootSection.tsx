import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { Flex, IconButton } from '@chakra-ui/react';
import React, { useState } from 'react'
import { Post, PostSnippetFragment, PostsQuery, useVoteMutation, VoteMutationVariables } from '../generated/graphql';

interface DootSectionProps {
  // post: PostsQuery['posts']['posts'][0]
  post: PostSnippetFragment
}

export const DootSection: React.FC<DootSectionProps> = ({ post }) => {
  const [isLoading, setIsLoading] = useState<'updoot' |'downdoot' | null>(null)
  const [/* {fetching,operation} */,vote] = useVoteMutation()
  return (
    <Flex direction='column' justifyContent='center' alignItems='center' mr={4}>
      <IconButton
        aria-label="updoot post"
        name="chevron-up"
        // isDisabled ={post.voteStatus === 1}
        colorScheme={ post.voteStatus === 1 ? "green" : "teal"}
        isLoading={isLoading==='updoot'}
/*         isLoading={
          fetching &&
          (operation?.variables as VoteMutationVariables)?. value === 1
        } */
        onClick={async() => {
          if (post.voteStatus === 1) return null
          setIsLoading('updoot')
          await vote({
            postId: post.id,
            value:1
          })
          setIsLoading(null)
        }}
        icon={<ChevronUpIcon />}
      />
      {post.points}
      <IconButton
        aria-label="downdoot post"
        name="chevron-down"
        colorScheme={post.voteStatus === -1 ? "red" : "teal"}
        isLoading={isLoading==='downdoot'}
        // isDisabled ={post.voteStatus === -1}
/*         isLoading={
          fetching &&
          (operation?.variables as VoteMutationVariables)?. value === -1
        } */
        onClick={async() => {
          if (post.voteStatus === -1) return null
          setIsLoading('downdoot')
          await vote({
            postId: post.id,
            value:-1
          })
          setIsLoading(null)
        }}
        icon={<ChevronDownIcon />}
      />
    </Flex>
  );
}