import React from 'react';
import { Heading, Box } from '@chakra-ui/react';
import { withUrqlClient } from 'next-urql';
import { Layout } from '../../components/Layout';
import { createUrqlClient } from '../../utils/createUrqlClient';
import { useGetPostFromUrl } from '../../utils/useGetPostFromUrl';
import { EditDeletePostButtons } from '../../components/EditDeletePostButtons';


const Post = ({}) => {
  const [{data, error, fetching}] = useGetPostFromUrl()

  if(fetching) return <Layout><Box mb={4}> loading...</Box></Layout>
  if(error) return <Layout><Box mb={4}> error...</Box></Layout>
  if(!data?.post) return <Layout><Box mb={4}> couldn't find post...</Box></Layout>
  return (
    <Layout>
      <Heading mb={4}>{data.post.title}</Heading>
      <Box mb={4}>{data.post.text}</Box>
      <EditDeletePostButtons 
      id={data.post.id} 
      creatorId={data.post.creator.id}
      />
    </Layout>
  );
}

export default withUrqlClient(createUrqlClient, {ssr:true})(Post)