import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";

export default function Settings() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? "#18181b" : "#f3f4f6", // bg-background-dark or bg-gray-100
      padding: 20,
    },
    header: {
      fontSize: 26,
      fontWeight: "bold",
      color: isDarkMode ? "#00e0ff" : "#007AFF", // accent color
      marginBottom: 20,
    },
    item: {
      padding: 15,
      backgroundColor: isDarkMode ? "#27272a" : "#fff", // bg-card-dark or bg-white
      borderRadius: 12,
      marginVertical: 8,
      shadowColor: isDarkMode ? "#000" : "#aaa",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    itemText: {
      color: isDarkMode ? "#fafafa" : "#222",
      fontSize: 16,
      fontWeight: "500",
    },
  });

  const sections = [
    { title: "Account Settings", route: "/settings/AccountSettings" },
    { title: "Privacy Settings", route: "/settings/PrivacySettings" },
    { title: "Notification Settings", route: "/settings/NotificationSettings" },
    { title: "Help & Support", route: "/settings/HelpSupport" },
    { title: "Logout", route: "/settings/Logout" },
  ];

  return (
    <ScrollView style={themedStyles.container}>
      <Text style={themedStyles.header}>⚙️ Settings</Text>
      {sections.map((sec) => (
        <TouchableOpacity
          key={sec.title}
          style={themedStyles.item}
          onPress={() => router.push(sec.route as any)}
        >
          <Text style={themedStyles.itemText}>{sec.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
// export default SettingsScreen;
// import React from 'react';
// import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
// import { useTheme } from '../context/ThemeContext';
// import { Link } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';

// const SettingsScreen = () => {
//   const { theme, toggleTheme } = useTheme();
//   const isDarkMode = theme === 'dark';

//   const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
//   const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
//   const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

//   return (
//     <SafeAreaView className={`flex-1 ${bgClass}`}>
//       <View className="flex-row justify-between items-center px-6 py-4">
//         <Link href="/(tabs)/profile" asChild>
//           <TouchableOpacity className="p-2">
//             <Ionicons name="arrow-back" size={28} color={isDarkMode ? 'white' : 'black'} />
//           </TouchableOpacity>
//         </Link>
//         <Text className={`text-2xl font-bold ${textClass}`}>Settings</Text>
//         <View className="w-8" />
//       </View>

//       <View className="flex-1 p-6">
//         <View className={`rounded-xl p-6 shadow-md ${cardBgClass} mb-6`}>
//           <Text className={`text-xl font-semibold mb-4 ${textClass}`}>App Theme</Text>
//           <TouchableOpacity
//             onPress={toggleTheme}
//             className={`flex-row items-center justify-between p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
//           >
//             <View className="flex-row items-center">
//               <Ionicons 
//                 name={isDarkMode ? 'moon' : 'sunny'} 
//                 size={24} 
//                 color={isDarkMode ? 'white' : 'orange'} 
//                 className="mr-3" 
//               />
//               <Text className={`text-lg font-medium ${textClass}`}>
//                 {isDarkMode ? 'Dark Mode' : 'Light Mode'}
//               </Text>
//             </View>
//             <Ionicons 
//               name="swap-horizontal" 
//               size={24} 
//               color={isDarkMode ? 'white' : 'black'} 
//             />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default SettingsScreen;