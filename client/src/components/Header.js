import React from 'react';
import styled from 'styled-components';

const HeaderWrapper = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2em;
  font-weight: 700;
  letter-spacing: 1px;
`;

const Subtitle = styled.p`
  margin: 5px 0 0 0;
  font-size: 0.9em;
  opacity: 0.9;
  font-weight: 300;
`;

const Header = () => {
  return (
    <HeaderWrapper>
      <Title>📍 YikYak Clone</Title>
      <Subtitle>Anonymous local chat • Peer-to-peer • Decentralized</Subtitle>
    </HeaderWrapper>
  );
};

export default Header;
