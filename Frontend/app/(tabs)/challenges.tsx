import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { useStore } from "@/store/useStore";
import axios from 'axios';
import ConfettiCannon from "react-native-confetti-cannon";
import Toast from "react-native-toast-message";
import { Animated } from "react-native";
import { useProgressAnimation } from "@/hooks/useProgressAnimation";

interface Task {
  _id: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'run' | 'walk' | 'capture' | 'streak';
  target: number;
  completed: boolean;
  createdAt: string;
  expiresAt?: string;
}
const API_BASE_URL = "http://10.131.36.100:5000/api";

const ChallengeCard = ({
  icon,
  title,
  description,
  difficulty,
  type,
  target,
  isDarkMode,
}: any) => {
  const [joined, setJoined] = useState(false);
  const [progress, setProgress] = useState(0);
  const confettiRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const secondaryTextClass = isDarkMode ? "text-text-secondary" : "text-gray-600";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

  const handleJoin = () => {
    if (joined) return;
    setJoined(true);
    confettiRef.current?.start?.();
    Toast.show({
      type: "success",
      text1: "Challenge Joined 🎯",
      text2: "Let's crush it!",
      position: "bottom",
    });

    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 4000,
      useNativeDriver: false,
    }).start(() => {
      setProgress(100);
    });
    const animatedWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"],
    });
    
  };

  return (
    <View className={`rounded-xl p-6 mb-6 shadow-md ${cardBgClass}`}>
      <View className="flex-row items-start">
        <FontAwesome5
          name={icon || "running"}
          size={28}
          color="#00C853"
          className="mr-4 mt-1"
        />
        <View className="flex-1">
          <Text className={`text-xl font-bold ${textClass}`}>{title}</Text>
          <Text className={`text-base mt-1 mb-2 ${secondaryTextClass}`}>
            {description}
          </Text>
          <Text className={`text-sm mb-4 ${secondaryTextClass}`}>
            🎯 {target} km • ⚙️ {difficulty} • 🏃‍♂️ {type}
          </Text>
        </View>
      </View>

      {!joined ? (
        <TouchableOpacity
          className="bg-primary-green p-3 rounded-xl items-center"
          onPress={handleJoin}
        >
          <Text className="text-black text-base font-bold">Join Challenge</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <View className="h-4 bg-gray-300 rounded-xl overflow-hidden mt-3">
            <Animated.View
              style={{
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                height: "100%",
                backgroundColor: "#00C853",
              }}
            />
          </View>
          <Text className="mt-2 text-center text-gray-700">
            {progress}% completed
          </Text>
        </View>
      )}

      <ConfettiCannon
        ref={confettiRef}
        count={40}
        origin={{ x: 150, y: 0 }}
        fadeOut
        autoStart={false}
      />
    </View>
  );
};

const ChallengesScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);


  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";

  const user = useStore((s) => s.user);
  const token = user?.token;
  // 🧠 Replace with your stored token (from login)

  // Fetch user’s tasks from backend
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setTasks(data.tasks || data);
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI-based new challenge
  const generateAITask = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks/generate-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recentDistance: 4.5,
          streakDays: 3,
          avgSpeed: 7.2,
        }),
      });
      const data = await res.json();
      if (data.task) setTasks((prev) => [data.task, ...prev]);
    } catch (err) {
      console.error("Generate AI task error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="mb-6">
          <Text className={`text-3xl font-bold mb-2 ${textClass}`}>Challenges</Text>
          <Text className={`text-base mb-4 ${textClass}`}>Earn badges, stay consistent & keep running!</Text>

          <TouchableOpacity
            onPress={generateAITask}
            disabled={loading}
            className="bg-green-500 py-3 px-4 rounded-xl items-center mb-6"
          >
            <Text className="text-black text-base font-bold">
              {loading ? "Generating..." : "Generate AI Challenge 🤖"}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && tasks.length === 0 ? (
          <ActivityIndicator size="large" color="#00C853" />
        ) : tasks.length === 0 ? (
          <Text className={`text-center mt-10 ${textClass}`}>No challenges yet! Generate one.</Text>
        ) : (
          tasks.map((task: any) => (
            <ChallengeCard
              key={task._id}
              icon={task.type === "run" ? "running" : "walking"}
              title={task.type.charAt(0).toUpperCase() + task.type.slice(1) + " Challenge"}
              description={task.description}
              difficulty={task.difficulty}
              type={task.type}
              target={task.target}
              isDarkMode={isDarkMode}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChallengesScreen;