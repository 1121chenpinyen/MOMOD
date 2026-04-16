import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebaseConfig';
import { doc, onSnapshot, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { getDeviceId } from '../utils/getDeviceId';

const MoneyContext = createContext();


export function MoneyProvider({ children }) {
  const [money, setMoney] = useState(0);
  const [deviceId, setDeviceId] = useState(null);

  // 取得本機 deviceId
  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  // 監聽雲端金幣
  useEffect(() => {
    if (!deviceId) return;
    const profileRef = doc(db, 'profiles', deviceId);
    const unsub = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMoney(typeof data.money === 'number' ? data.money : 0);
      } else {
        setMoney(0);
      }
    });
    return () => unsub();
  }, [deviceId]);

  // 雲端加金幣
  const earn = async (amount) => {
    if (!deviceId) return;
    const profileRef = doc(db, 'profiles', deviceId);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      await setDoc(profileRef, { money: amount }, { merge: true });
    } else {
      await runTransaction(db, async (transaction) => {
        const s = await transaction.get(profileRef);
        let oldMoney = 0;
        if (s.exists()) {
          const data = s.data();
          oldMoney = typeof data.money === 'number' ? data.money : 0;
        }
        transaction.set(profileRef, { money: oldMoney + amount }, { merge: true });
      });
    }
  };

  // 雲端扣金幣
  const spend = async (amount) => {
    if (!deviceId) return;
    const profileRef = doc(db, 'profiles', deviceId);
    await runTransaction(db, async (transaction) => {
      const s = await transaction.get(profileRef);
      let oldMoney = 0;
      if (s.exists()) {
        const data = s.data();
        oldMoney = typeof data.money === 'number' ? data.money : 0;
      }
      transaction.set(profileRef, { money: Math.max(0, oldMoney - amount) }, { merge: true });
    });
  };

  return (
    <MoneyContext.Provider value={{ money, earn, spend }}>
      {children}
    </MoneyContext.Provider>
  );
}

export function useMoney() {
  return useContext(MoneyContext);
}
