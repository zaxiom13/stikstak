import React from 'react';
import styled from 'styled-components';
import Yak from './Yak';

const FeedWrapper = styled.div`
  padding: 0 20px 20px 20px;

  @media (max-width: 768px) {
    padding: 0 15px 15px 15px;
  }

  @media (max-width: 480px) {
    padding: 0 10px 10px 10px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;

  @media (max-width: 768px) {
    padding: 40px 20px;
  }

  @media (max-width: 480px) {
    padding: 30px 15px;
  }
`;

const EmptyIcon = styled.div`
  font-size: 4em;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    font-size: 3.5em;
    margin-bottom: 16px;
  }

  @media (max-width: 480px) {
    font-size: 3em;
    margin-bottom: 12px;
  }
`;

const EmptyText = styled.p`
  font-size: 1.2em;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.1em;
  }

  @media (max-width: 480px) {
    font-size: 1em;
  }
`;

const EmptySubtext = styled.p`
  font-size: 0.9em;
  margin: 10px 0 0 0;

  @media (max-width: 480px) {
    font-size: 0.85em;
  }
`;

const YakFeed = ({ yaks, onVote, currentUserId }) => {
  if (!yaks || yaks.length === 0) {
    return (
      <FeedWrapper>
        <EmptyState>
          <EmptyIcon>💬</EmptyIcon>
          <EmptyText>No yaks yet in your area</EmptyText>
          <EmptySubtext>Be the first to post something!</EmptySubtext>
        </EmptyState>
      </FeedWrapper>
    );
  }

  // Sort yaks by score (highest first), then by timestamp (newest first)
  const sortedYaks = [...yaks].sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.timestamp - a.timestamp;
  });

  return (
    <FeedWrapper>
      {sortedYaks.map((yak) => (
        <Yak key={yak.id} yak={yak} onVote={onVote} currentUserId={currentUserId} />
      ))}
    </FeedWrapper>
  );
};

export default YakFeed;
