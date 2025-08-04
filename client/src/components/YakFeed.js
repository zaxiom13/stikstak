import React from 'react';
import styled from 'styled-components';
import Yak from './Yak';

const FeedWrapper = styled.div`
  padding: 20px;
`;

const YakFeed = ({ yaks }) => {
  return (
    <FeedWrapper>
      {yaks && yaks.map((yak) => (
        <Yak key={yak.id} yak={yak} />
      ))}
    </FeedWrapper>
  );
};

export default YakFeed;
