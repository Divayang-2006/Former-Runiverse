import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useRouter} from 'expo-router'
import {View, Text, ScrollView, Pressable, ActivityIndicator} from 'react-native'
import {useTheme} from '../context/ThemeContext'
import {Ionicons, FontAwesome5} from '@expo/vector-icons'
import {useStore} from '@/store/useStore'
import statisticsService from '@/services/statisticsService'
import type {MetricsSummary} from '@/store/types'

const METRIC_SECTIONS = [
  {
    id: 'weekly',
    title: 'AVG WEEKLY ACTIVITY',
    metrics: ['Runs', 'Time', 'Distance'],
    cyclingMetrics: ['Rides', 'Time', 'Distance'],
  },
  {
    id: 'year',
    title: 'YEAR-TO-DATE',
    metrics: ['Runs', 'Time', 'Distance', 'Elevation Gain'],
    cyclingMetrics: ['Rides', 'Time', 'Distance', 'Elevation Gain'],
  },
  {
    id: 'all',
    title: 'ALL TIME',
    metrics: ['Runs', 'Distance'],
    cyclingMetrics: ['Rides', 'Distance'],
  },
] as const

type Discipline = 'run' | 'ride'

type SectionId = (typeof METRIC_SECTIONS)[number]['id']

type MetricValues = {
  [key in Discipline]: Record<SectionId, Record<string, string>>
}

const EMPTY_METRICS: MetricsSummary = {
  start: new Date(0).toISOString(),
  end: new Date(0).toISOString(),
  days: 0,
  activities: 0,
  distanceMeters: 0,
  durationMinutes: 0,
  elevationGain: 0,
}

const formatDuration = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0m'
  }
  const totalMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`
  }
  if (hours > 0) {
    return `${hours}h`
  }
  return `${mins}m`
}

const formatDistance = (meters: number): string => {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '0 km'
  }
  const kilometres = meters / 1000
  const precision = kilometres >= 10 ? 1 : 2
  return `${kilometres.toFixed(precision)} km`
}

const formatElevation = (meters: number): string => {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '0 m'
  }
  return `${Math.round(meters)} m`
}

const buildMetricValues = (labels: readonly string[], summary: MetricsSummary): Record<string, string> => {
  return labels.reduce<Record<string, string>>((acc, label) => {
    switch (label) {
      case 'Runs':
      case 'Rides':
        acc[label] = summary.activities.toString()
        break
      case 'Time':
        acc[label] = formatDuration(summary.durationMinutes)
        break
      case 'Distance':
        acc[label] = formatDistance(summary.distanceMeters)
        break
      case 'Elevation Gain':
        acc[label] = formatElevation(summary.elevationGain)
        break
      default:
        acc[label] = '0'
        break
    }
    return acc
  }, {})
}

export default function StatisticsScreen() {
  const {colors, isDark} = useTheme()
  const router = useRouter()
  const metrics = useStore(s => s.metrics)
  const setMetrics = useStore(s => s.setMetrics)
  const [discipline, setDiscipline] = useState<Discipline>('run')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const isFetching = useRef(false)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadMetrics = useCallback(async () => {
    if (isFetching.current) {
      return
    }

    isFetching.current = true
    setLoading(true)
    setError(null)

    try {
      const data = await statisticsService.fetchMetricsSummary()
      if (isMounted.current) {
        setMetrics(data)
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        console.warn('Failed to load metrics summary', err)
        const rawMessage = err instanceof Error ? err.message : 'Failed to load statistics'
        const normalizedMessage = rawMessage.toLowerCase().includes('auth') ? 'Please sign in again to view statistics' : rawMessage
        setError(normalizedMessage)
      }
    } finally {
      isFetching.current = false
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [setMetrics])

  useEffect(() => {
    const hasData = metrics.weekly !== null || metrics.yearToDate !== null || metrics.allTime !== null
    if (!hasData) {
      loadMetrics()
    }
  }, [metrics.weekly, metrics.yearToDate, metrics.allTime, loadMetrics])

  const metricValues = useMemo<MetricValues>(() => {
    const base: Record<SectionId, MetricsSummary> = {
      weekly: metrics.weekly ?? EMPTY_METRICS,
      year: metrics.yearToDate ?? EMPTY_METRICS,
      all: metrics.allTime ?? EMPTY_METRICS,
    }

    return {
      run: METRIC_SECTIONS.reduce((acc, section) => {
        acc[section.id] = buildMetricValues(section.metrics, base[section.id])
        return acc
      }, {} as Record<SectionId, Record<string, string>>),
      ride: METRIC_SECTIONS.reduce((acc, section) => {
        acc[section.id] = buildMetricValues(section.cyclingMetrics, base[section.id])
        return acc
      }, {} as Record<SectionId, Record<string, string>>),
    }
  }, [metrics])

  const metricsForDiscipline = metricValues[discipline]

  const handleRefresh = useCallback(() => {
    if (!isFetching.current) {
      loadMetrics()
    }
  }, [loadMetrics])

  const getIcon = (value: Discipline, active: boolean) => {
    const iconColor = active ? colors.accent.primary : colors.text.secondary
    const backgroundColor = active ? `${colors.accent.primary}1A` : isDark ? colors.background.tertiary : colors.background.secondary
    const iconName = value === 'run' ? 'shoe-prints' : 'biking'

    return (
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center"
        style={{backgroundColor}}
      >
        <FontAwesome5 name={iconName as any} size={20} color={iconColor} />
      </View>
    )
  }

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
            Stats
          </Text>
          <Pressable
            onPress={handleRefresh}
            disabled={loading}
            className="w-11 h-11 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
              borderWidth: 1,
              borderColor: colors.border.light,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Ionicons name="refresh" size={20} color={colors.text.primary} />
          </Pressable>
        </View>

        <View className="flex-row justify-center mb-6">
          {[{id: 'run', label: 'Run', icon: 'shoe-prints'}, {id: 'ride', label: 'Ride', icon: 'biking'}].map(item => {
            const value = item.id as Discipline
            const isActive = discipline === value
            const tabColor = isActive ? colors.accent.primary : 'transparent'
            const textColor = isActive ? colors.text.primary : colors.text.secondary
            return (
              <Pressable
                key={value}
                onPress={() => setDiscipline(value)}
                className="flex-1 mx-2 rounded-3xl items-center py-4"
                style={{
                  backgroundColor: isActive ? `${colors.accent.primary}12` : isDark ? colors.background.tertiary : colors.background.secondary,
                  borderWidth: 1,
                  borderColor: isActive ? colors.accent.primary : colors.border.light,
                }}
              >
                {getIcon(value, isActive)}
                <View className="mt-2" />
                <Text className="text-sm font-semibold" style={{color: textColor}}>
                  {value === 'run' ? 'Running' : 'Cycling'}
                </Text>
                <View
                  className="h-1 rounded-full mt-3 w-10"
                  style={{backgroundColor: tabColor}}
                />
              </Pressable>
            )
          })}
        </View>

        {(loading || error) && (
          <View
            className="px-4 py-3 rounded-3xl mb-6"
            style={{
              backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
              borderWidth: 1,
              borderColor: colors.border.light,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{flex: 1, paddingRight: 12}}>
              {loading && (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <ActivityIndicator size="small" color={colors.accent.primary} style={{marginRight: 8}} />
                  <Text style={{color: colors.text.secondary}}>Refreshing metrics…</Text>
                </View>
              )}
              {error && !loading && (
                <Text style={{color: colors.text.secondary}}>{error}</Text>
              )}
            </View>
            {error && !loading && (
              <Pressable onPress={handleRefresh} style={{paddingVertical: 6, paddingHorizontal: 12}}>
                <Text style={{color: colors.accent.primary, fontWeight: '600'}}>Retry</Text>
              </Pressable>
            )}
          </View>
        )}

        {METRIC_SECTIONS.map(section => {
          const labels = discipline === 'run' ? section.metrics : section.cyclingMetrics
          const sectionValues = metricsForDiscipline[section.id] ?? {}
          return (
            <View key={`${section.id}-${discipline}`} className="mb-6">
              <View
                className="px-4 py-3 rounded-3xl"
                style={{
                  backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.border.light,
                }}
              >
                <Text className="text-xs font-bold uppercase tracking-widest" style={{color: colors.text.secondary}}>
                  {section.title}
                </Text>
              </View>
              <View
                className="px-4 py-4 rounded-3xl mt-1"
                style={{
                  backgroundColor: colors.background.elevated,
                  borderWidth: 1,
                  borderColor: isDark ? colors.border.medium : colors.border.light,
                }}
              >
                {labels.map((label, index) => {
                  const value = sectionValues[label] ?? '0'
                  const showDivider = index < labels.length - 1
                  return (
                    <View key={label}>
                      <View className="flex-row items-center justify-between py-3">
                        <Text className="text-base" style={{color: colors.text.primary}}>
                          {label}
                        </Text>
                        <Text className="text-base font-semibold" style={{color: colors.text.primary}}>
                          {value}
                        </Text>
                      </View>
                      {showDivider && (
                        <View className="h-px" style={{backgroundColor: isDark ? colors.border.dark : colors.border.light}} />
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
