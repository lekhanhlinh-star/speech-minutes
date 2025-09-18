import React from "react";
import { Box, Heading, Text, Flex } from "@chakra-ui/react";
import { FaStickyNote } from 'react-icons/fa';

interface ResultProps {
  summary: any; // string or { summary, agendas, action_items }
}

export const Result: React.FC<ResultProps> = ({ summary }) => {
  const isObject = summary && typeof summary === 'object';
  const text = isObject ? (summary.summary || '') : (summary || '');
  const agendas = isObject && Array.isArray(summary.agendas) ? summary.agendas : [];
  const actions = isObject && Array.isArray(summary.action_items) ? summary.action_items : [];

  return (
    <Box maxW="lg" mx="auto" mt={12} p={8} bg="white" boxShadow="xl" rounded="lg">
      <Flex align="center" mb={4}>
        <Box color="teal.400" mr={3}><FaStickyNote /></Box>
        <Heading size="md" color="teal.500">Summarization Result</Heading>
      </Flex>

      {(!text || text.trim().length === 0) ? (
        <Text fontSize="md" color="gray.600">No summary available yet.</Text>
      ) : (
        <Text fontSize="md" color="gray.700">{text}</Text>
      )}

      {agendas.length > 0 && (
        <Box mt={4}>
          <Heading size="sm" mb={2} color="teal.500">Agendas</Heading>
          {agendas.map((a: any, i: number) => (
            <Text key={i} color="gray.700">- {a}</Text>
          ))}
        </Box>
      )}

      {actions.length > 0 && (
        <Box mt={4}>
          <Heading size="sm" mb={2} color="teal.500">Action Items</Heading>
          {actions.map((it: any, i: number) => (
            <Text key={i} color="gray.700">- {it}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Result;
