import React from 'react';
import styled from 'styled-components';

const YakWrapper = styled.div`
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const YakContent = styled.p`
  font-size: 1.1em;
  line-height: 1.5;
  margin: 0;
  color: #333;
`;

const YakMeta = styled.div`
  font-size: 0.85em;
  color: #888;
  margin-top: 8px;
`;

const YakActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
`;

const VoteSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const VoteButton = styled.button`
  background: ${props => props.active ? '#4CAF50' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border: 1px solid ${props => props.active ? '#4CAF50' : '#ccc'};
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 1.1em;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#45a049' : '#f5f5f5'};
    border-color: #4CAF50;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Score = styled.span`
  font-weight: bold;
  font-size: 1.1em;
  color: ${props => props.score > 0 ? '#4CAF50' : props.score < 0 ? '#f44336' : '#666'};
  min-width: 30px;
  text-align: center;
`;

const TimeAgo = styled.span`
  color: #999;
`;

const getTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const Yak = ({ yak, onVote, currentUserId }) => {
  const userVote = yak.votes?.[currentUserId];

  return (
    <YakWrapper>
      <YakContent>{yak.text}</YakContent>
      <YakMeta>
        <TimeAgo>{getTimeAgo(yak.timestamp)}</TimeAgo>
      </YakMeta>
      <YakActions>
        <VoteSection>
          <VoteButton 
            active={userVote === 'up'}
            onClick={() => onVote(yak.id, 'up')}
            title="Upvote"
          >
            ▲
          </VoteButton>
          <Score score={yak.score || 0}>{yak.score || 0}</Score>
          <VoteButton 
            active={userVote === 'down'}
            onClick={() => onVote(yak.id, 'down')}
            title="Downvote"
          >
            ▼
          </VoteButton>
        </VoteSection>
      </YakActions>
    </YakWrapper>
  );
};

export default Yak;
