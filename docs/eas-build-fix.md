<Animated.View
  entering={FadeInDown.duration(400).springify()}
  exiting={FadeOutDown.duration(300)}
  layout={Layout.springify()}
  className="mb-4"
>
  <Pressable
    style={[{
      backgroundColor: colors.background.elevated,
      borderColor: colors.border.medium,
      borderWidth: 1,
      borderRadius: 24,
      padding: 20,
    }]}
    className="active:scale-[0.98]"
  >
    {/* Card header */}
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center gap-3 flex-1">
        {/* Icon */}
        <View className="w-12 h-12 rounded-2xl items-center justify-center">
          <Icon size={24} />
        </View>
        {/* Title & subtitle */}
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: colors.text.primary }}>
            Title
          </Text>
          <Text className="text-sm" style={{ color: colors.text.secondary }}>
            Subtitle
          </Text>
        </View>
      </View>
      {/* Action button (optional) */}
    </View>
    
    {/* Card content */}
  </Pressable>
</Animated.View>

in cas of animations 
Key Points:

entering: Smooth fade-in when item appears
exiting: Smooth fade-out when item is removed (prevents white space!)
layout: Automatically repositions remaining items when list changes
.springify(): Adds natural spring physics to animations
Wrap list in parent Animated.View with layout={Layout.springify()}

ScreenWrapper handles background theming
SafeAreaView ensures content respects device notches/safe areas
ScrollView with paddingBottom: 100 prevents tab bar overlap
paddingHorizontal: 16 provides consistent side margins