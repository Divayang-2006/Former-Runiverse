import React, {useMemo, useState, useCallback} from 'react'
import {View, Text, Pressable, PanResponder, LayoutChangeEvent} from 'react-native'
import {useTheme} from '../context/ThemeContext'
import dayjs from 'dayjs'
import Svg, {Polyline, Line, Circle} from 'react-native-svg'
import {FontAwesome5} from '@expo/vector-icons'

interface WeeklySample {
  start: string // ISO date for Monday of the week
  distanceKm: number
  durationMinutes: number
  elevationGain: number
}

type Discipline = 'run' | 'ride'

const SAMPLE_DATA: Record<Discipline, WeeklySample[]> = {
  run: [
    {start: '2025-09-15', distanceKm: 18.2, durationMinutes: 142, elevationGain: 340},
    {start: '2025-09-22', distanceKm: 22.4, durationMinutes: 168, elevationGain: 420},
    {start: '2025-09-29', distanceKm: 16.8, durationMinutes: 130, elevationGain: 280},
    {start: '2025-10-06', distanceKm: 28.6, durationMinutes: 220, elevationGain: 520},
    {start: '2025-10-13', distanceKm: 24.1, durationMinutes: 198, elevationGain: 470},
    {start: '2025-10-20', distanceKm: 29.4, durationMinutes: 232, elevationGain: 540},
    {start: '2025-10-27', distanceKm: 26.1, durationMinutes: 210, elevationGain: 500},
    {start: '2025-11-03', distanceKm: 31.7, durationMinutes: 245, elevationGain: 580},
    {start: '2025-11-10', distanceKm: 21.3, durationMinutes: 162, elevationGain: 360},
    {start: '2025-11-17', distanceKm: 19.4, durationMinutes: 148, elevationGain: 310},
    {start: '2025-11-24', distanceKm: 27.9, durationMinutes: 216, elevationGain: 520},
    {start: '2025-12-01', distanceKm: 33.2, durationMinutes: 256, elevationGain: 610},
  ],
  ride: [
    {start: '2025-09-15', distanceKm: 86.2, durationMinutes: 210, elevationGain: 820},
    {start: '2025-09-22', distanceKm: 94.6, durationMinutes: 228, elevationGain: 910},
    {start: '2025-09-29', distanceKm: 78.4, durationMinutes: 198, elevationGain: 760},
    {start: '2025-10-06', distanceKm: 102.5, durationMinutes: 240, elevationGain: 980},
    {start: '2025-10-13', distanceKm: 96.8, durationMinutes: 236, elevationGain: 940},
    {start: '2025-10-20', distanceKm: 112.7, durationMinutes: 258, elevationGain: 1080},
    {start: '2025-10-27', distanceKm: 98.6, durationMinutes: 244, elevationGain: 890},
    {start: '2025-11-03', distanceKm: 120.3, durationMinutes: 272, elevationGain: 1150},
    {start: '2025-11-10', distanceKm: 87.9, durationMinutes: 214, elevationGain: 780},
    {start: '2025-11-17', distanceKm: 92.1, durationMinutes: 220, elevationGain: 820},
    {start: '2025-11-24', distanceKm: 118.5, durationMinutes: 268, elevationGain: 1100},
    {start: '2025-12-01', distanceKm: 134.2, durationMinutes: 292, elevationGain: 1240},
  ],
}

const CHART_HEIGHT = 140
const CHART_PADDING = 24
const DEFAULT_POINT_SPACING = 48

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

export default function ActivityTrendCard() {
  const {colors, isDark} = useTheme()
  const [discipline, setDiscipline] = useState<Discipline>('run')
  const data = useMemo(() => SAMPLE_DATA[discipline], [discipline])
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1)
  const [layoutWidth, setLayoutWidth] = useState(0)

  // recompute selected index when discipline changes
  React.useEffect(() => {
    setSelectedIndex(SAMPLE_DATA[discipline].length - 1)
  }, [discipline])

  const maxDistance = useMemo(() => {
    const max = Math.max(...data.map(item => item.distanceKm))
    return max <= 0 ? 1 : Math.ceil(max)
  }, [data])

  const fallbackWidth = useMemo(() => {
    return data.length > 1
      ? CHART_PADDING * 2 + DEFAULT_POINT_SPACING * (data.length - 1)
      : CHART_PADDING * 2 + DEFAULT_POINT_SPACING
  }, [data.length])

  const chartWidth = layoutWidth > 0 ? layoutWidth : fallbackWidth

  const pointSpacing = useMemo(() => {
    if (data.length <= 1) return 0
    return (chartWidth - CHART_PADDING * 2) / (data.length - 1)
  }, [chartWidth, data.length])

  const points = useMemo(() => {
    return data.map((item, index) => {
      const x = CHART_PADDING + index * pointSpacing
      const ratio = item.distanceKm / maxDistance
      const usableHeight = CHART_HEIGHT - 40
      const y = CHART_HEIGHT - 10 - ratio * usableHeight
      return {x, y}
    })
  }, [data, maxDistance, pointSpacing])

  const pointer = points[selectedIndex]
  const pointerLabel = formatRange(data[selectedIndex].start)

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const gridLines = Array.from({length: data.length}, (_, idx) => CHART_PADDING + idx * pointSpacing)

  const monthLabels = useMemo(() => {
    const registry = new Map<string, number>()
    data.forEach((item, index) => {
      const label = dayjs(item.start).format('MMM').toUpperCase()
      if (!registry.has(label)) {
        registry.set(label, index)
      }
    })
    return Array.from(registry.entries()).map(([label, index]) => ({
      label,
      x: CHART_PADDING + index * pointSpacing,
    }))
  }, [data, pointSpacing])

  const updateFromLocation = useCallback((locationX: number) => {
    if (data.length === 0) return
    if (pointSpacing <= 0) {
      setSelectedIndex(data.length - 1)
      return
    }
    const relative = locationX - CHART_PADDING
    const rawIndex = Math.round(relative / pointSpacing)
    const nextIndex = Math.max(0, Math.min(data.length - 1, rawIndex))
    setSelectedIndex(nextIndex)
  }, [data.length, pointSpacing])

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

  const summary = data[selectedIndex]
  const metrics = [
    {label: 'Distance', value: `${summary.distanceKm.toFixed(1)} km`},
    {label: 'Time', value: formatDuration(summary.durationMinutes)},
    {label: 'Elevation Gain', value: `${summary.elevationGain} m`},
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
            <Circle key={idx} cx={pt.x} cy={pt.y} r={4} fill={idx === selectedIndex ? indicatorColor : colors.background.primary} stroke={indicatorColor} strokeWidth={2} />
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
