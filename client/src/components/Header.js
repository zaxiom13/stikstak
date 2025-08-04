import React from 'react';
import styled from 'styled-components';

const HeaderWrapper = styled.header`
  background-color: #282c34;
  padding: 20px;
  color: white;
  text-align: center;
`;

const Header = () => {
  return (
    <HeaderWrapper>
      <h1>YikYak</h1>
    </HeaderWrapper>
  );
};

export default Header;
