import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StatusBar,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";

// Keeping your original Token and Styles
MapboxGL.setAccessToken(
  'pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtajJnYzhmZjAyd3YzZHM4ZngweGRyeTcifQ.gU_IqqNcuAXXeJbUVKA9_A'
);

const STYLES = {
  day: 'mapbox://styles/imagine-x/cmj2eyc6j008701seashicmfg',
  dawn: 'mapbox://styles/imagine-x/cmj2ii2lj004601se6we6dpp9',
  dusk: 'mapbox://styles/imagine-x/cmj2iqrtg008801se6h4ma35b',
  night: 'mapbox://styles/imagine-x/cmj2isirg007301r4cv1188py',
};

type ActivityType = 'Run' | 'Walk' | 'Cycling';

const SplitAvgVisual = ({ scale = 1 }: { scale?: number }) => (
  <View style={{ transform: [{ scale }] }}>
    <View style={styles.splitVisualTop}>
      <View style={styles.splitVisualDash} />
      <View style={styles.splitVisualDot} />
      <View style={styles.splitVisualDash} />
      <View style={styles.splitVisualDash} />
    </View>
    <View style={styles.splitVisualBottom}>
      <View style={styles.splitVisualDot} />
    </View>
  </View>
);

export default function ActivityScreen() {
  const [preset, setPreset] = useState<string>('night');
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('Run');
  const [showActivityMenu, setShowActivityMenu] = useState<boolean>(false);
  const cameraRef = useRef<MapboxGL.Camera | null>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const onUserLocationUpdate = (location: MapboxGL.Location) => {
    const { latitude, longitude, accuracy: locationAccuracy } = location.coords;
    setUserCoords([longitude, latitude]);
    if (Number.isFinite(locationAccuracy)) {
      setAccuracy(Math.min(Math.max(locationAccuracy, 5), 150));
    }
  };

  // 2. LOGIC: Re-center functionality (Google Maps Style)
  const handleRecenter = () => {
    // Always set to true (don't toggle)
    setAutoFollow(true);
    
    // If we have coordinates, fly to them immediately
    if (userCoords && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: userCoords,
        zoomLevel: 16,
        pitch: 60,

        animationDuration: 1000, // Smooth fly-to animation
        heading: 0, // Optional: Reset rotation to North like G-Maps
      });
    }
  };

  // 3. LOGIC: Stop following when user touches map
  const onMapTouch = () => {
    if (autoFollow) {
      setAutoFollow(false);
    }
  };

  const toggleActiveState = () => {
    setIsActive((prev) => !prev);
    setShowActivityMenu(false);
  };

  const toggleActivityMenu = () => {
    setShowActivityMenu((prev) => !prev);
  };

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setShowActivityMenu(false);
  };

  const renderActivityIcon = (activity: ActivityType, size = 24, color = '#FF5500') => {
    switch (activity) {
      case 'Walk':
        return <MaterialIcons name="directions-walk" size={size} color={color} />;
      case 'Cycling':
        return <MaterialCommunityIcons name="bike" size={size} color={color} />;
      default:
        return <MaterialCommunityIcons name="shoe-sneaker" size={size} color={color} />;
    }
  };

  // Dimensions
  const screenHeight = Dimensions.get('window').height;
  const collapsedHeight = 300; // Adjusted for the card height in screenshot
  const expandedHeight = screenHeight;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 5;
        },
        onPanResponderMove: (_, gestureState) => {
          const newValue = isExpanded ? 1 - gestureState.dy / 300 : -gestureState.dy / 300;
          if (newValue >= 0 && newValue <= 1) {
            sheetAnim.setValue(newValue);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const velocityThreshold = 0.5;
          if (gestureState.dy < -50 || gestureState.vy < -velocityThreshold) {
            setIsExpanded(true);
          } else if (gestureState.dy > 50 || gestureState.vy > velocityThreshold) {
            setIsExpanded(false);
          } else {
            Animated.spring(sheetAnim, {
              toValue: isExpanded ? 1 : 0,
              useNativeDriver: false,
              tension: 65,
              friction: 11,
            }).start();
          }
        },
      }),
    [isExpanded, sheetAnim]
  );

  useEffect(() => {
    // Logic for time of day kept, but UI is strictly dark mode based on image
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) setPreset('dawn');
    else if (hour >= 9 && hour < 17) setPreset('day');
    else if (hour >= 17 && hour < 19) setPreset('dusk');
    else setPreset('night');
  }, []);

  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  }, [isExpanded, sheetAnim]);

  const sheetHeight = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedHeight, expandedHeight],
  });

  const sheetBorderRadius = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <ScreenWrapper unsafe={true}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        
        <Animated.View style={{ flex: 1, opacity: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <MapboxGL.MapView
            style={{ flex: 1 }}
            styleURL={STYLES[preset]}
            scaleBarEnabled={false}
            compassEnabled={false}
            // 4. EVENT: Detect user interaction
            onTouchStart={onMapTouch} 
          >
            <MapboxGL.UserLocation visible onUpdate={onUserLocationUpdate} />
            
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={16}
              // Only pass coordinates if we are in autoFollow mode
              centerCoordinate={autoFollow ? userCoords ?? undefined : undefined}
              followUserLocation={autoFollow}
              followZoomLevel={16}
              animationMode="flyTo"
              animationDuration={1000}
            />
            
            {/* User Puck Layers remain the same */}
            {userCoords && (
              <MapboxGL.ShapeSource id="user-puck" shape={{ type: 'Feature', geometry: { type: 'Point', coordinates: userCoords } }}>
                <MapboxGL.CircleLayer
                  id="puck-accuracy"
                  style={{ circleRadius: 13 + Math.min(accuracy || 0, 120) * 0.25, circleColor: '#70B8FF', circleOpacity: 0.2, circlePitchAlignment: 'map' }}
                />
                <MapboxGL.CircleLayer
                  id="puck-inner"
                  style={{ circleRadius: 8, circleColor: '#4285F4', circleStrokeWidth: 3, circleStrokeColor: 'white', circlePitchAlignment: 'map' }}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>

          {/* Map Overlay Controls */}
          <View style={styles.mapOverlay}>
             <View style={styles.overlayRightCol}>
                <TouchableOpacity style={styles.mapBtn}>
                  <Feather name="layers" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapBtn}>
                  <Text style={{color:'#FFF', fontWeight:'bold'}}>3D</Text>
                </TouchableOpacity>
                
                {/* 5. UI: Dynamic Styles based on autoFollow state */}
                <TouchableOpacity 
                  style={[
                    styles.mapBtn, 
                    autoFollow ? styles.activeMapBtn : styles.inactiveMapBtn
                  ]} 
                  onPress={handleRecenter}
                >
                   <MaterialIcons 
                      name="my-location" 
                      size={20} 
                      // Blue when tracking, White when not (Like Google Maps)
                      color={autoFollow ? "#4285F4" : "#FFFFFF"} 
                   />
                </TouchableOpacity>
             </View>
          </View>
        </Animated.View>


        <Animated.View
          style={[
            styles.sheetContainer,
            {
              height: sheetHeight,
              borderTopLeftRadius: sheetBorderRadius,
              borderTopRightRadius: sheetBorderRadius,
            },
          ]}
        >
          {/* Header / Handle */}
          <View {...panResponder.panHandlers} style={{ width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View style={styles.dragHandle} />
          </View>

          {/* Conditional Content based on Expansion State */}
          {!isExpanded ? (
            <View style={styles.collapsedContent}>
              {/* GPS Signal Warning */}
              <View style={styles.gpsWarning}>
                <Ionicons name="stats-chart" size={16} color="#F87171" style={{transform: [{rotate: '90deg'}]}} />
                <Text style={styles.gpsText}>No GPS signal</Text>
                <View style={{flex:1}} />
                <TouchableOpacity style={styles.expandButton} onPress={() => setIsExpanded(true)}>
                  <Feather name="maximize-2" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Metrics Row */}
              <View style={styles.collapsedMetrics}>
                 <View style={styles.metricItem}>
                    <Text style={styles.metricValBig}>00:00</Text>
                    <Text style={styles.metricLabel}>Time</Text>
                 </View>
                 
                 <View style={styles.metricItem}>
                    <Text style={styles.metricValBig}>-.-.-</Text>
                    <Text style={styles.metricLabel}>Split avg. (/km)</Text>
                 </View>

                 <View style={styles.metricItem}>
                    <Text style={styles.metricValBig}>0</Text>
                    <Text style={styles.metricLabel}>Distance (km)</Text>
                 </View>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.expandedContent} showsVerticalScrollIndicator={false}>
               {/* Close Button Row */}
               <View style={styles.expandedHeader}>
                  <TouchableOpacity onPress={() => setIsExpanded(false)}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
               </View>

               {/* Huge Timer */}
               <Text style={styles.hugeTimer}>00:00:00</Text>

               {/* Visual Indicator */}
               <View style={styles.centerVisual}>
                <Text style={{fontSize:85}}>-.-.-</Text>
               </View>

               <Text style={styles.centerLabel}>Split avg. (/km)</Text>

               {/* Distance */}
               <Text style={styles.hugeDistance}>0</Text>
               <Text style={styles.centerLabel}>Distance (km)</Text>

               {/* Splits Section */}
               <View style={styles.splitsSection}>
                  <Text style={styles.sectionTitle}>Splits (/km)</Text>
                  <View style={styles.splitsRow}>
                     <View style={styles.splitBox} />
                     <View style={styles.splitBox} />
                     <View style={styles.splitBox} />
                  </View>
               </View>

               {/* Space for bottom controls */}
               <View style={{height: 150}} />
            </ScrollView>
          )}

          {/* FIXED BOTTOM CONTROLS (Common to both views) */}
          <View style={styles.bottomControls}>
            {/* Left: Activity Selector */}
            <View style={styles.activitySelector}>
              {showActivityMenu && (
                <View style={styles.activityMenu}>
                  {(['Run', 'Walk', 'Cycling'] as ActivityType[])
                    .filter(option => option !== selectedActivity)
                    .map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.activityMenuItem}
                      onPress={() => handleActivitySelect(option)}
                    >
                      {renderActivityIcon(option, 18, '#FF5500')}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.controlItem} onPress={toggleActivityMenu} activeOpacity={0.85}>
                <View style={[styles.circleBtn, styles.runBtnBg]}>
                  {renderActivityIcon(selectedActivity, 20)}
                  <View style={styles.checkBadge}>
                    <Ionicons name={showActivityMenu ? 'chevron-down' : 'chevron-up'} size={12} color="#FFF" />
                  </View>
                </View>
                <Text style={[styles.controlText, styles.activeText]}>{selectedActivity}</Text>
              </TouchableOpacity>
            </View>

            {/* Center: Start / Stop Button */}
            <TouchableOpacity style={styles.controlItem} onPress={toggleActiveState} activeOpacity={0.85}>
              <View style={[styles.playBtn, isActive && styles.stopBtn]}>
                <Ionicons
                  name={isActive ? 'stop' : 'play'}
                  size={30}
                  color={isActive ? '#FF5500' : '#FFF'}
                  style={!isActive ? { marginLeft: 4 } : undefined}
                />
              </View>
              <Text
                style={[
                  styles.controlText,
                  isActive ? styles.stopText : styles.activeText,
                ]}
              >
                {isActive ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>

            {/* Right: Add Route */}
            <TouchableOpacity style={styles.controlItem}>
              <View style={[styles.circleBtn, styles.routeBtnBg]}>
                 <MaterialCommunityIcons name="source-branch" size={20} color="#FFF" />
              </View>
              <Text style={styles.controlText}>Add{'\n'}Route</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Map Overlay
  mapOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    bottom: 300, 
    justifyContent: 'space-between',
  },
  overlayRightCol: {
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderRadius: 30,
    paddingVertical: 8,
    width: 44,
    alignItems: 'center',
    gap: 16,
  },
  mapBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeMapBtn: {
    backgroundColor: '#FFF',
  },
  inactiveMapBtn: {
    backgroundColor: 'transparent',
  },

  // Sheet Container
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#18181B', // Dark grey/black matching screenshot
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
  },

  // Collapsed Content
  collapsedContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  expandButton: {
    padding: 6,
    borderRadius: 12,
  },
  gpsText: {
    color: '#EF4444', // Reddish
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  collapsedMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 20,
    marginBottom: 40,
  },
  metricItem: {
    alignItems: 'center',
    paddingBottom: 10,
    flex: 1,
  },
  metricValBig: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },

  // Expanded Content
  expandedContent: {
    flex: 1,
    marginTop: 25,
    paddingHorizontal: 20,
  },
  expandedHeader: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  hugeTimer: {
    color: '#FFF',
    fontSize: 72,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginTop: 10,
  },
  centerVisual: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 10,
  },
  splitVisualTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splitVisualBottom: {
    alignItems: 'center',
    marginTop: 12,
  },
  splitVisualDash: {
    width: 32,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  splitVisualDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  centerLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 40,
  },
  hugeDistance: {
    color: '#FFF',
    fontSize: 60,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  splitsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  splitsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  splitBox: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
  },

  bottomControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    marginTop:10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 10,
  },
  activitySelector: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  activityMenu: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(24,24,27,0.95)',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  activityMenuItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(63,63,70,0.6)',
  },
  activityMenuItemActive: {
    backgroundColor: '#FF5500',
  },
  controlItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  runBtnBg: {
    backgroundColor: '#3A1807', // Dark brown/orange background
    borderWidth: 1,
    borderColor: '#5A250A',
  },
  checkBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF5500',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3A1807',
  },
  routeBtnBg: {
    backgroundColor: '#2D2D30', // Dark grey
  },
  playBtn: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#FF5500', // Bright Orange
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15, // Play button sits slightly higher or just larger
    shadowColor: '#FF5500',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  stopBtn: {
    backgroundColor: '#FFF',
    shadowColor: '#FFF',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: '#FF5500',
  },
  controlText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  activeText: {
    color: '#FF5500',
  },
  stopText: {
    color: '#FFF',
  },
});