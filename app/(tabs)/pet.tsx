import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, DeviceEventEmitter, FlatList, Image, ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import ShopScreen from '../../components/shopscreen';
import { getDeviceId } from '../../utils/getDeviceId';
import { getGlobalData, getPets, initPets, updateGlobalData, updatePet } from '../../utils/storage';

// 靜態資源定義
const backgroundImage = require('../../assets/background/background.png');
const catFoodImage = require('../../assets/food/cat_food.png');
const dogFoodImage = require('../../assets/food/dog_food.png');
const catPetImage = require('../../assets/pets/cat.png');
const dogPetImage = require('../../assets/pets/dog.png');
const ballImage = require('../../assets/game/ball.png');
const frisbeeImage = require('../../assets/game/frisbee.png');
const yarnImage = require('../../assets/game/yarn.png');
const gameControllerIcon = require('../../assets/game/game_controller.png');
const switchIcon = require('../../assets/icon/switch.png');
const shopIcon = require('../../assets/icon/shop_logo.png');
const hungerHeartImages = [
  require('../../assets/heart/0.png'),
  require('../../assets/heart/0.5.png'),
  require('../../assets/heart/1.png'),
  require('../../assets/heart/1.5.png'),
  require('../../assets/heart/2.png'),
  require('../../assets/heart/2.5.png'),
  require('../../assets/heart/3.png'),
  require('../../assets/heart/3.5.png'),
  require('../../assets/heart/4.png'),
  require('../../assets/heart/4.5.png'),
  require('../../assets/heart/5.png'),
];

const getHungerHeartImage = (hunger) => {
  const index = Math.min(10, Math.max(0, Math.round((100 - hunger) / 10)));
  return hungerHeartImages[index];
};

export default function PetScreen() {
  const [deviceId, setDeviceId] = useState(null);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [pet, setPet] = useState(null);
  const [rewards, setRewards] = useState(0);
  const [level, setLevel] = useState(1);
  const [allPets, setAllPets] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [toyModalVisible, setToyModalVisible] = useState(false);
  const [selectedToy, setSelectedToy] = useState('球');
  const [globalData, setGlobalData] = useState(null);
  const [toys, setToys] = useState([]);
  const [shopVisible, setShopVisible] = useState(false);

  const petId = Number(id || '1');
  const mountedRef = useRef(true);

  // 取得裝置 ID
  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  // ✨ 核心功能：獨立的資料載入函式
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    await initPets();
    const pets = await getPets();
    setAllPets(pets);

    const found = pets.find(p => p.id === petId);
    if (found) {
      setPet(found);
      setLevel(found.level || 1);
      setRewards(found.rewards || 0);
    }

    // 獲取全局資料（錢、飼料）
    let gData = await getGlobalData();
    
    // Firebase 金錢同步
    if (deviceId) {
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../../config/firebaseConfig');
        const profileRef = doc(db, 'profiles', deviceId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const firebaseMoney = profileSnap.data().money || 0;
          if (firebaseMoney !== gData.money) {
            gData = { ...gData, money: firebaseMoney };
            await updateGlobalData({ money: firebaseMoney });
          }
        }
      } catch (error) {
        console.error("Pet 頁面同步失敗:", error);
      }
    }

    // 更新狀態，使用解構確保 React 重新渲染
    setGlobalData({ ...gData });
    setToys([...(gData.toys || [])]);
  }, [petId, deviceId]);

  // 🔥 進入頁面或切換 Tab 時執行
  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      loadData();
      return () => { mountedRef.current = false; };
    }, [loadData])
  );

  // 📢 新增：監聽來自商店或其他組件的更新訊號
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refreshFood', () => {
      console.log("收到商店更新訊號，重新刷新...");
      loadData();
    });

    return () => subscription.remove();
  }, [loadData]);

  const handlePetSelect = async (selectedPet) => {
    setModalVisible(false);
    setSelectedToy('球');
    router.replace({ pathname: '/pet', params: { id: selectedPet.id } });
  };

  const addRewards = async (amount) => {
    setRewards(prev => {
      let newRewards = prev + amount;
      const required = level * 100;
      if (newRewards >= required) {
        const newLevel = level + 1;
        setLevel(newLevel);
        updatePet(pet.id, { level: newLevel, rewards: newRewards - required });
        return newRewards - required;
      } else {
        updatePet(pet.id, { rewards: newRewards });
        return newRewards;
      }
    });
  };

  const feedPet = async () => {
    if (!pet || !globalData) return;
    const foodKey = pet.type === 'dog' ? 'dogFoodCount' : 'catFoodCount';
    const currentFoodCount = globalData[foodKey] || 0;

    if (currentFoodCount <= 0) {
      Alert.alert('飼料不足！');
      return;
    }

    const updated = {
      ...pet,
      hunger: Math.max(pet.hunger - 30, 0),
      happiness: Math.min(pet.happiness + 5, 100)
    };

    const newGlobalData = { ...globalData, [foodKey]: currentFoodCount - 1 };
    setPet(updated);
    await updatePet(pet.id, updated);
    await updateGlobalData(newGlobalData);
    setGlobalData(newGlobalData);
    addRewards(10);
  };

  const playWithPet = async () => {
    if (pet.hunger >= 100) {
      Alert.alert('太餓了！先餵食吧');
      return;
    }
    const updated = {
      ...pet,
      hunger: Math.min(pet.hunger + 10, 100),
      happiness: Math.min(pet.happiness + 10, 100)
    };
    setPet(updated);
    await updatePet(pet.id, updated);
    addRewards(10);
  };

  if (!pet || !globalData) return <Text style={{ marginTop: 50, textAlign: 'center' }}>Loading...</Text>;

  const maxExp = level * 100;
  const expPercent = (rewards / maxExp) * 100;
  const foodKey = pet.type === 'dog' ? 'dogFoodCount' : 'catFoodCount';
  const currentFoodCount = globalData[foodKey] || 0;
  const currentFoodImage = pet.type === 'dog' ? dogFoodImage : catFoodImage;
  const currentPetImage = pet.type === 'dog' ? dogPetImage : catPetImage;
  const hungerHeartImage = getHungerHeartImage(pet.hunger);

  return (
    <View style={styles.container}>
      {/* 左上角狀態 */}
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <View style={styles.levelRow}>
            <Text style={styles.statusLabel}>Lv.{level}</Text>
            <View style={styles.expBarBackground}>
              <View style={[styles.expBarFill, { width: `${expPercent}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.statusActions}>
          <Pressable style={styles.switchButton} onPress={() => setModalVisible(true)}>
            <Image source={switchIcon} style={styles.switch_icon} />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.shopButton} onPress={() => setShopVisible(true)}>
        <Image source={shopIcon} style={styles.shop_icon} />
      </Pressable>

      {/* 寵物顯示區域 */}
      <ImageBackground pointerEvents="box-none" source={backgroundImage} style={styles.petContainer} imageStyle={styles.petBackgroundImage}>
        <View style={styles.petContent} pointerEvents="box-none">
          <View style={styles.hungerBar}>
            <Image source={hungerHeartImage} style={styles.hungerHeart} />
          </View>
          <Image 
            source={currentPetImage} 
            style={{
              width: pet.type === 'dog' ? 200 : 190,
              height: pet.type === 'dog' ? 200 : 190,
              resizeMode: 'contain',
              marginTop: 20, 
            }} 
          />
          <Text style={styles.petName}>{pet.name}</Text>
        </View>
      </ImageBackground>
      
      <Pressable style={styles.topLeftPlayButton} onPress={playWithPet}>
        <Image
          source={toys.find(t => t.name === selectedToy)?.image || ballImage}
          style={styles.toy_switch_icon}
        />
      </Pressable>

      {/* 底部動作欄 */}
      <View style={styles.footer}>
        <View style={styles.buttonContainer}>
          <View style={styles.food_actionRow}>
            <Pressable style={styles.actionButton} onPress={feedPet}>
              <Image source={currentFoodImage} style={styles.food_switch_icon} />
              <Text style={styles.foodCountLabel}>{currentFoodCount}</Text>
            </Pressable>
          </View>

          <View style={styles.toy_actionRow}>
            <Pressable style={styles.controllerButton} onPress={() => setToyModalVisible(true)}>
              <Image source={gameControllerIcon} style={styles.gameControllerIcon} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* 寵物切換 Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>選擇要切換的寵物</Text>
            <FlatList
              data={allPets}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const fKey = item.type === 'dog' ? 'dogFoodCount' : 'catFoodCount';
                const itemFoodCount = globalData[fKey] || 0;
                return (
                  <Pressable
                    style={[styles.petItem, item.id === pet.id && styles.selectedPetItem]}
                    onPress={() => handlePetSelect(item)}
                  >
                    <Text style={styles.petItemText}>{item.name}</Text>
                    <Text style={styles.petItemText}>飢餓 {item.hunger} / 食 {itemFoodCount}</Text>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.petList}
            />
            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 玩具選擇 Modal */}
      <Modal visible={toyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>選擇玩具</Text>
            {(() => {
              const compatibleToys = toys.filter(item => {
                return item.name === '球' || 
                  (item.name === '飛盤' && pet.type === 'dog') || 
                  (item.name === '毛線' && pet.type === 'cat');
              });
              return compatibleToys.length > 0 ? (
                <FlatList
                  data={compatibleToys}
                  horizontal
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.foodItem, selectedToy === item.name && styles.selectedFoodItem]}
                      onPress={() => {
                        setSelectedToy(item.name);
                        setToyModalVisible(false);
                      }}
                    >
                      <Image source={item.image} style={styles.foodImage} />
                      <Text style={styles.foodName}>{item.name}</Text>
                    </Pressable>
                  )}
                  contentContainerStyle={styles.foodListContent}
                  showsHorizontalScrollIndicator={false}
                />
              ) : (
                <View style={styles.noToysContainer}>
                  <Text style={styles.noToysText}>沒有適用的玩具</Text>
                  <Pressable 
                    style={styles.goToShopButton} 
                    onPress={() => { 
                      setToyModalVisible(false);
                      setTimeout(() => setShopVisible(true), 300);
                    }}
                  >
                    <Text style={styles.goToShopText}>前往商店</Text>
                  </Pressable>
                </View>
              );
            })()}
            <Pressable style={styles.closeButton} onPress={() => setToyModalVisible(false)}>
              <Text style={styles.closeButtonText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 商店組件：關閉時主動呼叫 loadData 以防萬一 */}
      <ShopScreen 
        visible={shopVisible} 
        onClose={() => {
          setShopVisible(false);
          loadData(); 
        }} 
        petId={petId} 
        deviceId={deviceId}
      />
    </View>
  );
}

// Styles 部分保持不變...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D0E7EF', flexDirection: 'column' },
  statusContainer: { position: 'absolute', top: 20, left: 20, flexDirection: 'column', gap: 15, zIndex: 1, paddingTop: 45 },
  statusItem: { backgroundColor: '#fcd5b0', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 12, minWidth: 240, borderWidth: 2, borderColor: '#ffc38ad2' },
  statusLabel: { fontSize: 35, fontWeight: 'bold', color: '#333' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expBarBackground: { width: 150, height: 6, backgroundColor: '#ddd', borderRadius: 10, overflow: 'hidden' },
  expBarFill: { height: '100%', backgroundColor: '#ca823ed2' },
  shop_icon: { width: 70, height: 70, resizeMode: 'contain' },
  statusActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  switch_icon: { backgroundColor: '#fff', borderRadius: 20, padding: 10, width: 40, height: 40, resizeMode: 'contain' },
  shopButton: { padding: 8, borderRadius: 20, right: 10, top: 150, position: 'absolute', zIndex: 1 },
  petContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingBottom: 100 },
  petContent: { justifyContent: 'center', alignItems: 'center' },
  petBackgroundImage: { resizeMode: 'cover' },
  petName: { fontSize: 24, fontWeight: 'bold', color: '#333', top: 50 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  buttonContainer: { flexDirection: 'column', gap: 10 },
  foodCountLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: -25 },
  food_actionRow: { flexDirection: 'row', alignItems: 'center' },
  toy_actionRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  topLeftPlayButton: { position: 'absolute', top: 350, left: 20, width: 100, height: 100, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  gameControllerIcon: { top: 40, width: 150, height: 150, resizeMode: 'contain', left: 100 },
  actionButton: { minWidth: 120, maxWidth: 150, alignItems: 'center', justifyContent: 'center', top: 30 },
  hungerBar: { alignItems: 'center', marginBottom: -90, zIndex: 10 },
  hungerHeart: { width: 600, height: 180, resizeMode: 'contain' },
  foodListContent: { paddingHorizontal: 10, paddingVertical: 15, gap: 12 },
  foodItem: { width: 120, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#ddd' },
  selectedFoodItem: { borderColor: '#C2C3E7', backgroundColor: '#dfe6e9' },
  foodImage: { width: 70, height: 70, resizeMode: 'contain', marginBottom: 8 },
  foodName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  petList: { paddingBottom: 20 },
  petItem: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginBottom: 12, backgroundColor: '#f8f9fa' },
  selectedPetItem: { borderColor: '#C2C3E7', backgroundColor: '#dfe6e9' },
  petItemText: { fontSize: 16, color: '#333' },
  closeButton: { marginTop: 10, padding: 15, backgroundColor: '#e76a6a', borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  noToysContainer: { alignItems: 'center', paddingVertical: 20 },
  noToysText: { fontSize: 18, color: '#666', marginBottom: 20 },
  goToShopButton: { backgroundColor: '#76B8D0', padding: 15, borderRadius: 12, alignItems: 'center' },
  goToShopText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  food_switch_icon: { width: 110, height: 110, resizeMode: 'contain' },
  toy_switch_icon: { width: 100, height: 100, resizeMode: 'contain' },
  switchButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 },
  controllerButton: { paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
});