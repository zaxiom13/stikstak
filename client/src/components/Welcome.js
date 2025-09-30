import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  margin: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    padding: 24px;
    margin: 15px;
    max-width: calc(100vw - 30px);
  }

  @media (max-width: 480px) {
    padding: 20px;
    margin: 10px;
    max-width: calc(100vw - 20px);
    border-radius: 10px;
  }
`;

const Title = styled.h2`
  margin: 0 0 20px 0;
  font-size: 1.8em;
  color: #333;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.6em;
    margin-bottom: 16px;
  }

  @media (max-width: 480px) {
    font-size: 1.4em;
    margin-bottom: 12px;
  }
`;

const Icon = styled.div`
  font-size: 3em;
  text-align: center;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    font-size: 2.5em;
    margin-bottom: 16px;
  }

  @media (max-width: 480px) {
    font-size: 2em;
    margin-bottom: 12px;
  }
`;

const Section = styled.div`
  margin-bottom: 20px;

  @media (max-width: 768px) {
    margin-bottom: 16px;
  }

  @media (max-width: 480px) {
    margin-bottom: 12px;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.1em;
  color: #667eea;
  margin: 0 0 10px 0;

  @media (max-width: 480px) {
    font-size: 1.05em;
    margin-bottom: 8px;
  }
`;

const Text = styled.p`
  line-height: 1.6;
  color: #555;
  margin: 0 0 10px 0;

  @media (max-width: 480px) {
    font-size: 0.95em;
    line-height: 1.5;
  }
`;

const List = styled.ul`
  margin: 10px 0;
  padding-left: 20px;
  color: #555;
  line-height: 1.8;

  @media (max-width: 480px) {
    font-size: 0.95em;
    line-height: 1.6;
    padding-left: 16px;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 10px;
  transition: transform 0.2s;
  min-height: 48px;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    font-size: 1.05em;
    padding: 12px 24px;
  }

  @media (max-width: 480px) {
    font-size: 1em;
    padding: 12px 20px;
    min-height: 44px;
  }
`;

const SmallText = styled.p`
  font-size: 0.85em;
  color: #888;
  text-align: center;
  margin-top: 15px;

  @media (max-width: 480px) {
    font-size: 0.8em;
    margin-top: 12px;
  }
`;

const Welcome = ({ onClose }) => {
  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Icon>📍</Icon>
        <Title>Welcome to YikYak Clone!</Title>
        
        <Section>
          <SectionTitle>🔒 Decentralized & Private</SectionTitle>
          <Text>
            This app uses peer-to-peer (P2P) technology. No central server stores your data. 
            Messages are shared directly between users in your local area.
          </Text>
        </Section>

        <Section>
          <SectionTitle>🌍 Location-Based</SectionTitle>
          <Text>
            You'll see and share posts with people in your geographic zone. 
            The app will ask for location permission to connect you with nearby users.
          </Text>
        </Section>

        <Section>
          <SectionTitle>✨ Features</SectionTitle>
          <List>
            <li>Post anonymous messages (yaks) to your local area</li>
            <li>Upvote/downvote posts from others</li>
            <li>All data syncs via P2P mesh network</li>
            <li>Posts expire after 24 hours</li>
          </List>
        </Section>

        <Section>
          <SectionTitle>⚠️ Important</SectionTitle>
          <Text>
            • Be respectful and follow community guidelines<br/>
            • Your posts are visible to others in your area<br/>
            • The app works best with multiple users nearby
          </Text>
        </Section>

        <Button onClick={onClose}>Get Started</Button>
        
        <SmallText>
          By continuing, you agree to use this app responsibly
        </SmallText>
      </Modal>
    </Overlay>
  );
};

export default Welcome;