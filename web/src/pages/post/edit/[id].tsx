import React from 'react'
import { withUrqlClient } from 'next-urql';
import { createUrqlClient } from '../../../utils/createUrqlClient';
import { Layout } from '../../../components/Layout';
import { Form, Formik } from 'formik';
import { Box, Button } from '@chakra-ui/react';
import { InputField } from '../../../components/InputField';
import { usePostQuery, useUpdatePostMutation } from '../../../generated/graphql';
import { useGetIntId } from '../../../utils/useGetIntId';
import { useRouter } from 'next/router';


const EditPost = ({}) => {
  const router = useRouter()
  const intId = useGetIntId()
  const [{data, error, fetching}] = usePostQuery({
    pause: intId === -1,
    variables: {
      id: intId
    }
  })
  const [,updatePost] = useUpdatePostMutation()
  if(fetching) return <Layout><Box mb={4}> loading...</Box></Layout>
  if(error) return <Layout><Box mb={4}> error...</Box></Layout>
  if(!data?.post) return <Layout><Box mb={4}> couldn't find post...</Box></Layout>
  return (
  <Layout variant="small">
    <Formik
      initialValues={{title: data.post.title, text: data.post.text}}
      onSubmit={async (values/* , { setErrors } */) => {
        // const {error} = await createPost({input:values})
        // if (!error) {
        //   router.push('/')
        // }
        // //need to add validation
        await updatePost({id: intId, ...values})
        router.back()/* push('/') */
      }}>
      {({isSubmitting}) => (
        <Form>
          <InputField
            name='title'
            placeholder='title'
            label='Title'
          />
          <Box mt={4}>
            <InputField
              textarea
              name='text'
              placeholder='text...'
              label='Body'
            />
          </Box>
          <Button
            mt={4}
            type='submit'
            isLoading={isSubmitting}
            loadingText="Submitting"
            colorScheme="teal">
              update post
          </Button>
        </Form>
      )}
    </Formik>
  </Layout>);
}

export default withUrqlClient(createUrqlClient)(EditPost)
