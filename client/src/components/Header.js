import React from 'react';
import styled from 'styled-components';

const HeaderWrapper = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 16px;
  }

  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2em;
  font-weight: 700;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 1.6em;
  }

  @media (max-width: 480px) {
    font-size: 1.4em;
  }
`;

const Subtitle = styled.p`
  margin: 5px 0 0 0;
  font-size: 0.9em;
  opacity: 0.9;
  font-weight: 300;

  @media (max-width: 768px) {
    font-size: 0.85em;
  }

  @media (max-width: 480px) {
    font-size: 0.8em;
  }
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
