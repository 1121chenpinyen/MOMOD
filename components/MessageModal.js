import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function MessageModal({ visible, onClose, message, onReply }) {
  const [replyText, setReplyText] = useState('');
  const [image, setImage] = useState(null);

  // 選取照片
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('權限不足', '需要相簿權限才能選取照片');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // 修正為官方建議寫法
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 拍照
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('權限不足', '需要相機權限才能拍照');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // 修正為官方建議寫法
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSend = () => {
    console.log("Modal 內部：按下傳送鈕"); 
  
    if (!replyText.trim() && !image) {
      console.log("Modal 內部：內容為空，不傳送");
      return;
    }
    
    // 💡 重要修正：直接傳送兩個獨立參數，不要包成 { } 物件
    // 這樣 Home.js 的 handleReply(replyText, imageUri) 才能正確接收
    onReply(replyText, image); 
    
    setReplyText('');
    setImage(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>回應他的煩惱</Text>
          <Text style={styles.content}>{message}</Text>
          <TextInput
            style={styles.input}
            placeholder="輸入訊息..."
            value={replyText}
            onChangeText={setReplyText}
            multiline={false}      // 必須關閉多行模式，Enter 鍵才會變成「收起/完成」功能
            blurOnSubmit={true}    // 核心設定：按下 Enter (Submit) 時會觸發 blur（收起鍵盤）
            returnKeyType="done"   // 讓鍵盤按鈕顯示「完成」或「確定」，而不是「換行」圖示
          />
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={takePhoto} style={styles.iconBtn}>
              <Ionicons name="camera" size={32} color="#a29add" />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
              <Ionicons name="image" size={32} color="#a29add" />
            </TouchableOpacity>
            {image && (
              <Image source={{ uri: image }} style={styles.previewImg} />
            )}
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity 
              onPress={() => { setReplyText(''); setImage(null); onClose(); }} 
              style={styles.btn}
            >
              <Text style={{ color: '#a29add' }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.btn, { backgroundColor: '#a29add' }]}
              disabled={!replyText.trim() && !image}
            >
              <Text style={{ color: '#fff' }}>傳送</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  dialog: { width: 300, backgroundColor: '#fff', borderRadius: 15, padding: 25, alignItems: 'center' },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 30 },
  content: { marginBottom: 16, textAlign: 'center', color: '#666' , marginBottom: 30},
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 16, minHeight: 40 },
  iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBtn: { marginHorizontal: 15 , marginBottom: 30},
  previewImg: { width: 50, height: 50, borderRadius: 8, marginLeft: 10 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  btn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 8, marginHorizontal: 5 },
});