// src/components/shared/Logo.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/theme';

interface LogoProps {
  size?: number;
  showText?: boolean;
  theme?: 'light' | 'dark' | 'monochrome';
}

export const Logo: React.FC<LogoProps> = ({ size = 48, showText = false, theme = 'light' }) => {
  const primaryColor = theme === 'monochrome' ? '#000000' : Colors.primary;
  const secondaryColor = theme === 'monochrome' ? '#333333' : Colors.primaryDark;
  const goldColor = theme === 'monochrome' ? '#666666' : Colors.accentGold;
  const textColor = theme === 'dark' ? '#FFFFFF' : Colors.textPrimary;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={primaryColor} />
            <Stop offset="100%" stopColor={secondaryColor} />
          </LinearGradient>
          <LinearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={goldColor} />
            <Stop offset="100%" stopColor={primaryColor} />
          </LinearGradient>
        </Defs>
        
        {/* Left pillar / Business 1 (representing Trust & Foundation) */}
        <Path
          d="M20 80 V40 C20 35 25 30 30 30 H35 V80 H20 Z"
          fill="url(#grad1)"
        />

        {/* Right pillar / Business 2 (representing Expansion & Growth) */}
        <Path
          d="M65 80 V25 C65 20 70 15 75 15 H80 V80 H65 Z"
          fill="url(#grad2)"
          opacity={0.9}
        />

        {/* Connecting Unity bridge/overlapping diamond in center (Unity, Trust, Professionalism) */}
        <Path
          d="M38 50 L50 35 L62 50 L50 65 Z"
          fill={goldColor}
        />

        {/* Horizontal base line representing Solid Platform */}
        <Path
          d="M10 80 H90 V85 H10 Z"
          fill={primaryColor}
        />
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.text, { color: textColor }]}>BillDesk</Text>
          <Text style={styles.subtext}>SHAYONA GROUP</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
  text: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: -2,
  },
});
export default Logo;
