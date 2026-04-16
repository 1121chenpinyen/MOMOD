import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getUserId() {
  const deviceId = Constants.deviceId || Constants.installationId || 'unknown_device';
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (userId && userId.trim().length > 0) {
      return userId;
    }
    return deviceId;
  } catch {
    return deviceId;
  }
}
