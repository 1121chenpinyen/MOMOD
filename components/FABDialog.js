import React from 'react';
import { Modal, View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function FABDialog({ visible, onClose, text, setText, onSend }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.label}>說說你的煩惱</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="輸入訊息..."
            autoFocus
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.sendBtn]} onPress={onSend}>
              <Text style={styles.sendBtnText}>傳送</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10, // 讓兩個按鈕之間有點間距
  },
  // --- 以下是新增的按鈕樣式 ---
  btn: {
    flex: 1, // 讓兩個按鈕平分寬度
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5', // 淺灰色背景
  },
  sendBtn: {
    backgroundColor: '#a29add', // 你的主色調
  },
  cancelBtnText: {
    color: '#666', // 灰色文字
    fontWeight: 'bold',
    fontSize: 16,
  },
  sendBtnText: {
    color: '#fff', // 白色文字
    fontWeight: 'bold',
    fontSize: 16,
  },
});