import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Polygon, Rect, Defs, ClipPath } from 'react-native-svg';

interface TrapezoidWaterTankProps {
  percentage: number; // 0 - 100
  waterColor: string;
}

export default function TrapezoidWaterTank({ percentage, waterColor }: TrapezoidWaterTankProps) {
  const waterHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(waterHeight, {
      toValue: percentage,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const tankHeightMax = 300;
  const tankHeight = 300;
  const tankTopWidth = 300;
  const tankBottomWidth = 150;
  const tankWidth = tankTopWidth;

  const animatedHeight = waterHeight.interpolate({
    inputRange: [0, 100],
    outputRange: [0, tankHeight],
  });

  const clipPoints = `0,0 ${tankTopWidth},0 ${(tankTopWidth + tankBottomWidth) / 2},${tankHeight} ${(tankTopWidth - tankBottomWidth) / 2},${tankHeight}`;

  const calcularValor = (percentage: number): number => {
    let valor = tankHeight - (percentage / 100) * tankHeight

    if(valor < 0 ) return 0;

    if(valor > tankHeightMax) return tankHeightMax;

    return valor;
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg height={tankHeight} width={tankWidth}>
        <Defs>
          <ClipPath id="clip">
            <Polygon points={clipPoints} />
          </ClipPath>
        </Defs>

        {/* Fundo branco com borda */}
        <Polygon
          points={clipPoints}
          fill="white"
          stroke="#b0c4de"
          strokeWidth={2}
        />

        {/* Água animada contida dentro do trapezoide */}
        <Rect
          x={0}
          y={calcularValor(percentage)}
          width={tankWidth}
          height={(percentage / 100) * tankHeight}
          fill={waterColor}
          clipPath="url(#clip)"
        />
      </Svg>
    </View>
  );
}
