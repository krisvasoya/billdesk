// src/components/StartupScreen.tsx
//
// Premium 4-phase startup experience for BillDesk:
//
//  Phase 1 — Logo Reveal      (700ms)   scale 0.9→1 + fade, soft float
//  Phase 2 — Loading          (until isReady) spinning arc + real status messages
//  Phase 3 — Success          (600ms)   checkmark + "Welcome back"
//  Phase 4 — Exit             (350ms)   full-screen fade out → onFinish
//
// The overlay is mounted on top of the Stack (navigation always inits in bg).
// isReady is true when DB + auth context are both settled.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN         = '#00966E';
const GREEN_LIGHT   = '#66C29B';
const GREEN_PALE    = '#E8F8F2';
const GOLD          = '#F4B400';
const DARK_BG       = '#0D1117';
const LIGHT_BG      = '#FFFFFF';
const CHARCOAL      = '#1F2937';

// ─── Status messages shown during real loading ─────────────────────────────
const STATUS_MESSAGES = [
  'Connecting to database…',
  'Loading your data…',
  'Syncing invoices…',
  'Preparing dashboard…',
  'Finalizing…',
];

// ─── BillDesk Logo (SVG, larger) ────────────────────────────────────────────
const BillDeskLogo: React.FC<{ size: number }> = ({ size }) => {
  const s   = size;
  const h   = s * 0.85;
  return (
    <Svg width={s} height={h} viewBox="0 0 120 102">
      <Defs>
        <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={GREEN_LIGHT} />
          <Stop offset="100%" stopColor={GREEN} />
        </LinearGradient>
        <LinearGradient id="baseGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%"   stopColor={GREEN} />
          <Stop offset="100%" stopColor={GREEN_LIGHT} />
        </LinearGradient>
      </Defs>
      {/* Left bar — shorter */}
      <Rect x="8"  y="36" width="26" height="52" rx="6" fill="url(#barGrad)" />
      {/* Right bar — taller */}
      <Rect x="86" y="13" width="26" height="75" rx="6" fill="url(#barGrad)" />
      {/* Gold diamond */}
      <Polygon points="60,16 80,42 60,68 40,42" fill={GOLD} />
      {/* Baseline */}
      <Rect x="4" y="89" width="112" height="9" rx="4.5" fill="url(#baseGrad)" />
    </Svg>
  );
};

// ─── Spinning progress arc ────────────────────────────────────────────────────
const SpinningArc: React.FC<{ size: number; isDark: boolean }> = ({ size, isDark }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const r   = size / 2 - 6;
  const cx  = size / 2;
  const circ = 2 * Math.PI * r;

  return (
    <Animated.View
      style={{ position: 'absolute', transform: [{ rotate: spin }] }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track ring */}
        <Circle
          cx={cx} cy={cx} r={r}
          stroke={isDark ? '#2A3040' : GREEN_PALE}
          strokeWidth={5}
          fill="none"
        />
        {/* Gold trailing arc (stationary visual accent) */}
        <Circle
          cx={cx} cy={cx} r={r}
          stroke={GOLD}
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${circ * 0.15} ${circ * 0.85}`}
          strokeLinecap="round"
          transform={`rotate(200 ${cx} ${cx})`}
          opacity={0.7}
        />
        {/* Main green spinning arc */}
        <Circle
          cx={cx} cy={cx} r={r}
          stroke={GREEN}
          strokeWidth={5}
          fill="none"
          strokeDasharray={`${circ * 0.28} ${circ * 0.72}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
    </Animated.View>
  );
};

// ─── Animated checkmark ───────────────────────────────────────────────────────
const AnimatedCheck: React.FC<{ size?: number }> = ({ size = 80 }) => {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill={GREEN} opacity={0.12} />
        <Circle cx="50" cy="50" r="38" fill={GREEN} />
        <Path
          d="M28 50 L44 66 L72 34"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};

// ─── Soft particle field (very subtle floating dots) ─────────────────────────
const Particles: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      x: (0.05 + Math.random() * 0.9) * W,
      y: (0.05 + Math.random() * 0.9) * H,
      r: 2 + Math.random() * 4,
      color: i % 3 === 0 ? GOLD : GREEN,
      anim: new Animated.Value(0),
      duration: 2400 + Math.random() * 1600,
    }))
  ).current;

  useEffect(() => {
    particles.forEach(p => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(p.anim, {
            toValue: 1,
            duration: p.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(p.anim, {
            toValue: 0,
            duration: p.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      // stagger start
      setTimeout(() => loop.start(), Math.random() * 2000);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.r * 2,
            height: p.r * 2,
            borderRadius: p.r,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, isDark ? 0.22 : 0.14],
            }),
            transform: [
              {
                translateY: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -14],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
};

// ─── Premium background ───────────────────────────────────────────────────────
const PremiumBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
    {/* Soft gradient blob — bottom-left green */}
    <View
      style={{
        position: 'absolute',
        bottom: -H * 0.15,
        left: -W * 0.2,
        width: W * 0.8,
        height: W * 0.8,
        borderRadius: W * 0.4,
        backgroundColor: isDark ? '#00966E18' : '#00966E0C',
      }}
    />
    {/* Soft gradient blob — top-right gold */}
    <View
      style={{
        position: 'absolute',
        top: -H * 0.08,
        right: -W * 0.25,
        width: W * 0.65,
        height: W * 0.65,
        borderRadius: W * 0.325,
        backgroundColor: isDark ? '#F4B40010' : '#F4B40008',
      }}
    />
    {/* Subtle bottom gradient strip */}
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: H * 0.12,
        backgroundColor: isDark ? '#00966E08' : '#00966E05',
      }}
    />
  </View>
);

// ─── Cycling status message ───────────────────────────────────────────────────
const StatusMessage: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [index, setIndex] = useState(0);
  const fadeMsg = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(fadeMsg, {
        toValue: 0, duration: 220, useNativeDriver: true,
      }).start(() => {
        setIndex(i => (i + 1) % STATUS_MESSAGES.length);
        Animated.timing(fadeMsg, {
          toValue: 1, duration: 280, useNativeDriver: true,
        }).start();
      });
    }, 1200);
    return () => clearInterval(cycle);
  }, []);

  return (
    <Animated.Text
      style={[
        styles.statusMsg,
        { color: isDark ? '#8B95A1' : '#6B7280', opacity: fadeMsg },
      ]}
    >
      {STATUS_MESSAGES[index]}
    </Animated.Text>
  );
};

// ─── Phase types ──────────────────────────────────────────────────────────────
type Phase = 'reveal' | 'loading' | 'success' | 'exit';

// ─── Main export ─────────────────────────────────────────────────────────────
export interface StartupScreenProps {
  /** Set to true when the DB and auth context are fully initialized */
  isReady: boolean;
  /** Called after the exit fade completes — remove the overlay */
  onFinish: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ isReady, onFinish }) => {
  const isDark = useColorScheme() === 'dark';
  const textColor = isDark ? '#F9FAFB' : CHARCOAL;

  const [phase, setPhase] = useState<Phase>('reveal');
  const [readyTriggered, setReadyTriggered] = useState(false);

  // Shared animations
  const masterOpacity = useRef(new Animated.Value(1)).current; // for exit fade
  const logoScale     = useRef(new Animated.Value(0.88)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoY         = useRef(new Animated.Value(12)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // ── Phase 1: Logo Reveal ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal') return;

    // Small delay so native splash has fully hidden
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, friction: 8, tension: 60, useNativeDriver: true,
        }),
        Animated.timing(logoY, {
          toValue: 0, duration: 600,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]).start(() => {
        // Brief pause, then cross-fade to loading phase
        setTimeout(() => {
          Animated.timing(contentOpacity, {
            toValue: 1, duration: 350, useNativeDriver: true,
          }).start();
          setPhase('loading');
        }, 120);
      });
    }, 80);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Phase 2: Watch for isReady ────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'loading' && isReady && !readyTriggered) {
      setReadyTriggered(true);
      // Give at least 400ms in loading phase for visual completeness
      setTimeout(() => setPhase('success'), 400);
    }
  }, [phase, isReady, readyTriggered]);

  // ── Phase 3: Success ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'success') return;
    Animated.timing(successOpacity, {
      toValue: 1, duration: 280, useNativeDriver: true,
    }).start(() => {
      // Hold success for 650ms then exit
      setTimeout(() => setPhase('exit'), 650);
    });
  }, [phase]);

  // ── Phase 4: Exit ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exit') return;
    Animated.timing(masterOpacity, {
      toValue: 0, duration: 380,
      easing: Easing.in(Easing.quad), useNativeDriver: true,
    }).start(() => onFinish());
  }, [phase]);

  const LOGO_SIZE = Math.round(W * 0.32); // ~30% wider than a typical 24% logo
  const RING_SIZE = LOGO_SIZE + 52;        // ring around logo

  return (
    <Animated.View style={[styles.root, { opacity: masterOpacity }]}>
      <PremiumBackground isDark={isDark} />
      <Particles isDark={isDark} />

      {/* ── Centered logo + ring ───────────────────────────────────────── */}
      <View style={styles.logoArea}>
        {/* Spinning arc (visible during loading phase) */}
        {(phase === 'loading') && (
          <SpinningArc size={RING_SIZE} isDark={isDark} />
        )}

        {/* Success ring pulse (replaces spinner) */}
        {phase === 'success' && (
          <Animated.View style={{ position: 'absolute', opacity: successOpacity }}>
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_SIZE / 2 - 6}
                stroke={GREEN}
                strokeWidth={5}
                fill="none"
                opacity={0.35}
              />
            </Svg>
          </Animated.View>
        )}

        {/* The logo itself */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateY: logoY }],
          }}
        >
          <BillDeskLogo size={LOGO_SIZE} />
        </Animated.View>
      </View>

      {/* ── Text area below logo ───────────────────────────────────────── */}
      <Animated.View style={[styles.textArea, { opacity: contentOpacity }]}>
        {/* App name — always visible once content fades in */}
        {(phase === 'loading' || phase === 'reveal') && (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.appName, { color: textColor }]}>BillDesk</Text>
            <Text style={[styles.companyTag, { color: GREEN }]}>SHAYONA GROUP</Text>
          </View>
        )}

        {/* Loading status messages */}
        {phase === 'loading' && (
          <View style={styles.statusArea}>
            <StatusMessage isDark={isDark} />
          </View>
        )}

        {/* Success content */}
        {phase === 'success' && (
          <Animated.View style={[styles.successArea, { opacity: successOpacity }]}>
            <AnimatedCheck size={72} />
            <Text style={[styles.welcomeText, { color: textColor }]}>Welcome back</Text>
            <Text style={[styles.welcomeSub, { color: isDark ? '#8B95A1' : '#6B7280' }]}>
              Opening your workspace…
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* ── Brand footer ──────────────────────────────────────────────── */}
      <Animated.View style={[styles.footer, { opacity: logoOpacity }]}>
        <View style={[styles.footerDot, { backgroundColor: GREEN }]} />
        <Text style={[styles.footerText, { color: isDark ? '#4B5563' : '#9CA3AF' }]}>
          Powered by Shayona Group
        </Text>
        <View style={[styles.footerDot, { backgroundColor: GOLD }]} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  textArea: {
    alignItems: 'center',
    marginTop: 8,
    minHeight: 120,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 16,
  },
  companyTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  statusArea: {
    marginTop: 32,
    alignItems: 'center',
    minHeight: 24,
  },
  statusMsg: {
    fontSize: 13,
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  successArea: {
    alignItems: 'center',
    marginTop: 24,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 18,
    letterSpacing: -0.3,
  },
  welcomeSub: {
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});

export default StartupScreen;
