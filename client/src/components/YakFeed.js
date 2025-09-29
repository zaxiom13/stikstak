import React from 'react';
import styled from 'styled-components';
import Yak from './Yak';

const FeedWrapper = styled.div`
  padding: 0 20px 20px 20px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;
`;

const EmptyIcon = styled.div`
  font-size: 4em;
  margin-bottom: 20px;
`;

const EmptyText = styled.p`
  font-size: 1.2em;
  margin: 0;
`;

const EmptySubtext = styled.p`
  font-size: 0.9em;
  margin: 10px 0 0 0;
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
