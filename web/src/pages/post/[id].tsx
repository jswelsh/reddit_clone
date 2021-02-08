import { Heading, Box } from '@chakra-ui/react';
import { withUrqlClient } from 'next-urql';
import { useRouter } from 'next/router';
import React from 'react';
import { Layout } from '../../components/Layout';
import { usePostQuery } from '../../generated/graphql';
import { createUrqlClient } from '../../utils/createUrqlClient';


const Post = ({}) => {
  const router = useRouter()
  const intId = typeof router.query.id === 'string' ? parseInt(router.query.id) : -1
  const [{data, error, fetching}] = usePostQuery({
    pause: intId === -1,
    variables: {
      id: intId
    }
  })

  if(fetching) return <Layout><Box mb={4}> loading...</Box></Layout>
  if(error) return <Layout><Box mb={4}> error...</Box></Layout>
  if(!data?.post) return <Layout><Box mb={4}> couldn't find post...</Box></Layout>
  return (
    <Layout>
      <Heading mb={4}>{data.post.title}</Heading>
      <Box mb={4}>{data.post.text}</Box>
{/*       <EditDeletePostButtons
        id={data.post.id}
        creatorId={data.post.creator.id}
      /> */}
    </Layout>
  );
}

export default withUrqlClient(createUrqlClient, {ssr:true})(Post)