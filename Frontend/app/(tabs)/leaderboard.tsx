import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { leaderboardService, LeaderboardEntry } from '@/services/leaderboardService';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  Layout,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AlertCard from '@/components/AlertCard';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

type LeaderboardRowProps = {
  item: LeaderboardEntry;
  index: number;
  isDarkMode: boolean;
  textClass: string;
  cardBgClass: string;
};

const LeaderboardRow = ({
  item,
  index,
  isDarkMode,
  textClass,
  cardBgClass,
}: LeaderboardRowProps) => {
  const pulse = useSharedValue(0);
  const rank = index + 1;

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };
  }, [pulse]);

  const cardStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(pulse.value, [0, 1], [0.08, 0.2]),
    transform: [
      {
        translateY: interpolate(pulse.value, [0, 1], [0, -2]),
      },
      {
        scale: interpolate(pulse.value, [0, 1], [1, 1.01]),
      },
    ],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: rank <= 3 ? interpolate(pulse.value, [0, 1], [0.25, 0.6]) : 0,
  }));
  let rankColor = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  let rankBgColor = isDarkMode ? 'bg-gray-700' : 'bg-gray-200';
  let rankIcon = '🏅';

  if (rank === 1) {
    rankColor = 'text-yellow-400';
    rankBgColor = 'bg-yellow-500/10';
    rankIcon = '🥇';
  }
  if (rank === 2) {
    rankColor = 'text-gray-300';
    rankBgColor = 'bg-gray-400/10';
    rankIcon = '🥈';
  }
  if (rank === 3) {
    rankColor = 'text-yellow-600';
    rankBgColor = 'bg-yellow-600/10';
    rankIcon = '🥉';
  }

  const avatarSource = item.avatarUrl
    ? { uri: item.avatarUrl }
    : { uri: 'https://i.pravatar.cc/150?u=runiverse-placeholder' };
  const areaLabel = `${Math.round(item.totalArea).toLocaleString()} m²`;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 50)}
      layout={Layout.springify()}
      className={`rounded-3xl mb-4 overflow-hidden`}
      style={[
        cardStyle,
        {
          shadowColor: isDarkMode ? '#000' : '#1E293B',
          shadowOffset: { width: 0, height: rank <= 3 ? 8 : 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: rank <= 3 ? 12 : 8,
          elevation: rank <= 3 ? 10 : 6,
        },
      ]}
    >
      {rank <= 3 && (
        <Animated.View style={[styles.highlightWrap, highlightStyle]}>
          <LinearGradient
            colors={['rgba(250, 204, 21, 0.4)', 'rgba(96, 165, 250, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <View className={`flex-row items-center p-5 ${cardBgClass}`}>
        <View className={`${rankBgColor} w-12 h-12 rounded-2xl items-center justify-center mr-3`}>
          {rank <= 3 ? (
            <Text className="text-2xl">{rankIcon}</Text>
          ) : (
            <Text className={`text-lg font-bold ${rankColor}`}>#{rank}</Text>
          )}
        </View>
        <Image
          source={avatarSource}
          className="w-14 h-14 rounded-full mr-4 border-2 border-primary/20 shadow-sm"
        />
        <View className="flex-1">
          <Text className={`text-lg font-bold ${textClass} tracking-tight`}>{item.username}</Text>
          <View className="flex-row items-center mt-1">
            <FontAwesome5 name="map-marked-alt" size={12} color="#00C853" />
            <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ml-1`}>
              {areaLabel}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`text-base font-bold ${textClass}`}>
            {Math.round(item.steps).toLocaleString()}
          </Text>
          <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>steps</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const LeaderboardScreen = () => {
  const { theme } = useTheme();
  const user = useStore((s) => s.user);
  const isDarkMode = theme === 'dark';
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const city = user?.city?.trim() || 'Gandhinagar';
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const fetchLeaderboard = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!city) {
        if (isMountedRef.current) {
          setEntries([]);
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      if (mode === 'refresh') {
        if (isMountedRef.current) setRefreshing(true);
      } else if (isMountedRef.current) {
        setLoading(true);
      }

      if (isMountedRef.current) setError(null);

      try {
        const data = await leaderboardService.fetchCityLeaderboard(city);
        if (isMountedRef.current) setEntries(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load leaderboard';
        if (isMountedRef.current) setError(message);
      } finally {
        if (!isMountedRef.current) return;
        if (mode === 'refresh') setRefreshing(false);
        else setLoading(false);
      }
    },
    [city]
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const bgClass = isDarkMode ? 'bg-background-dark' : 'bg-gray-100';
  const textClass = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const cardBgClass = isDarkMode ? 'bg-card-dark' : 'bg-white';

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <LeaderboardRow
      item={item}
      index={index}
      isDarkMode={isDarkMode}
      textClass={textClass}
      cardBgClass={cardBgClass}
    />
  );

  const addFriendColors: [ColorValue, ColorValue] = isDarkMode
    ? ['#1E3A8A', '#2563EB']
    : ['#2563EB', '#38BDF8'];

  return (
    <ScreenWrapper bg={bgClass}>
      <SafeAreaView className="flex-1">
        <View className="px-6 pt-4 pb-4">
          <Animated.View entering={FadeInUp.duration(600).delay(100)} layout={Layout.springify()}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-4xl font-bold ${textClass} tracking-tight`}>Leaderboard</Text>
              <Pressable onPress={() => router.push('/add-friend' as never)}>
                <LinearGradient
                  colors={addFriendColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addFriendButton}
                >
                  <FontAwesome5 name="user-plus" size={16} color="#fff" />
                  <Text style={styles.addFriendLabel}>Add Friend</Text>
                </LinearGradient>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              style={{ marginVertical: 10 }}
            >
              <View className="flex-row">
                <View
                  className="flex-row items-center px-5 py-3 rounded-2xl mr-3"
                  style={{
                    backgroundColor: isDarkMode
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.1)',
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(16,185,129,0.3)',
                  }}
                >
                  <FontAwesome5 name="map-marker-alt" size={16} color="#10B981" />
                  <Text
                    className={`ml-2 text-base font-semibold ${isDarkMode ? 'text-text-primary' : 'text-gray-700'}`}
                  >
                    {city}
                  </Text>
                </View>
                <View
                  className="flex-row items-center px-5 py-3 rounded-2xl mr-3"
                  style={{
                    backgroundColor: isDarkMode
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.1)',
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(16,185,129,0.3)',
                  }}
                >
                  {/* <FontAwesome5 name="map-marker-alt" size={16} color="#10B981" /> */}
                  <Text
                    className={`ml-2 text-base font-semibold ${isDarkMode ? 'text-text-primary' : 'text-gray-700'}`}
                  >
                    Friends
                  </Text>
                </View>
                <View
                  className="flex-row items-center px-5 py-3 rounded-2xl"
                  style={{
                    backgroundColor: isDarkMode
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.1)',
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(16,185,129,0.3)',
                  }}
                >
                  {/* <FontAwesome5 name="map-marker-alt" size={16} color="#10B981" /> */}
                  <Text
                    className={`ml-2 text-base font-semibold ${isDarkMode ? 'text-text-primary' : 'text-gray-700'}`}
                  >
                    Community
                  </Text>
                </View>
              </View>
            </ScrollView>

            {error && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                exiting={FadeOutDown.duration(200)}
                className="mt-2"
              >
                <AlertCard type="error" title="Unable to load leaderboard" message={error} />
              </Animated.View>
            )}
          </Animated.View>
        </View>
        {loading && entries.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={isDarkMode ? '#60A5FA' : '#2563EB'} />
          </View>
        ) : (
          <Animated.FlatList<LeaderboardEntry>
            data={entries}
            renderItem={renderItem}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            refreshing={refreshing}
            onRefresh={() => fetchLeaderboard('refresh')}
            ListEmptyComponent={
              !loading ? (
                <View className="items-center justify-center py-20">
                  <FontAwesome5 name="users" size={36} color={isDarkMode ? '#4B5563' : '#9CA3AF'} />
                  <Text
                    className={`mt-3 text-base ${isDarkMode ? 'text-text-secondary' : 'text-gray-600'}`}
                  >
                    No players tracked in this city yet.
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  highlightWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  addFriendLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
