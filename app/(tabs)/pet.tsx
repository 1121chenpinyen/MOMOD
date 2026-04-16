import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, ImageBackground, StyleSheet, Pressable, Alert, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { initPets, getPets, updatePet, getGlobalData, updateGlobalData } from '../../utils/storage';
import ShopScreen from '../../components/shopscreen';
import { getDeviceId } from '../../utils/getDeviceId'; // 💡 確保路徑正確

// 靜態資源定義，讓 bundler 能正確識別
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
const gameIcon = require('../../assets/icon/game.png');
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

  const petId = Number(id || '1');
  const mountedRef = useRef(true);
  const [shopVisible, setShopVisible] = useState(false);

  // 💡 新增：元件掛載時取得裝置 ID
  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  // 🔥 載入該寵物資料，每次回到畫面時更新
  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      const load = async () => {
        await initPets();
        const pets = await getPets();
        if (!mountedRef.current) return;
        setAllPets(pets);

        const found = pets.find(p => p.id === petId);
        if (found) {
          if (!mountedRef.current) return;
          setPet(found);
          setLevel(found.level || 1);
          setRewards(found.rewards || 0);

          // 🔥 根據寵物類型設置可用飼料
          const petType = found.type;
          if (petType === 'dog') {
            // dog uses dog food
          } else {
            // cat uses cat food
          }
        }

        // 🔥 獲取全局飼料計數和玩具列表
        let gData = await getGlobalData();
        
        // ------------------ 💡 新增：Firebase 金錢同步 ------------------
        // 確保 deviceId 存在才進行雲端抓取
        if (deviceId) {
          try {
            const { doc, getDoc } = require('firebase/firestore');
            const { db } = require('../../config/firebaseConfig');
            
            const profileRef = doc(db, 'profiles', deviceId);
            const profileSnap = await getDoc(profileRef);
            
            if (profileSnap.exists()) {
              const firebaseMoney = profileSnap.data().money || 0;
              // 如果雲端金額跟本地不同，以雲端為主並更新本地暫存
              if (firebaseMoney !== gData.money) {
                gData = { ...gData, money: firebaseMoney };
                await updateGlobalData({ money: firebaseMoney });
              }
            }
          } catch (error) {
            console.error("Pet 頁面同步金錢失敗:", error);
          }
        }
        // --------------------------------------------------------------

        if (!mountedRef.current) return;
        setGlobalData(gData);
        setToys(gData.toys || []);
      };
      load();

      return () => {
        mountedRef.current = false;
      };
    }, [petId, deviceId]) // 💡 注意：加上 deviceId 作為依賴，確保 ID 拿到時會觸發同步
  );

  const handlePetSelect = async (selectedPet) => {
    if (!mountedRef.current) return;
    setModalVisible(false);
    setPet(selectedPet);
    setLevel(selectedPet.level || 1);
    setRewards(selectedPet.rewards || 0);

    // 🔥 重設選擇的玩具為預設的球（適合所有寵物）
    setSelectedToy('球');

    router.replace({ pathname: '/pet', params: { id: selectedPet.id } });
  };

  // 🔥 經驗值系統
  const addRewards = async (amount) => {
    if (!mountedRef.current) return;
    setRewards(prev => {
      let newRewards = prev + amount;
      const required = level * 100;

      if (newRewards >= required) {
        const newLevel = level + 1;
        setLevel(newLevel);

        // 🔥 升級也存起來
        updatePet(pet.id, { level: newLevel, rewards: newRewards - required });

        return newRewards - required;
      } else {
        // 🔥 即使沒升級，也存 rewards
        updatePet(pet.id, { rewards: newRewards });
        return newRewards;
      }
    });
  };

  // 🍖 餵食
  const feedPet = async () => {
    if (!pet || !globalData || !mountedRef.current) return;

    // 🔥 根據寵物類型檢查飼料
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

    // 🔥 更新全局飼料計數
    const newGlobalData = {
      ...globalData,
      [foodKey]: currentFoodCount - 1
    };

    setPet(updated);
    await updatePet(pet.id, updated);
    await updateGlobalData(newGlobalData);
    if (mountedRef.current) {
      setGlobalData(newGlobalData);
    }
    addRewards(10);
  };

  // 🎮 玩耍（會增加飢餓）
  const playWithPet = async () => {
    if (!mountedRef.current) return;
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

  if (!pet || !globalData) return <Text>Loading...</Text>;

  const maxExp = level * 100;
  const expPercent = (rewards / maxExp) * 100;

  // 🔥 根據寵物類型顯示對應的飼料計數
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
          <Pressable 
            style={styles.switchButton} 
            onPress={() => setModalVisible(true)}
          >
            <Image 
              source={switchIcon}
              style={styles.switch_icon}
            />
          </Pressable>
        </View>
      </View>

      <Pressable 
        style={styles.shopButton} 
        onPress={() => setShopVisible(true)}
      >
        <Image 
          source={shopIcon}
          style={styles.shop_icon}
        />
      </Pressable>

      {/* 寵物 */}
      <ImageBackground pointerEvents="box-none" source={backgroundImage} style={styles.petContainer} imageStyle={styles.petBackgroundImage}>
        <View style={styles.petContent} pointerEvents="box-none">
          <View style={styles.hungerBar}>
            <Image source={hungerHeartImage} style={styles.hungerHeart} />
          </View>
          <Image 
          source={currentPetImage} 
          style={{
            width: pet.type === 'dog' ? 200 : 190,  // 狗比較大隻，貓比較小隻
            height: pet.type === 'dog' ? 200 : 190,
            resizeMode: 'contain',
            // 如果你想調整寵物在畫面上的上下位置，可以加上這行：
            marginTop: 20, 
          }} />
          <Text style={styles.petName}>{pet.name}</Text>
        </View>
      </ImageBackground>
      
      <Pressable
        style={styles.topLeftPlayButton}
        onPress={playWithPet}
      >
        <Image
          source={toys.find(t => t.name === selectedToy)?.image || ballImage}
          style={styles.toy_switch_icon}
        />
      </Pressable>

      {/* 底部 */}
      <View style={styles.footer}>
        <View style={styles.buttonContainer}>
          <View style={styles.food_actionRow}>
              <Pressable style={styles.actionButton} onPress={feedPet}>
              <Image 
                source={currentFoodImage}
                style={styles.food_switch_icon}
              />
              <Text style={styles.foodCountLabel}>{currentFoodCount}</Text>
            </Pressable>
          </View>

          <View style={styles.toy_actionRow}>
            <Pressable style={styles.controllerButton} onPress={() => setToyModalVisible(true)}>
              <Image 
                source={gameControllerIcon}
                style={styles.gameControllerIcon}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>選擇要切換的寵物</Text>
            <FlatList
              data={allPets}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const foodKey = item.type === 'dog' ? 'dogFoodCount' : 'catFoodCount';
                const itemFoodCount = globalData[foodKey] || 0;
                return (
                  <Pressable
                    style={[
                      styles.petItem,
                      item.id === pet.id && styles.selectedPetItem,
                    ]}
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
                      style={[
                        styles.foodItem,
                        selectedToy === item.name && styles.selectedFoodItem,
                      ]}
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
                      setToyModalVisible(false); // 1. 關閉玩具小視窗
                      
                      // 2. 稍微延遲開啟，避免兩個 Modal 動畫互卡導致黑屏
                      setTimeout(() => {
                        setShopVisible(true);    // 3. 開啟商店組件
                      }, 300);
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
      <ShopScreen visible={shopVisible} onClose={() => setShopVisible(false)} petId={petId} deviceId={deviceId}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#D0E7EF',
    flexDirection: 'column',
  },
  statusContainer: { 
    position: 'absolute', 
    top: 20, left: 20, 
    flexDirection: 'column', 
    gap: 15, 
    zIndex: 1, 
    paddingTop: 45 
  },
  statusItem: {
    backgroundColor: '#fcd5b0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 240, // 🔥 比較穩定
    borderWidth: 2,
    borderColor: '#ffc38ad2',
  },
  statusLabel: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#333',
  },
  expBarFill: {
    height: '100%',
    backgroundColor: '#ffc38ad2',
    borderRadius: 10,
  },
  levelRow: {
    flexDirection: 'row', // 🔥 左右排
    alignItems: 'center',
    gap: 8,
  },
  expBarBackground: {
    width: 150,   // 🔥 固定寬度（不要用100%）
    height: 6,
    backgroundColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
  },
  expBarFill: {
    height: '100%',
    backgroundColor: '#ca823ed2',
  },
  row: {
    flexDirection: 'row', // 🔥 左右排
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  shop_icon: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  switchButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  food_switch_icon: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
  },
  toy_switch_icon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    
  },
  switch_icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    
  },
  shopButton: {
    padding: 8,
    borderRadius: 20,
    right: 10,
    top: 150,
    position: 'absolute',
    zIndex: 1,
  },
  petContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60, // 給狀態欄留空間
    paddingBottom: 100, // 給底部按鈕留空間
  },
  petContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  petBackgroundImage: {
    resizeMode: 'cover',
  },
  petImage: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    top: 50,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  rewardsBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  rewardsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  rewardsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  foodCountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  foodCountLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: -25,
  },
  food_actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    top: 0,
  },
  toy_actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',

  },
  topLeftPlayButton: {
    position: 'absolute',
    top: 350,
    left: 20,
    width: 100,
    height: 100,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  controllerButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameControllerIcon: {
    top: 40,
    width: 150,
    height: 150,
    resizeMode: 'contain',
    left: 100,
  },
  actionButton: {
    minWidth: 120,
    maxWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    top: 30,
  },
  arrowButton: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hungerBar: {
    alignItems: 'center',
    marginBottom: -90,
    zIndex: 10,
  },
  hungerHeart: {
    width: 600,
    height: 180,
    resizeMode: 'contain',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  foodListContent: {
    paddingHorizontal: 10,
    paddingVertical: 15,
    gap: 12,
  },
  foodItem: {
    width: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    minWidth: 120,
  },
  selectedFoodItem: {
    borderColor: '#6c5ce7',
    backgroundColor: '#dfe6e9',
  },
  foodImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    backgroundColor: '#ffc38ad2',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  petList: {
    paddingBottom: 20,
  },
  petItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  selectedPetItem: {
    borderColor: '#6c5ce7',
    backgroundColor: '#dfe6e9',
  },
  petItemText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#d63031',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noToysContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noToysText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  goToShopButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  goToShopText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  incompatibleItem: {
    opacity: 0.5,
  },
  incompatibleImage: {
    opacity: 0.5,
  },
  incompatibleText: {
    color: '#999',
  },
});