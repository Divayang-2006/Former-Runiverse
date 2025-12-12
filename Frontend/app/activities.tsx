import React, {useMemo, useState} from 'react'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useRouter} from 'expo-router'
import {View, Text, ScrollView, TextInput, Pressable} from 'react-native'
import {useTheme} from '../context/ThemeContext'
import {Ionicons, FontAwesome5} from '@expo/vector-icons'

const FILTERS = ['All', 'Distance', 'Elevation', 'Time', 'Dates', 'Activity tag'] as const

type FilterValue = typeof FILTERS[number]

type Activity = {
  id: string
  title: string
  subtitle: string
  category: Exclude<FilterValue, 'All' | 'Activity tag'> | 'Activity tag'
  distance: string
  elevation: string
  duration: string
  date: string
  tags: string[]
}

const ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: 'Sunrise Tempo Run',
    subtitle: 'Golden Gate Loop',
    category: 'Distance',
    distance: '12.5 km',
    elevation: '210 m',
    duration: '58m',
    date: 'Dec 01, 2025',
    tags: ['Tempo', 'Morning'],
  },
  {
    id: '2',
    title: 'Summit Push',
    subtitle: 'Twin Peaks Climb',
    category: 'Elevation',
    distance: '8.3 km',
    elevation: '480 m',
    duration: '1h 12m',
    date: 'Nov 28, 2025',
    tags: ['Hill Repeats'],
  },
  {
    id: '3',
    title: 'Lunch Break Dash',
    subtitle: 'Embarcadero Sprint',
    category: 'Time',
    distance: '5.0 km',
    elevation: '35 m',
    duration: '22m',
    date: 'Nov 23, 2025',
    tags: ['Speedwork', 'Lunchtime'],
  },
  {
    id: '4',
    title: 'Distance Builder',
    subtitle: 'Bay Trail Long Run',
    category: 'Distance',
    distance: '21.1 km',
    elevation: '190 m',
    duration: '1h 48m',
    date: 'Nov 17, 2025',
    tags: ['Half Marathon Prep'],
  },
  {
    id: '5',
    title: 'Sunset Recovery Walk',
    subtitle: 'Presidio Loop',
    category: 'Dates',
    distance: '4.4 km',
    elevation: '60 m',
    duration: '41m',
    date: 'Nov 15, 2025',
    tags: ['Recovery'],
  },
  {
    id: '6',
    title: 'Stride Lab Session',
    subtitle: 'Track Intervals',
    category: 'Activity tag',
    distance: '7.2 km',
    elevation: '15 m',
    duration: '36m',
    date: 'Nov 10, 2025',
    tags: ['Intervals', 'Form'],
  },
]

export default function ActivitiesScreen() {
  const {colors, isDark} = useTheme()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterValue>('All')

  const filteredActivities = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase()
    return ACTIVITIES.filter(activity => {
      const matchesFilter =
        activeFilter === 'All'
          ? true
          : activeFilter === 'Activity tag'
            ? activity.tags.length > 0
            : activity.category === activeFilter

      if (!matchesFilter) return false

      if (!lowerQuery) return true

      return (
        activity.title.toLowerCase().includes(lowerQuery) ||
        activity.subtitle.toLowerCase().includes(lowerQuery) ||
        activity.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
    })
  }, [activeFilter, query])

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.background.primary}}>
      <ScrollView contentContainerStyle={{paddingBottom: 40, paddingHorizontal: 20}} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between pt-4 mb-6">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
              borderWidth: 1,
              borderColor: colors.border.light,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </Pressable>
          <Text className="text-2xl font-bold" style={{color: colors.text.primary}}>
            Activities
          </Text>
          <View style={{width: 44}} />
        </View>

        <View
          className="flex-row items-center mb-4 rounded-3xl px-4 py-3"
          style={{
            backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
            borderWidth: 1,
            borderColor: isDark ? colors.border.dark : colors.border.light,
          }}
        >
          <Ionicons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your activities"
            placeholderTextColor={colors.text.secondary}
            style={{
              flex: 1,
              marginLeft: 12,
              color: colors.text.primary,
              fontSize: 15,
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingVertical: 4, paddingRight: 4}}
          className="mb-6"
        >
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className="px-4 py-2 mr-2 rounded-2xl border"
                style={{
                  backgroundColor: isActive
                    ? colors.accent.primary
                    : isDark
                      ? colors.background.tertiary
                      : colors.background.secondary,
                  borderColor: isActive ? colors.accent.primary : colors.border.light,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{color: isActive ? colors.background.primary : colors.text.secondary}}
                >
                  {filter}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {filteredActivities.length === 0 ? (
          <View className="items-center justify-center py-24">
            <Text className="text-5xl mb-3">🏃‍♂️</Text>
            <Text className="text-lg font-semibold" style={{color: colors.text.primary}}>
              No activities found
            </Text>
            <Text className="text-base mt-2 text-center px-6" style={{color: colors.text.secondary}}>
              Try adjusting your search or filters to discover more runs.
            </Text>
          </View>
        ) : (
          filteredActivities.map(activity => (
            <View
              key={activity.id}
              className="mb-4 rounded-3xl p-5 border"
              style={{
                backgroundColor: colors.background.elevated,
                borderColor: isDark ? colors.border.medium : colors.border.light,
                shadowColor: isDark ? '#000000' : '#1f2937',
                shadowOffset: {width: 0, height: 10},
                shadowOpacity: isDark ? 0.4 : 0.12,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold" style={{color: colors.text.primary}}>
                    {activity.title}
                  </Text>
                  <Text className="text-sm mt-1" style={{color: colors.text.secondary}}>
                    {activity.subtitle}
                  </Text>
                </View>
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center"
                  style={{backgroundColor: `${colors.accent.primary}15`}}
                >
                  <FontAwesome5 name="running" size={18} color={colors.accent.primary} />
                </View>
              </View>

              <View className="flex-row mb-4">
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
                    Distance
                  </Text>
                  <Text className="text-lg font-semibold mt-1" style={{color: colors.text.primary}}>
                    {activity.distance}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
                    Elevation
                  </Text>
                  <Text className="text-lg font-semibold mt-1" style={{color: colors.text.primary}}>
                    {activity.elevation}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
                    Time
                  </Text>
                  <Text className="text-lg font-semibold mt-1" style={{color: colors.text.primary}}>
                    {activity.duration}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
                    Date
                  </Text>
                  <Text className="text-sm font-medium mt-1" style={{color: colors.text.primary}}>
                    {activity.date}
                  </Text>
                </View>
                <View className="flex-row flex-wrap justify-end">
                  {activity.tags.map(tag => (
                    <View
                      key={tag}
                      className="px-3 py-1 rounded-full ml-2 mb-2"
                      style={{backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary}}
                    >
                      <Text className="text-xs font-semibold" style={{color: colors.text.secondary}}>
                        #{tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
