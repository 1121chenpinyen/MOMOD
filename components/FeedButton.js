import React from 'react';
import { Button } from 'react-native';

export default function FeedButton({ onPress }) {
  return <Button title="餵食" onPress={onPress} color="#ff6347" />;
}