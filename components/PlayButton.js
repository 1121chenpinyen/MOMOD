import React from 'react';
import { Button } from 'react-native';

export default function PlayButton({ onPress }) {
  return <Button title="玩耍" onPress={onPress} color="#1e90ff" />;
}