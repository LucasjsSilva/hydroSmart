import Svg, { Polygon } from 'react-native-svg';

export default function Trapezoid() {
  return (
    <Svg height="200" width="150">
      <Polygon
        points="0,0 150,0 100,200 50,200"
        fill="skyblue"
      />
    </Svg>
  );
}
