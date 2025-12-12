import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(
  'pk.eyJ1IjoiaW1hZ2luZS14IiwiYSI6ImNtajJnYzhmZjAyd3YzZHM4ZngweGRyeTcifQ.gU_IqqNcuAXXeJbUVKA9_A'
);

const STYLES = {
  day: 'mapbox://styles/imagine-x/cmj2eyc6j008701seashicmfg',
  dawn: 'mapbox://styles/imagine-x/cmj2ii2lj004601se6we6dpp9',
  dusk: 'mapbox://styles/imagine-x/cmj2iqrtg008801se6h4ma35b',
  night: 'mapbox://styles/imagine-x/cmj2isirg007301r4cv1188py',
};

export default function ActivityScreen() {
  const [preset, setPreset] = useState<keyof typeof STYLES>('day');
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 9) setPreset('dawn');
    else if (hour >= 9 && hour < 17) setPreset('day');
    else if (hour >= 17 && hour < 19) setPreset('dusk');
    else setPreset('night');
  }, []);

  const onUserLocationUpdate = (location: MapboxGL.Location) => {
    const { latitude, longitude, accuracy: locationAccuracy } = location.coords;
    setUserCoords([longitude, latitude]);
    if (Number.isFinite(locationAccuracy)) {
      const clampedAccuracy = Math.min(Math.max(locationAccuracy as number, 5), 150);
      setAccuracy(clampedAccuracy);
    }
  };

  const handleToggleFollow = () => {
    const nextState = !autoFollow;
    setAutoFollow(nextState);

    if (nextState && userCoords) {
      cameraRef.current?.setCamera({
        centerCoordinate: userCoords,
        zoomLevel: 16,
        animationDuration: 1000,
      });
    }else if(!nextState){
      cameraRef.current?.setCamera({
        zoomLevel: 11,
        animationDuration: 400,
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={STYLES[preset]}
        scaleBarEnabled={false}
        compassEnabled={true}
        compassViewMargins={{ x: 20, y: 35 }}
        compassViewSize={80}
      >
        <MapboxGL.UserLocation
          visible
          onUpdate={onUserLocationUpdate}
        />
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={16}
          centerCoordinate={autoFollow ? userCoords ?? undefined : undefined}
          followUserLocation={autoFollow}
          followZoomLevel={16}
          animationMode="easeTo"
          animationDuration={500}
        />

        {userCoords && (
          <MapboxGL.ShapeSource
            id="smoothed-puck-source"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: userCoords,
              },
            }}
          >
            {accuracy != null && (
              <MapboxGL.CircleLayer
                id="puck-accuracy-ring"
                style={{
                  circleRadius: 13 + Math.min(accuracy, 120) * 0.25,
                  circleColor: '#70B8FF',
                  circleOpacity: 0.12,
                  circlePitchAlignment: 'map',
                }}
              />
            )}
            <MapboxGL.CircleLayer
              id="puck-white-border"
              style={{
                circleRadius: 13,
                circleColor: '#ffffff',
                circleOpacity: 1,
                circlePitchAlignment: 'map',
              }}
            />
            <MapboxGL.CircleLayer
              id="puck-blue-core"
              style={{
                circleRadius: 10,
                circleColor: '#70B8FF',
                circleOpacity: 1,
                circlePitchAlignment: 'map',
              }}
              aboveLayerID="puck-white-border"
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      <View style={styles.controlsContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.dotButton, styles.controlSpacer, autoFollow && styles.dotButtonActive]}
          onPress={handleToggleFollow}
          accessibilityLabel="Toggle auto follow"
          accessibilityRole="button"
        >
          <View style={styles.dotButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  dotButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotButtonActive: {
    borderColor: '#70B8FF',
  },
  controlSpacer: {
    marginTop: 12,
  },
  dotButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#70B8FF',
  },
});