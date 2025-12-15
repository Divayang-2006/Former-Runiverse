import React, {useMemo, useState, useCallback, useEffect, useRef} from 'react'
import {View, Text, Pressable, PanResponder, LayoutChangeEvent, ActivityIndicator} from 'react-native'
import {useTheme} from '../context/ThemeContext'
import dayjs from 'dayjs'
import Svg, {Polyline, Line, Circle} from 'react-native-svg'
import {FontAwesome5} from '@expo/vector-icons'
import {useStore} from '@/store/useStore'
import type {Activity} from '@/store/types'
import activityService from '@/services/activityService'

interface WeeklySample {
  start: string // ISO date for Monday of the week
  distanceKm: number
  durationMinutes: number
  elevationGain: number
}

type Discipline = 'run' | 'ride'

const CHART_HEIGHT = 140
const CHART_PADDING = 24
const DEFAULT_POINT_SPACING = 48
const WEEKS_TO_DISPLAY = 12
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MS_PER_MINUTE = 60 * 1000

const disciplineTabs: {value: Discipline; label: string; icon: string}[] = [
  {value: 'run', label: 'Running', icon: 'shoe-prints'},
  {value: 'ride', label: 'Cycling', icon: 'biking'},
]

const formatDuration = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

const formatRange = (start: string) => {
  const begin = dayjs(start)
  const end = begin.add(6, 'day')
  const sameMonth = begin.month() === end.month()
  if (sameMonth) {
    return `${begin.format('MMM D')} - ${end.format('D')}`
  }
  return `${begin.format('MMM D')} - ${end.format('MMM D')}`
}

const getWeekStart = (date: Date) => {
  if (Number.isNaN(date.getTime())) {
    return new Date(Date.UTC(1970, 0, 5))
  }
  const day = date.getUTCDay()
  const diff = (day + 6) % 7
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - diff))
}

const classifyDiscipline = (activityType: string): Discipline | null => {
  const value = activityType.toLowerCase()
  if (value.includes('ride') || value.includes('cycle') || value.includes('bike')) {
    return 'ride'
  }
  if (value.includes('run') || value.includes('walk') || value.includes('jog')) {
    return 'run'
  }
  return null
}

const computeDurationMinutes = (start: string, end: string) => {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return 0
  }
  return Math.max(0, endMs - startMs) / MS_PER_MINUTE
}

const buildWeeklySeries = (activities: Activity[]): Record<Discipline, WeeklySample[]> => {
  const baseWeek = getWeekStart(new Date())
  let latestWeekMs = baseWeek.getTime()

  const accumulator: Record<Discipline, Map<string, {distance: number; duration: number; elevation: number}>> = {
    run: new Map(),
    ride: new Map(),
  }

  for (const activity of activities) {
    const discipline = classifyDiscipline(activity.activityType)
    if (!discipline) {
      continue
    }

    const start = new Date(activity.startTime)
    const weekStart = getWeekStart(start)
    const key = weekStart.toISOString()
    const bucket = accumulator[discipline].get(key) ?? {distance: 0, duration: 0, elevation: 0}

    bucket.distance += typeof activity.totalDistance === 'number' ? activity.totalDistance : 0
    bucket.duration += computeDurationMinutes(activity.startTime, activity.endTime)
    bucket.elevation += typeof activity.elevationGain === 'number' ? activity.elevationGain : 0

    accumulator[discipline].set(key, bucket)

    const weekMs = weekStart.getTime()
    if (weekMs > latestWeekMs) {
      latestWeekMs = weekMs
    }
  }

  const buildSeries = (bucket: Map<string, {distance: number; duration: number; elevation: number}>): WeeklySample[] => {
    const series: WeeklySample[] = []

    for (let offset = WEEKS_TO_DISPLAY - 1; offset >= 0; offset -= 1) {
      const weekStartMs = latestWeekMs - offset * WEEK_MS
      const weekDate = new Date(weekStartMs)
      const key = getWeekStart(weekDate).toISOString()
      const snapshot = bucket.get(key)

      series.push({
        start: key,
        distanceKm: ((snapshot?.distance ?? 0) / 1000),
        durationMinutes: snapshot?.duration ?? 0,
        elevationGain: snapshot?.elevation ?? 0,
      })
    }

    return series
  }

  return {
    run: buildSeries(accumulator.run),
    ride: buildSeries(accumulator.ride),
  }
}

export default function ActivityTrendCard() {
  const {colors, isDark} = useTheme()
  const activities = useStore(s => s.activities)
  const userId = useStore(s => s.user?.id)
  const [discipline, setDiscipline] = useState<Discipline>('run')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [layoutWidth, setLayoutWidth] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!userId) {
      setError('Please sign in to load activity trends')
      hasFetched.current = false
      return
    }

    setError(null)
    hasFetched.current = false
  }, [userId])

  const fetchActivities = useCallback(async () => {
    if (loading) {
      return
    }

    if (!userId) {
      setError('Please sign in to load activity trends')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await activityService.fetchActivities({limit: 200})
      hasFetched.current = true
    } catch (err: unknown) {
      console.warn('Failed to fetch activities for trend card', err)
      const message = err instanceof Error ? err.message : 'Failed to load activities'
      const normalized = message.toLowerCase().includes('auth') ? 'Please sign in again to view activity trends' : message
      setError(normalized)
    } finally {
      setLoading(false)
    }
  }, [loading, userId])

  useEffect(() => {
    if (userId == null) {
      hasFetched.current = false
      return
    }

    if (!hasFetched.current && activities.length === 0) {
      fetchActivities()
    }
  }, [activities.length, userId, fetchActivities])

  const series = useMemo(() => buildWeeklySeries(activities), [activities])
  const currentSeries = series[discipline]
  const hasHistory = currentSeries.some(sample => sample.distanceKm > 0 || sample.durationMinutes > 0 || sample.elevationGain > 0)

  useEffect(() => {
    setSelectedIndex(currentSeries.length > 0 ? currentSeries.length - 1 : 0)
  }, [discipline, currentSeries.length])

  useEffect(() => {
    setSelectedIndex(prev => {
      if (currentSeries.length === 0) {
        return 0
      }
      const maxIndex = currentSeries.length - 1
      if (prev > maxIndex) {
        return maxIndex
      }
      if (prev < 0) {
        return maxIndex
      }
      return prev
    })
  }, [currentSeries.length])

  const displayData = currentSeries.length > 0 ? currentSeries : [{
    start: getWeekStart(new Date()).toISOString(),
    distanceKm: 0,
    durationMinutes: 0,
    elevationGain: 0,
  }]

  const safeIndex = Math.min(Math.max(selectedIndex, 0), displayData.length - 1)

  const maxDistance = useMemo(() => {
    const max = Math.max(...displayData.map(item => item.distanceKm))
    return max <= 0 ? 1 : Math.ceil(max)
  }, [displayData])

  const fallbackWidth = useMemo(() => {
    return displayData.length > 1
      ? CHART_PADDING * 2 + DEFAULT_POINT_SPACING * (displayData.length - 1)
      : CHART_PADDING * 2 + DEFAULT_POINT_SPACING
  }, [displayData.length])

  const chartWidth = layoutWidth > 0 ? layoutWidth : fallbackWidth

  const pointSpacing = useMemo(() => {
    if (displayData.length <= 1) return 0
    return (chartWidth - CHART_PADDING * 2) / (displayData.length - 1)
  }, [chartWidth, displayData.length])

  const points = useMemo(() => {
    return displayData.map((item, index) => {
      const x = CHART_PADDING + index * pointSpacing
      const ratio = item.distanceKm / maxDistance
      const usableHeight = CHART_HEIGHT - 40
      const y = CHART_HEIGHT - 10 - ratio * usableHeight
      return {x, y}
    })
  }, [displayData, maxDistance, pointSpacing])

  const pointer = points[safeIndex]
  const pointerLabel = formatRange(displayData[safeIndex].start)

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const gridLines = Array.from({length: displayData.length}, (_, idx) => CHART_PADDING + idx * pointSpacing)

  const monthLabels = useMemo(() => {
    const registry = new Map<string, number>()
    displayData.forEach((item, index) => {
      const label = dayjs(item.start).format('MMM').toUpperCase()
      if (!registry.has(label)) {
        registry.set(label, index)
      }
    })
    return Array.from(registry.entries()).map(([label, index]) => ({
      label,
      x: CHART_PADDING + index * pointSpacing,
    }))
  }, [displayData, pointSpacing])

  const updateFromLocation = useCallback((locationX: number) => {
    if (displayData.length === 0) return
    if (pointSpacing <= 0) {
      setSelectedIndex(displayData.length - 1)
      return
    }
    const relative = locationX - CHART_PADDING
    const rawIndex = Math.round(relative / pointSpacing)
    const nextIndex = Math.max(0, Math.min(displayData.length - 1, rawIndex))
    setSelectedIndex(nextIndex)
  }, [displayData.length, pointSpacing])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          updateFromLocation(evt.nativeEvent.locationX)
        },
        onPanResponderMove: evt => {
          updateFromLocation(evt.nativeEvent.locationX)
        },
      }),
    [updateFromLocation],
  )

  const summary = displayData[safeIndex]
  const normalizedError = error?.toLowerCase() ?? ''
  const isRetryableError = normalizedError.length > 0 && !normalizedError.includes('sign in')
  const metrics = [
    {label: 'Distance', value: `${summary.distanceKm.toFixed(1)} km`},
    {label: 'Time', value: formatDuration(summary.durationMinutes)},
    {label: 'Elevation Gain', value: `${Math.round(summary.elevationGain ?? 0)} m`},
  ]

  const indicatorColor = colors.accent.primary

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width
    if (width !== layoutWidth) {
      setLayoutWidth(width)
    }
  }, [layoutWidth])

  return (
    <View
      className="rounded-3xl p-5 mb-4"
      style={{
        backgroundColor: colors.background.elevated,
        borderWidth: 1,
        borderColor: isDark ? colors.border.medium : colors.border.light,
        shadowColor: isDark ? '#000' : '#1f2937',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: isDark ? 0.45 : 0.15,
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-widest" style={{color: colors.text.secondary}}>
            This week
          </Text>
          <Text className="text-lg font-semibold" style={{color: colors.text.primary}}>
            {pointerLabel}
          </Text>
        </View>
        <View className="flex-row bg-transparent">
          {disciplineTabs.map(tab => {
            const active = discipline === tab.value
            return (
              <Pressable
                key={tab.value}
                onPress={() => setDiscipline(tab.value)}
                className="px-3 py-2 rounded-2xl flex-row items-center ml-2"
                style={{
                  backgroundColor: active ? `${indicatorColor}16` : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? indicatorColor : colors.border.light,
                }}
              >
                <FontAwesome5
                  name={tab.icon as any}
                  size={14}
                  color={active ? indicatorColor : colors.text.secondary}
                />
                <Text
                  className="text-xs font-semibold ml-2"
                  style={{color: active ? colors.text.primary : colors.text.secondary}}
                >
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View className="flex-row mt-4">
        {metrics.map(metric => (
          <View key={metric.label} className="flex-1">
            <Text className="text-xs uppercase tracking-widest" style={{color: colors.text.secondary}}>
              {metric.label}
            </Text>
            <Text className="text-base font-semibold mt-1" style={{color: colors.text.primary}}>
              {metric.value}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center mt-3" style={{minHeight: 20}}>
        {loading && (
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <ActivityIndicator size="small" color={colors.accent.primary} style={{marginRight: 8}} />
            <Text style={{color: colors.text.secondary}}>Updating weekly trend…</Text>
          </View>
        )}
        {!loading && error && (
          isRetryableError ? (
            <Pressable onPress={fetchActivities}>
              <Text style={{color: colors.accent.primary, fontWeight: '600'}}>Tap to retry: {error}</Text>
            </Pressable>
          ) : (
            <Text style={{color: colors.text.secondary}}>{error}</Text>
          )
        )}
        {!loading && !error && !hasHistory && (
          <Text style={{color: colors.text.secondary}}>Start an activity to build your trend.</Text>
        )}
      </View>

      <View style={{height: CHART_HEIGHT + 40, marginTop: 24}} onLayout={handleLayout}>
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}>
          <Line x1={CHART_PADDING} y1={CHART_HEIGHT - 10} x2={chartWidth - CHART_PADDING} y2={CHART_HEIGHT - 10} stroke={isDark ? colors.border.dark : colors.border.light} strokeWidth={1} />
          {gridLines.map((x, idx) => (
            <Line key={idx} x1={x} y1={20} x2={x} y2={CHART_HEIGHT - 10} stroke={idx === gridLines.length - 1 ? indicatorColor : `${colors.border.light}55`} strokeWidth={idx === gridLines.length - 1 ? 1.5 : 1} strokeDasharray={idx === gridLines.length - 1 ? undefined : '4 6'} />
          ))}
          {polylinePoints.length > 0 && (
              <Polyline
                points={polylinePoints}
                stroke={indicatorColor}
                strokeWidth={3}
                fill="none"
              />
            )}
          {points.map((pt, idx) => (
            <Circle key={idx} cx={pt.x} cy={pt.y} r={4} fill={idx === safeIndex ? indicatorColor : colors.background.primary} stroke={indicatorColor} strokeWidth={2} />
          ))}
        </Svg>
        <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 40}} {...panResponder.panHandlers} />
        {pointer && (
          <>
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 40,
                left: pointer.x - 1,
                width: 2,
                backgroundColor: indicatorColor,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: pointer.x - 7,
                top: pointer.y - 7,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: indicatorColor,
              }}
            />
          </>
        )}
        <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 20}}>
          {monthLabels.map(month => (
            <Text
              key={month.label}
              className="text-xs font-semibold"
              style={{
                color: colors.text.secondary,
                position: 'absolute',
                left: Math.max(CHART_PADDING - 12, Math.min(chartWidth - CHART_PADDING - 24, month.x - 18)),
              }}
            >
              {month.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}
