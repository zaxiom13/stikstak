import React from 'react';
import styled from 'styled-components';

const YakWrapper = styled.div`
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 5px;
  background-color: white;
`;

const YakContent = styled.p`
  font-size: 1.2em;
`;

const YakActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
`;

const VoteButton = styled.button`
  background: none;
  border: 1px solid #ccc;
  padding: 5px 10px;
  cursor: pointer;
`;

const Yak = ({ yak }) => {
  return (
    <YakWrapper>
      <YakContent>{yak.text}</YakContent>
      <YakActions>
        <div>
          <VoteButton>▲</VoteButton>
          <span>{yak.score}</span>
          <VoteButton>▼</VoteButton>
        </div>
        <button>Reply</button>
      </YakActions>
    </YakWrapper>
  );
};

export default Yak;
