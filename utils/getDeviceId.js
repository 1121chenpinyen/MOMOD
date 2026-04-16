import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export async function getDeviceId() {
  let id = await AsyncStorage.getItem('deviceId');
  if (!id) {
    const bytes = await Crypto.getRandomBytesAsync(16);
    id = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    await AsyncStorage.setItem('deviceId', id);
  }
  return id;
}
