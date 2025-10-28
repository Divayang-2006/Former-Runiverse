import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';

const ChallengeCard = ({ icon, title, description, reward, isDarkMode }: any) => {
    const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
    const secondaryTextClass = isDarkMode ? "text-text-secondary" : "text-gray-600";
    const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white"; 
    
    return (
        <View className={`rounded-xl p-6 mb-6 shadow-md ${cardBgClass}`}>
            <View className="flex-row items-start">
                <FontAwesome5 name={icon} size={28} color="#00C853" className="mr-4 mt-1" />
                <View className="flex-1">
                    <Text className={`text-xl font-bold ${textClass}`}>{title}</Text>
                    <Text className={`text-base mt-1 mb-4 ${secondaryTextClass}`}>{description}</Text>
                </View>
            </View>
            <TouchableOpacity className="bg-primary-green p-3 rounded-xl items-center">
                <Text className="text-black text-base font-bold">Join Challenge</Text>
            </TouchableOpacity>
        </View>
    );
};

const ChallengesScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView>
        <View className="p-6">
          <Text className={`text-3xl font-bold mb-6 ${textClass}`}>Challenges</Text>
          <ChallengeCard
            icon="fire"
            title="Weekly Warrior"
            description="Run a total of 25 miles this week to complete the challenge."
            isDarkMode={isDarkMode}
          />
          <ChallengeCard
            icon="mountain"
            title="Elevation Expert"
            description="Climb a total of 1,000 feet in a single run."
            isDarkMode={isDarkMode}
          />
          <ChallengeCard
            icon="calendar-check"
            title="Consistency King"
            description="Complete a run on three consecutive days."
            isDarkMode={isDarkMode}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChallengesScreen;