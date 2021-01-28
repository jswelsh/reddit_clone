/* import { FormControl, FormLabel, Input, FormErrorMessage } from '@chakra-ui/react';
import { useField } from 'formik';
import React from 'react'

interface InputFieldProps {

}

export const InputField: React.FC<InputFieldProps> = ({}) => {
  const [] = useField()
  return (
  <FormControl isInvalid={form.errors.name && form.touched.name}>
    <FormLabel htmlFor="name">First name</FormLabel>
    <Input {...field} id="name" placeholder="name" />
    <FormErrorMessage>{form.errors.name}</FormErrorMessage>
  </FormControl>
  );
} */

/* 
const TextField = (props: FieldHookConfig<string>) => {
  const [field] = useField(props);
  return (
    <div>
      // no need to pass the name field because Formik will accept
      //that prop internally and pass it to the field variable 
      <input {...field} placeholder={props.placeholder} type={props.type} />
    </div>
    );
};
*/

import React, { InputHTMLAttributes } from "react";
import { useField } from "formik";
import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
} from "@chakra-ui/react";

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
};

// '' => false
// 'error message stuff' => true

export const InputField: React.FC<InputFieldProps> = ({
  label,
  size:_,
  ...props
}) => {
  const [field, { error }] = useField(props);

  console.log(error, 'ggooo')
  return (
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <Input
        {...field}
        {...props}
        id={field.name}
        placeholder={props.placeholder}
      />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
};