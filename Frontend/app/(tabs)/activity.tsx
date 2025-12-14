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
  Alert,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";

// --- LOGIC IMPORTS ---
import { ActivityEngine } from '@/services/ActivityServices/ActivityEngine';
import { useActivityStore } from '@/services/ActivityServices/useActivityStore';

// Keeping your original Token
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

// --- HELPER FUNCTIONS ---
const formatDuration = (seconds: number) => {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatPace = (secondsPerKm: number) => {
  if (!secondsPerKm || secondsPerKm === Infinity) return '-.-';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function ActivityScreen() {
  // --- STORE HOOKS ---
  // We subscribe to specific parts of the store to trigger re-renders
  const status = useActivityStore((s) => s.status);
  const duration = useActivityStore((s) => s.durationSeconds);
  const distance = useActivityStore((s) => s.distanceMeters);
  const avgPace = useActivityStore((s) => s.averagePaceSeconds);
  
  // Derived state
  const isRecording = status === 'RECORDING';

  // --- LOCAL UI STATE ---
  const [preset, setPreset] = useState<string>('night');
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('Run');
  const [showActivityMenu, setShowActivityMenu] = useState<boolean>(false);
  
  const cameraRef = useRef<MapboxGL.Camera | null>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // --- HANDLERS ---

  const handleStartStop = async () => {
    const engine = ActivityEngine.getInstance();
    
    if (isRecording) {
      // STOPPING
      console.log('[ActivityUI] User pressed STOP');
      try {
        const result = await engine.stopActivity();
        if (result.success) {
          console.log('[ActivityUI] Activity saved & uploaded successfully');
          Alert.alert('Great Job!', 'Activity saved successfully.');
        } else {
          console.error('[ActivityUI] Upload failed', result.error);
          Alert.alert('Saved Locally', 'Upload failed, but your run is saved on device.');
        }
      } catch (e) {
        console.error('[ActivityUI] CRITICAL ERROR stopping activity', e);
      }
    } else {
      // STARTING
      console.log('[ActivityUI] User pressed START');
      try {
        await engine.startActivity();
        console.log('[ActivityUI] Engine started successfully');
      } catch (e) {
        console.error('[ActivityUI] Failed to start engine', e);
        Alert.alert('Error', 'Could not start GPS tracking. Check permissions.');
      }
    }
    
    setShowActivityMenu(false);
  };

  const onUserLocationUpdate = (location: MapboxGL.Location) => {
    const { latitude, longitude, accuracy: locationAccuracy } = location.coords;
    setUserCoords([longitude, latitude]); // Update local puck
    
    if (Number.isFinite(locationAccuracy)) {
      setAccuracy(Math.min(Math.max(locationAccuracy, 5), 150));
    }
  };

  // Re-center functionality
  const handleRecenter = () => {
    console.log('[ActivityUI] Recenter clicked');
    setAutoFollow(true);
    if (userCoords && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: userCoords,
        zoomLevel: 16,
        pitch: 60,
        animationDuration: 1000,
        heading: 0,
      });
    }
  };

  const onMapTouch = () => {
    if (autoFollow) {
      setAutoFollow(false);
    }
  };

  const toggleActivityMenu = () => {
    if (isRecording) return; // Disable changing activity while running
    setShowActivityMenu((prev) => !prev);
  };

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setShowActivityMenu(false);
  };

  // --- UI RENDER HELPERS ---

  const renderActivityIcon = (activity: ActivityType, size = 24, color = '#FF5500') => {
    switch (activity) {
      case 'Walk': return <MaterialIcons name="directions-walk" size={size} color={color} />;
      case 'Cycling': return <MaterialCommunityIcons name="bike" size={size} color={color} />;
      default: return <MaterialCommunityIcons name="shoe-sneaker" size={size} color={color} />;
    }
  };

  // --- ANIMATIONS & EFFECTS ---

  // Dimensions
  const screenHeight = Dimensions.get('window').height;
  const collapsedHeight = 300;
  const expandedHeight = screenHeight;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
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
    // Time of day logic
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

  // --- RENDER ---
  return (
    <ScreenWrapper unsafe={true}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        
        <Animated.View style={{ flex: 1, opacity: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <MapboxGL.MapView
            style={{ flex: 1 }}
            styleURL={STYLES[preset as keyof typeof STYLES] || STYLES.night}
            scaleBarEnabled={false}
            compassEnabled={false}
            onTouchStart={onMapTouch} 
          >
            {/* Note: We use Mapbox's UserLocation for smoother visual tracking (60fps)
              The Engine records the actual data in background. 
            */}
            <MapboxGL.UserLocation visible onUpdate={onUserLocationUpdate} />
            
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={16}
              centerCoordinate={autoFollow ? userCoords ?? undefined : undefined}
              followUserLocation={autoFollow}
              followZoomLevel={16}
              animationMode="flyTo"
              animationDuration={1000}
            />
            
            {userCoords && (
              <MapboxGL.ShapeSource id="user-puck" shape={{ type: 'Feature', geometry: { type: 'Point', coordinates: userCoords }, properties: {} }}>
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
                <Ionicons name="stats-chart" size={16} color={accuracy && accuracy < 20 ? "#10B981" : "#F87171"} style={{transform: [{rotate: '90deg'}]}} />
                <Text style={[styles.gpsText, accuracy && accuracy < 20 && {color: "#10B981"}]}>
                   {accuracy ? (accuracy < 20 ? "GPS Signal Good" : "Weak GPS Signal") : "Acquiring GPS..."}
                </Text>
                <View style={{flex:1}} />
                <TouchableOpacity style={styles.expandButton} onPress={() => setIsExpanded(true)}>
                  <Feather name="maximize-2" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Metrics Row */}
              <View style={styles.collapsedMetrics}>
                 <View style={styles.metricItem}>
                    <Text style={styles.metricValBig}>{formatDuration(duration)}</Text>
                    <Text style={styles.metricLabel}>Time</Text>
                 </View>
                 
                 <View style={styles.metricItem}>
                    <Text style={styles.metricValBig}>{formatPace(avgPace)}</Text>
                    <Text style={styles.metricLabel}>Avg Pace (/km)</Text>
                 </View>

                 <View style={styles.metricItem}>
                    <Text style={styles.metricValBig}>{(distance / 1000).toFixed(2)}</Text>
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
               <Text style={styles.hugeTimer}>{formatDuration(duration)}</Text>

               {/* Visual Indicator */}
               <View style={styles.centerVisual}>
                <Text style={{fontSize:85, color:'#FFF', fontWeight:'700', fontVariant:['tabular-nums']}}>
                  {formatPace(avgPace)}
                </Text>
               </View>

               <Text style={styles.centerLabel}>Avg Pace (/km)</Text>

               {/* Distance */}
               <Text style={styles.hugeDistance}>{(distance / 1000).toFixed(2)}</Text>
               <Text style={styles.centerLabel}>Distance (km)</Text>

               {/* Splits Section Placeholder */}
               <View style={styles.splitsSection}>
                  <Text style={styles.sectionTitle}>Splits (Coming Soon)</Text>
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

          {/* FIXED BOTTOM CONTROLS */}
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

              <TouchableOpacity 
                style={[styles.controlItem, isRecording && {opacity: 0.5}]} 
                onPress={toggleActivityMenu} 
                activeOpacity={0.85}
                disabled={isRecording}
              >
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
            <TouchableOpacity style={styles.controlItem} onPress={handleStartStop} activeOpacity={0.85}>
              <View style={[styles.playBtn, isRecording && styles.stopBtn]}>
                <Ionicons
                  name={isRecording ? 'stop' : 'play'}
                  size={30}
                  color={isRecording ? '#FF5500' : '#FFF'}
                  style={!isRecording ? { marginLeft: 4 } : undefined}
                />
              </View>
              <Text
                style={[
                  styles.controlText,
                  isRecording ? styles.stopText : styles.activeText,
                ]}
              >
                {isRecording ? 'Stop' : 'Start'}
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
    backgroundColor: '#3A1807', 
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
    backgroundColor: '#2D2D30', 
  },
  playBtn: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#FF5500', 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15, 
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
