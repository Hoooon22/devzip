import React from "react";
import { View, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import PropTypes from "prop-types";
import { StyleSheet } from "react-native";

const CustomBubble = (props) => {
  const { cx, cy, payload, size, onBubbleClick } = props;
  // size 값을 면적으로 간주하여 반지름 계산 (Recharts 기본 처리와 동일)
  const radius = Math.sqrt(size);
  
  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${payload.name} 버블`}
      accessibilityHint={`${payload.name} 관련 정보를 확인하려면 탭하세요`}
      onPress={() => onBubbleClick(payload.name)}
      style={({ pressed }) => [
        styles.bubbleContainer,
        pressed && styles.pressed
      ]}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
    >
      <Svg width={radius * 2 + 4} height={radius * 2 + 4}>
        <Circle
          cx={radius + 2}
          cy={radius + 2}
          r={radius}
          fill={payload.fill}
          stroke="white"
          strokeWidth="2"
        />
      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  }
});

CustomBubble.propTypes = {
  cx: PropTypes.number.isRequired,
  cy: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  payload: PropTypes.shape({
    name: PropTypes.string.isRequired,
    fill: PropTypes.string.isRequired
  }).isRequired,
  onBubbleClick: PropTypes.func.isRequired
};

export default CustomBubble;