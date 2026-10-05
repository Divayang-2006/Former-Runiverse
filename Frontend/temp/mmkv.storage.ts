// import { createMMKV } from "react-native-mmkv";

// export const mmkv = createMMKV({
//   id: "activity-storage",
// });

// export const Storage = {
//   set: (key: string, value: any) =>
//     mmkv.set(key, JSON.stringify(value)),

//   get: <T>(key: string): T | null => {
//     const v = mmkv.getString(key);
//     return v ? JSON.parse(v) : null;
//   },

//   remove: (key: string) => mmkv.remove(key),

//   appendArray: (key: string, value: any) => {
//     const arr = Storage.get<any[]>(key) || [];
//     arr.push(value);
//     Storage.set(key, arr);
//   },
// };
