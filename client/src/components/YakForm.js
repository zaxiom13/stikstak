import React, { useState } from 'react';
import styled from 'styled-components';

const FormWrapper = styled.div`
  padding: 20px;
  background-color: #f0f2f5;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
  resize: none;
`;

const SubmitButton = styled.button`
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  float: right;
`;

const YakForm = ({ onSubmit }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <FormWrapper>
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind?"
      />
      <SubmitButton onClick={handleSubmit}>
        Yak
      </SubmitButton>
    </FormWrapper>
  );
};

export default YakForm;
