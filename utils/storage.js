import AsyncStorage from '@react-native-async-storage/async-storage';
import petsData from '../data/pets.json';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// 初始化全局數據（食物計數、玩具列表、金錢）
export const initGlobalData = async () => {
  const stored = await AsyncStorage.getItem('globalData');
  if (!stored) {
    const globalData = {
      catFoodCount: 5,
      dogFoodCount: 5,
      toys: [],
      money: 50,
    };
    await AsyncStorage.setItem('globalData', JSON.stringify(globalData));
  }
};

// 取得全局數據
export const getGlobalData = async () => {
  await initGlobalData();
  const stored = await AsyncStorage.getItem('globalData');
  return stored ? JSON.parse(stored) : { catFoodCount: 5, dogFoodCount: 5, toys: [], money: 50 };
};

// 更新全局數據
export const updateGlobalData = async (newData) => {
  const globalData = await getGlobalData();
  const updated = { ...globalData, ...newData };
  await AsyncStorage.setItem('globalData', JSON.stringify(updated));
};

// 初始化（第一次開 app）
export const initPets = async () => {
  const stored = await AsyncStorage.getItem('pets');
  if (!stored) {
    const initializedPets = petsData.map(pet => ({
      ...pet,
      level: pet.level || 1,
      rewards: pet.rewards || 0
    }));
    await AsyncStorage.setItem('pets', JSON.stringify(initializedPets));
  }
  await initGlobalData();
};

// 取得全部寵物
export const getPets = async () => {
  const stored = await AsyncStorage.getItem('pets');
  return stored ? JSON.parse(stored) : [];
};

// 更新單一寵物
export const updatePet = async (petId, newData) => {
  const pets = await getPets();
  const index = pets.findIndex(p => p.id === petId);

  if (index !== -1) {
    pets[index] = { ...pets[index], ...newData };
    await AsyncStorage.setItem('pets', JSON.stringify(pets));
  }
};
// 💡 核心：將 Firebase 的錢同步到本地 AsyncStorage
export const syncMoneyFromFirebase = async (deviceId) => {
  if (!deviceId) return;
  try {
    const profileRef = doc(db, 'profiles', deviceId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const firebaseMoney = profileSnap.data().money || 0;
      // 同步到本地 AsyncStorage
      await updateGlobalData({ money: firebaseMoney });
      return firebaseMoney;
    }
  } catch (e) {
    console.error("同步 Firebase 金錢失敗:", e);
  }
};
// 重置所有數據（用於測試）
export const resetAllData = async () => {
  await AsyncStorage.clear();
  await initPets();
  await initGlobalData();
};