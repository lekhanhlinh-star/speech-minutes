import React from 'react';
import { Flex, Box, Heading, Spacer, Button } from '@chakra-ui/react';
import { ColorModeSwitcher } from './ColorModeSwitcher';
import { useNavigate } from 'react-router-dom';
import { FaMicrophone, FaSignOutAlt } from 'react-icons/fa';

const Header: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // perform any cleanup here if needed, then navigate to login
    navigate('/home');
  };

  return (
    <Flex as="header" w="100%" align="center" py={4} px={6} mb={6}>
      <Box display="flex" alignItems="center">
        <FaMicrophone style={{ marginRight: 8 }} />
        <Heading size="md" color="teal.500" as="span">Speech Minutes</Heading>
      </Box>
      <Spacer />
      <Box mr={4}>
        <ColorModeSwitcher />
      </Box>
      <Button variant="ghost" colorScheme="gray" onClick={handleLogout}>
        <FaSignOutAlt style={{ marginRight: 8 }} />Logout
      </Button>
    </Flex>
  );
};

export default Header;
