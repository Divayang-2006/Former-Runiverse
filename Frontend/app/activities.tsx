import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useRouter} from 'expo-router'
import {View, Text, ScrollView, TextInput, Pressable, RefreshControl, ActivityIndicator} from 'react-native'
import {useTheme} from '../context/ThemeContext'
import {Ionicons, FontAwesome5} from '@expo/vector-icons'
import dayjs from 'dayjs'
import {useStore} from '@/store/useStore'
import {activityService} from '@/services/activityService'
import type {Activity} from '@/store/types'

const FILTERS = ['All', 'Distance', 'Calories', 'Duration', 'Dates', 'Activity Type'] as const

type FilterValue = (typeof FILTERS)[number]

interface ActivityCardView {
  id: string
  title: string
  subtitle: string
  category: FilterValue
  distanceLabel: string
  caloriesLabel: string
  durationLabel: string
  dateLabel: string
  tags: string[]
  isRecent: boolean
  searchTokens: string
}

const capitalizeWords = (value: string): string =>
  value
    .split(' ')
    .map(part => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')

const formatDistance = (meters: number): string => {
  const kilometers = meters / 1000
  if (!Number.isFinite(kilometers) || kilometers <= 0) return '0 km'
  return kilometers >= 10 ? `${kilometers.toFixed(1)} km` : `${kilometers.toFixed(2)} km`
}

const formatDuration = (minutes: number): string => {
  const rounded = Math.max(Math.round(minutes), 0)
  const hours = Math.floor(rounded / 60)
  const remainingMinutes = rounded % 60
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  }
  return `${remainingMinutes}m`
}

const formatCalories = (calories: number): string => {
  const rounded = Math.max(Math.round(calories), 0)
  return rounded > 0 ? `${rounded} kcal` : '—'
}

const buildCard = (activity: Activity): ActivityCardView => {
  const start = dayjs(activity.startTime)
  const end = dayjs(activity.endTime)
  const durationMinutes = start.isValid() && end.isValid() ? end.diff(start, 'minute', true) : 0
  const distance = activity.totalDistance
  const calories = activity.calories
  const baseTitle = activity.activityType?.replace(/[-_]/g, ' ') || 'Activity'
  const title = capitalizeWords(baseTitle)
  const subtitle = start.isValid()
    ? `${start.format('ddd, MMM D • h:mm A')}${end.isValid() ? ` — ${end.format('h:mm A')}` : ''}`
    : 'Activity details pending'
  const tags = [
    title,
    activity.loopDetected ? 'Loop route' : null,
    distance / 1000 >= 10 ? 'Long run' : null,
    calories >= 600 ? 'High burn' : null,
  ].filter(Boolean) as string[]
  const isRecent = start.isAfter(dayjs().subtract(14, 'day'))
  const category: FilterValue = (() => {
    if (distance / 1000 >= 10) return 'Distance'
    if (calories >= 600) return 'Calories'
    if (durationMinutes >= 75) return 'Duration'
    if (isRecent) return 'Dates'
    return 'Activity Type'
  })()

  return {
    id: activity.id,
    title,
    subtitle,
    category,
    distanceLabel: formatDistance(distance),
    caloriesLabel: formatCalories(calories),
    durationLabel: formatDuration(durationMinutes),
    dateLabel: start.isValid() ? start.format('MMM DD, YYYY') : '—',
    tags,
    isRecent,
    searchTokens: [title, subtitle, ...tags].join(' ').toLowerCase(),
  }
}

export default function ActivitiesScreen() {
  const {colors, isDark} = useTheme()
  const router = useRouter()
  const user = useStore(state => state.user)
  const activities = useStore(state => state.activities)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterValue>('All')
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cards = useMemo(() => activities.map(buildCard), [activities])

  const fetchActivities = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setIsLoading(true)
      else setIsRefreshing(true)
      setError(null)

      try {
        await activityService.fetchActivities({limit: 50})
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load activities'
        setError(message)
      } finally {
        if (mode === 'initial') setIsLoading(false)
        else setIsRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!user?.id) {
      return
    }
    if (activities.length === 0) {
      fetchActivities('initial')
    }
  }, [activities.length, fetchActivities, user?.id])

  const handleRefresh = useCallback(() => {
    fetchActivities('refresh')
  }, [fetchActivities])

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)
    return () => {
      clearTimeout(handle)
    }
  }, [query])

  const filteredActivities = useMemo(() => {
    const lowerQuery = debouncedQuery.trim().toLowerCase()
    return cards.filter(card => {
      const matchesFilter = (() => {
        switch (activeFilter) {
          case 'All':
            return true
          case 'Dates':
            return card.isRecent
          case 'Activity Type':
            return card.tags.length > 0
          default:
            return card.category === activeFilter
        }
      })()

      if (!matchesFilter) {
        return false
      }

      if (!lowerQuery) {
        return true
      }

      return card.searchTokens.includes(lowerQuery)
    })
  }, [activeFilter, cards, debouncedQuery])

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.background.primary}}>
      <ScrollView
        contentContainerStyle={{paddingBottom: 40, paddingHorizontal: 20}}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.text.secondary} />}
      >
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

        {error ? (
          <Text className="mb-4 text-sm" style={{color: colors.status.error}}>
            {error}
          </Text>
        ) : null}

        {isLoading && cards.length === 0 ? (
          <View className="items-center justify-center py-24">
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text className="text-base mt-4" style={{color: colors.text.secondary}}>
              Loading your activities...
            </Text>
          </View>
        ) : filteredActivities.length === 0 ? (
          <View className="items-center justify-center py-24">
            <Text className="text-5xl mb-3">🏃‍♂️</Text>
            <Text className="text-lg font-semibold" style={{color: colors.text.primary}}>
              No activities found
            </Text>
            <Text className="text-base mt-2 text-center px-6" style={{color: colors.text.secondary}}>
              Try adjusting your search or refresh to sync the latest runs.
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
                    {activity.distanceLabel}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
                    Calories
                  </Text>
                  <Text className="text-lg font-semibold mt-1" style={{color: colors.text.primary}}>
                    {activity.caloriesLabel}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
                    Duration
                  </Text>
                  <Text className="text-lg font-semibold mt-1" style={{color: colors.text.primary}}>
                    {activity.durationLabel}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
                    Date
                  </Text>
                  <Text className="text-sm font-medium mt-1" style={{color: colors.text.primary}}>
                    {activity.dateLabel}
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
