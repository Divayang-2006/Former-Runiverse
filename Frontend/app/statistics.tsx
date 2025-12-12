import React, {useMemo, useState} from 'react'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useRouter} from 'expo-router'
import {View, Text, ScrollView, Pressable} from 'react-native'
import {useTheme} from '../context/ThemeContext'
import {Ionicons, FontAwesome5} from '@expo/vector-icons'

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

type MetricValues = {
  [key in Discipline]: Record<(typeof METRIC_SECTIONS)[number]['id'], Record<string, string>>
}

const DEFAULT_VALUES: MetricValues = {
  run: {
    weekly: {
      Runs: '0',
      Time: '0h',
      Distance: '0 km',
    },
    year: {
      Runs: '0',
      Time: '0h',
      Distance: '0 km',
      'Elevation Gain': '0 m',
    },
    all: {
      Runs: '0',
      Distance: '0 km',
    },
  },
  ride: {
    weekly: {
      Rides: '0',
      Time: '0h',
      Distance: '0 km',
    },
    year: {
      Rides: '0',
      Time: '0h',
      Distance: '0 km',
      'Elevation Gain': '0 m',
    },
    all: {
      Rides: '0',
      Distance: '0 km',
    },
  },
}

export default function StatisticsScreen() {
  const {colors, isDark} = useTheme()
  const router = useRouter()
  const [discipline, setDiscipline] = useState<Discipline>('run')

  const metrics = useMemo(() => DEFAULT_VALUES[discipline], [discipline])

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
          <View style={{width: 44}} />
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

        {METRIC_SECTIONS.map(section => {
          const labels = discipline === 'run' ? section.metrics : section.cyclingMetrics
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
                  const value = metrics[section.id][label] ?? '0'
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
