import { Box, Button } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import { NextPage } from 'next';
import router from 'next/router';
import React from 'react'
import { InputField } from '../../components/InputField';
import { Wrapper } from '../../components/Wrapper';
import { toErrorMap } from '../../utils/toErrorMap';
import login from '../login';

export const ChangePassword: NextPage<{token: string}> = ({}) => {
  return (
    <Wrapper variant='small'>
      <Formik
        initialValues={{ newPassword: '' }}
        onSubmit={async (values, { setErrors }) => {
/*           const response = await login(values)
          if (response.data?.login.errors){
            setErrors(toErrorMap(response.data.login.errors))
          } else if (response.data?.login.user){
            router.push('/')
          } */ //need to add this stuff
        }}>
        {({isSubmitting}) => (
          <Form>
            <Box mt={4}>
              <InputField
                name='newPassword'
                placeholder='new password'
                label='New Password'
                type='password'
              />
            </Box>
            <Button
              mt={4}
              type='submit'
              isLoading={isSubmitting}
              loadingText="Submitting"
              colorScheme="teal">
                change password
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
}

ChangePassword.getInitialProps = ({query}) => {
  return {
    token: query.token as string
  }
}

export default ChangePassword