import React, {useEffect, useMemo, useState} from 'react'
import {View, Text, TouchableOpacity} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import dayjs, {Dayjs} from 'dayjs'
import {useTheme} from '../context/ThemeContext'
import {useStore} from '@/store/useStore'
import {summaryService, type StreakSummaryData} from '@/services/summaryService'

export default function CalendarSection() {
  const today = dayjs()
  const [base, setBase] = useState<Dayjs>(() => dayjs().startOf('month'))
  const {colors, isDark} = useTheme()
  const user = useStore(s => s.user)
  const [streakData, setStreakData] = useState<StreakSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const daysInMonth = base.daysInMonth()
  const firstDayIndex = base.startOf('month').day()

  const monthLabel = base.format('MMMM YYYY')

  function changeMonth(delta: number) {
    setBase((b: Dayjs) => b.add(delta, 'month').startOf('month'))
  }

  useEffect(() => {
    let cancelled = false

    if (!user?.id) {
      setStreakData(null)
      setFetchError(null)
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    const loadStreak = async () => {
      setIsLoading(true)
      setFetchError(null)

      try {
        const data = await summaryService.getStreakSummary()
        if (!cancelled) {
          setStreakData(data)
        }
      } catch (error: unknown) {
        if (!cancelled) {
          console.warn('Failed to load streak summary', error)
          const message = error instanceof Error ? error.message : 'Failed to load streak data'
          const normalizedMessage = typeof message === 'string' && message.toLowerCase().includes('auth') ? 'Please sign in again to view streak data' : message
          setFetchError(normalizedMessage)
          setStreakData(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStreak()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const streakDays = streakData?.streakDays ?? 0
  const streakActivities = streakData?.streakActivities ?? 0

  const markedDays = useMemo(() => {
    if (!streakData) {
      return new Set<number>()
    }

    const set = new Set<number>()
    for (const iso of streakData.activeDays) {
      const parsed = dayjs(iso)
      if (!parsed.isValid()) {
        continue
      }
      if (parsed.year() === base.year() && parsed.month() === base.month()) {
        set.add(parsed.date())
      }
    }
    return set
  }, [base, streakData])

  const grid = useMemo(() => {
    const arr: (number | null)[] = []
    for (let i = 0; i < 42; i++) {
      const dayNum = i - firstDayIndex + 1
      if (dayNum < 1 || dayNum > daysInMonth) arr.push(null)
      else arr.push(dayNum)
    }
    return arr
  }, [firstDayIndex, daysInMonth])

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const arrowColor = colors.text.primary
  const mutedText = colors.text.secondary
  const offMonthText = colors.text.disabled
  const streakDotColor = colors.status.warning
  const todayHighlight = colors.status.warning
  const highlightTextColor = '#FFFFFF'

  return (
    <View
      className="px-4 py-6 rounded-3xl border"
      style={{
        backgroundColor: colors.background.elevated,
        borderColor: isDark ? colors.border.medium : colors.border.light,
        shadowColor: isDark ? '#000000' : '#1f2937',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: isDark ? 0.45 : 0.12,
        shadowRadius: 18,
        elevation: 10,
      }}
    >
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          className="px-2 py-1 rounded-full"
          activeOpacity={0.7}
          style={{backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary}}
        >
          <Ionicons name="chevron-back" size={22} color={arrowColor} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold" style={{color: colors.text.primary}}>
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={() => changeMonth(1)}
          className="px-2 py-1 rounded-full"
          activeOpacity={0.7}
          style={{backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary}}
        >
          <Ionicons name="chevron-forward" size={22} color={arrowColor} />
        </TouchableOpacity>
      </View>

      <View
        className="mt-3 flex-row items-center justify-between rounded-xl px-4 py-3 border"
        style={{
          backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
          borderColor: isDark ? colors.border.dark : colors.border.light,
        }}
      >
        <View className="flex-1">
          <Text className="text-xs" style={{color: mutedText}}>
            Your Streak
          </Text>
          <Text className="text-sm font-medium" style={{color: colors.text.primary}}>
            {isLoading ? '--' : `${streakDays} Days`}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-xs" style={{color: mutedText}}>
            Streak Activities
          </Text>
          <Text className="text-sm font-medium" style={{color: colors.text.primary}}>
            {isLoading ? '--' : streakActivities}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row justify-between px-1">
          {weekdays.map(w => (
            <Text key={w} className="text-xs font-medium w-10 text-center" style={{color: mutedText}}>
              {w}
            </Text>
          ))}
        </View>

        <View className="mt-2">
          {Array.from({length: 6}).map((_, weekIdx: number) => (
            <View key={weekIdx} className="flex-row justify-between items-center mb-1">
              {grid.slice(weekIdx * 7, weekIdx * 7 + 7).map((d: number | null, i: number) => {
                const isToday = d !== null && base.year() === today.year() && base.month() === today.month() && d === today.date()
                const isMarked = d !== null && markedDays.has(d)
                const inMonth = d !== null
                return (
                  <View key={i} className="w-10 h-10 items-center justify-center">
                    <View
                      className="w-8 h-8 items-center justify-center rounded-full"
                      style={{backgroundColor: isToday ? todayHighlight : 'transparent'}}
                    >
                      <Text
                        className={`text-sm ${isToday ? 'font-semibold' : ''}`}
                        style={{
                          color: !inMonth ? offMonthText : isToday ? highlightTextColor : colors.text.primary,
                        }}
                      >
                        {d ?? ''}
                      </Text>
                    </View>
                    {isMarked ? (
                      <View className="w-1.5 h-1.5 rounded-full mt-1" style={{backgroundColor: streakDotColor}} />
                    ) : (
                      <View className="h-2 mt-1" />
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      </View>
      {fetchError ? (
        <Text className="mt-2 text-xs" style={{color: colors.status.error}}>
          {fetchError}
        </Text>
      ) : null}
    </View>
  )
}
