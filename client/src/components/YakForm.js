import React, { useState } from 'react';
import styled from 'styled-components';

const FormWrapper = styled.div`
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  margin: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 100px;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid ${props => props.error ? '#f44336' : '#ddd'};
  resize: none;
  font-size: 1em;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4CAF50;
  }

  &::placeholder {
    color: #999;
  }
`;

const BottomRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
`;

const CharCount = styled.span`
  font-size: 0.9em;
  color: ${props => props.warning ? '#f44336' : '#666'};
`;

const SubmitButton = styled.button`
  background-color: ${props => props.disabled ? '#ccc' : '#4CAF50'};
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 1em;
  font-weight: 600;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.disabled ? '#ccc' : '#45a049'};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'scale(0.98)'};
  }
`;

const MAX_LENGTH = 200;

const YakForm = ({ onSubmit }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      return;
    }
    onSubmit(trimmed);
    setText('');
    setError(false);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    setError(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const isDisabled = !text.trim() || isOverLimit;

  return (
    <FormWrapper>
      <TextArea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="What's happening in your area? (Ctrl+Enter to post)"
        error={error || isOverLimit}
        maxLength={MAX_LENGTH + 50}
      />
      <BottomRow>
        <CharCount warning={isOverLimit}>
          {charCount}/{MAX_LENGTH}
        </CharCount>
        <SubmitButton onClick={handleSubmit} disabled={isDisabled}>
          Post Yak
        </SubmitButton>
      </BottomRow>
    </FormWrapper>
  );
};

export default YakForm;
