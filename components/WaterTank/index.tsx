import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface WaterTankProps {
  percentage: number; // 0 - 100
  waterColor: string;
}

export default function WaterTank({ percentage, waterColor }: WaterTankProps) {
  const waterHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(waterHeight, {
      toValue: percentage,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const tankHeight = 200;
  const tankWidth = 100;

  const animatedHeight = waterHeight.interpolate({
    inputRange: [0, 100],
    outputRange: [0, tankHeight],
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg height={tankHeight} width={tankWidth} style={{ borderWidth: 2, borderColor: 'black' }}>
        <Rect
          x={0}
          y={tankHeight}
          width={tankWidth}
          height={0}
          fill={waterColor}
        />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            width: tankWidth,
            height: animatedHeight,
            backgroundColor: waterColor,
          }}
        />
      </Svg>
    </View>
  );
}
