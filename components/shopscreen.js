import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Image, FlatList, Modal } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getPets, updatePet, getGlobalData, updateGlobalData } from '../utils/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// 靜態資源定義
const catFoodImage = require('../assets/food/cat_food.png');
const dogFoodImage = require('../assets/food/dog_food.png');
const ballImage = require('../assets/game/ball.png');
const frisbeeImage = require('../assets/game/frisbee.png');
const yarnImage = require('../assets/game/yarn.png');

export default function ShopScreen({ visible, onClose, petId, deviceId }) {
  const router = useRouter();
  

  const [pet, setPet] = useState(null);
  const [globalData, setGlobalData] = useState(null);

  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const mountedRef = useRef(true);

  const items = [
    { id: 1, name: '貓飼料', price: 15, category: 'food', image: catFoodImage, foodType: 'cat' },
    { id: 2, name: '狗飼料', price: 15, category: 'food', image: dogFoodImage, foodType: 'dog' },
    { id: 3, name: '球', price: 800, category: 'toy', image: ballImage, compatibleTypes: ['cat', 'dog'] },
    { id: 4, name: '飛盤', price: 550, category: 'toy', image: frisbeeImage, compatibleTypes: ['dog'] },
    { id: 5, name: '毛線', price: 550, category: 'toy', image: yarnImage, compatibleTypes: ['cat'] },
  ];

  useEffect(() => { if(visible) {
      mountedRef.current = true;
      const load = async () => {
        const pets = await getPets();
        const found = pets.find(p => p.id === Number(petId));
        if (found && mountedRef.current) {
          setPet(found);
        }
        const gData = await getGlobalData();
        if (mountedRef.current) {
          setGlobalData(gData);
        }
      };
      load();

      return () => {
        mountedRef.current = false;
      };
    } }, [visible, petId]);

  const buyItem = async (item) => {
    if (!globalData) return;

    // 檢查是否已經購買過玩具
    if (item.category === 'toy') {
      const isPurchased = globalData.toys && globalData.toys.some(t => t.name === item.name);
      if (isPurchased) {
        Alert.alert('已經購買過這個玩具了');
        return;
      }
    }

    setSelectedItem(item);
    setQuantity(1);
    setQuantityModalVisible(true);
  };

  const confirmPurchase = async () => {
    if (!selectedItem || !globalData) return;

    const qty = quantity;
    if (qty <= 0) {
      Alert.alert('請選擇有效的數量');
      return;
    }

    const totalPrice = selectedItem.price * qty;
    if (globalData.money < totalPrice) {
      Alert.alert('錢不夠');
      return;
    }

    // 💡 計算扣錢後的新餘額
    const newMoneyBalance = globalData.money - totalPrice;

    // 💡 同步更新 Firebase (雲端大帳本)
    // 假設你的 deviceId 已經透過 props 或 context 傳入此組件
    try {
      const profileRef = doc(db, 'profiles', deviceId); 
      await updateDoc(profileRef, { money: newMoneyBalance });
    } catch (error) {
      console.error("雲端金錢同步失敗:", error);
      // 這裡可以選擇是否要 Alert 告知使用者網路異常
    }

    if (selectedItem.category === 'food') {
      const foodKey = selectedItem.foodType === 'cat' ? 'catFoodCount' : 'dogFoodCount';
      const currentCount = globalData[foodKey] || 0;
      if (currentCount + qty > 999) {
        Alert.alert('飼料數量不能超過999個');
        return;
      }

      const newGlobalData = {
        ...globalData,
        money: newMoneyBalance, // ✅ 使用新餘額
        [foodKey]: currentCount + qty
      };

      await updateGlobalData(newGlobalData);
      if (mountedRef.current) {
        setGlobalData(newGlobalData);
      }
      Alert.alert(`購買成功！獲得 ${qty} 個${selectedItem.name}`);
    } else if (selectedItem.category === 'toy') {
      const newGlobalData = {
        ...globalData,
        money: newMoneyBalance, // ✅ 使用新餘額
        toys: [...(globalData.toys || []), { name: selectedItem.name.trim(), image: selectedItem.image }]
      };

      await updateGlobalData(newGlobalData);
      if (mountedRef.current) {
        setGlobalData(newGlobalData);
      }
      Alert.alert(`購買成功！獲得 ${selectedItem.name}`);
    }

    setQuantityModalVisible(false);
    setSelectedItem(null);
  };

  const earnMoney = async () => {
    const newGlobalData = {
      ...globalData,
      money: globalData.money + 1000
    };

    await updateGlobalData(newGlobalData);
    if (mountedRef.current) {
      setGlobalData(newGlobalData);
    }
  };

  if (!pet || !globalData) return null;

  const foodItems = items.filter(item => item.category === 'food');
  const toyItems = items.filter(item => item.category === 'toy');

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={false} // 確保全螢幕不透明
      onRequestClose={onClose}
    >
      {/* 1. 最外層 View：負責全螢幕背景與安全區域 */}
      <View style={styles.fullScreenContainer}> 
        
        {/* 2. 單層 ScrollView：負責處理內容過長時的滑動 */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent} // 這裡放 Padding
          showsVerticalScrollIndicator={false}
        >
          {/* --- 商店標題 --- */}
          <View style={styles.header}>
            <Text style={styles.title}>商店</Text>
            <Text style={styles.money}>💰 {globalData.money}</Text>
          </View>

          {/* --- 食物區塊 --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>食物 🍖</Text>
            <FlatList
              horizontal
              data={foodItems}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable style={styles.itemCard} onPress={() => buyItem(item)}>
                  <Image source={item.image} style={styles.itemImage} />
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={[styles.itemPrice, { color: globalData.money >= item.price ? 'black' : '#ff6b6b' }]}>
                    {item.price}$
                  </Text>
                </Pressable>
              )}
              contentContainerStyle={styles.listContent}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {/* --- 玩具區塊 --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>玩具 🎮</Text>
            <FlatList
              horizontal
              data={toyItems}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isPurchased = globalData.toys && globalData.toys.some(t => t.name === item.name);
                return (
                  <Pressable 
                    style={[styles.itemCard, isPurchased && styles.purchasedCard]} 
                    onPress={isPurchased ? null : () => buyItem(item)}
                    disabled={isPurchased}
                  >
                    <Image source={item.image} style={[styles.itemImage, isPurchased && styles.purchasedImage]} />
                    <Text style={[styles.itemName, isPurchased && styles.purchasedText]}>
                      {isPurchased ? '已購買' : item.name}
                    </Text>
                    <Text style={[styles.itemPrice, { color: globalData.money >= item.price ? 'black' : '#ff6b6b' }]}>
                      {item.price}$
                    </Text>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.listContent}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {/* --- 操作按鈕 --- */}
          <View style={styles.actionContainer}>
            

            <Pressable style={styles.backButton} onPress={onClose}>
              <Text style={styles.backText}>返回</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* 數量輸入 Modal (維持獨立，不放在 ScrollView 裡) */}
         <Modal visible={quantityModalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>
                    購買 {selectedItem?.name}
                  </Text>
                 
                  {selectedItem?.category === 'food' ? (
                    <View style={styles.quantityContainer}>
                      <Text style={styles.quantityLabel}>數量選擇</Text>
                      <View style={styles.quantityControlContainer}>
                        <Pressable
                          style={styles.minusButton}
                          onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          <Text style={styles.buttonText}>−</Text>
                        </Pressable>
                        <Slider
                          style={styles.slider}
                          minimumValue={1}
                          maximumValue={999}
                          step={1}
                          value={quantity}
                          onValueChange={setQuantity}
                        />
                        <Pressable
                          style={styles.plusButton}
                          onPress={() => setQuantity(Math.min(999, quantity + 1))}
                        >
                          <Text style={styles.buttonText}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.quantityDisplay}>{quantity} 個</Text>
                      <Text style={styles.maxQuantityText}>
                        當前: {selectedItem?.foodType === 'cat' ? (globalData?.catFoodCount || 0) : (globalData?.dogFoodCount || 0)} 個
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.quantityContainer}>
                      <Text style={styles.quantityLabel}>玩具只能購買一次</Text>
                      <Text style={styles.selectedQuantity}>數量: 1</Text>
                    </View>
                  )}

                  <View style={styles.totalContainer}>
                    <Text style={styles.totalText}>
                      總價: {selectedItem ? (parseInt(quantity) || 0) * selectedItem.price : 0} 金幣
                    </Text>
                  </View>

                  <View style={styles.modalButtons}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => setQuantityModalVisible(false)}
                    >
                      <Text style={styles.cancelText}>取消</Text>
                    </Pressable>
                    <Pressable
                      style={styles.confirmButton}
                      onPress={confirmPurchase}
                    >
                      <Text style={styles.confirmText}>確認購買</Text>
                    </Pressable>
                  </View>
                </View>
            </View>
          </Modal>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1, 
    backgroundColor: '#f0f8ff', // 全螢幕背景色
    paddingTop: 100,           // 避免內容頂到手機狀態欄
  },
  scrollContent: {
    paddingBottom: 40,        // 確保底部按鈕不會緊貼邊緣
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    paddingTop: 80,           // 避免內容頂到手機狀態欄
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  money: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  itemCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 10,
  },
  earnButton: {
    padding: 15,
    backgroundColor: '#f39c12',
    borderRadius: 10,
    alignItems: 'center',
  },
  earnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    padding: 15,
    backgroundColor: '#3498db',
    borderRadius: 10,
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  purchasedCard: {
    opacity: 0.5,
  },
  purchasedImage: {
    opacity: 0.5,
  },
  purchasedText: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  quantityContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
    fontWeight: 'bold',
  },
  quantityControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    gap: 12,
  },
  minusButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  quantityDisplay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  totalContainer: {
    marginBottom: 20,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#95a5a6',
    borderRadius: 10,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#27ae60',
    borderRadius: 10,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});