// src/components/SplashAnimation.tsx
// Animated 5-stage loading sequence overlay.
// Stages: Brand → Billing Concept → Circular Loader → Dashboard → Success → dismiss
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

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const GREEN      = '#00966E';
const GREEN_LIGHT = '#66C29B';
const GOLD       = '#F4B400';
const DARK_BG    = '#121212';
const LIGHT_BG   = '#FFFFFF';
const CARD_DARK  = '#1E1E1E';

// ─── BillDesk Logo Mark (SVG) ─────────────────────────────────────────────────
const BillDeskLogo: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <Svg width={size} height={size * 0.85} viewBox="0 0 120 100">
    <Defs>
      <LinearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor={GREEN_LIGHT} />
        <Stop offset="100%" stopColor={GREEN} />
      </LinearGradient>
    </Defs>
    {/* Left shorter bar */}
    <Rect x="10" y="35" width="28" height="52" rx="5" fill="url(#gGrad)" />
    {/* Right taller bar */}
    <Rect x="82" y="12" width="28" height="75" rx="5" fill="url(#gGrad)" />
    {/* Gold diamond */}
    <Polygon points="60,18 78,42 60,66 42,42" fill={GOLD} />
    {/* Baseline */}
    <Rect x="5" y="87" width="110" height="8" rx="4" fill={GREEN} />
  </Svg>
);

// ─── Checkmark ────────────────────────────────────────────────────────────────
const CheckMark: React.FC<{ size?: number }> = ({ size = 88 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="45" fill={GREEN} opacity={0.15} />
    <Circle cx="50" cy="50" r="36" fill={GREEN} />
    <Path
      d="M30 50 L44 64 L70 36"
      stroke="white"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ progress: Animated.Value }> = ({ progress }) => {
  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
};

// ─── Dot Loader ───────────────────────────────────────────────────────────────
const DotLoader: React.FC = () => {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(180, dots.map(d =>
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ))
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: GREEN,
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
          }}
        />
      ))}
    </View>
  );
};

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
const BarChart: React.FC = () => {
  const heights = [0.4, 0.7, 0.55, 0.9, 0.65, 0.8];
  const anims = useRef(heights.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(60, anims.map((a, i) =>
      Animated.timing(a, {
        toValue: 1, duration: 350, delay: i * 50,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      })
    )).start();
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      {heights.map((h, i) => (
        <Animated.View
          key={i}
          style={{
            width: 14, borderRadius: 3,
            backgroundColor: i % 2 === 0 ? GREEN : GOLD,
            height: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, h * 56] }),
          }}
        />
      ))}
    </View>
  );
};

// ─── Stage type ───────────────────────────────────────────────────────────────
type Stage = 1 | 2 | 3 | 4 | 5;

interface Props { onFinish: () => void; }

// ─── Main Component ───────────────────────────────────────────────────────────
export const SplashAnimation: React.FC<Props> = ({ onFinish }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg       = isDark ? DARK_BG    : LIGHT_BG;
  const textColor = isDark ? '#FFFFFF' : '#1F2937';
  const subColor  = isDark ? '#9CA3AF' : '#6B7280';
  const cardBg    = isDark ? CARD_DARK  : '#F9FAFB';
  const cardBorder = isDark ? '#2A2A2A' : '#E5E7EB';

  const [stage, setStage] = useState<Stage>(1);
  const [checkVisible, setCheckVisible] = useState(false);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const logoRotate  = useRef(new Animated.Value(0)).current;

  // ── helpers ──────────────────────────────────────────────────────────────
  const fadeIn = (duration = 350) =>
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: duration + 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);

  const fadeOut = (cb: () => void) =>
    Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(cb);

  const resetEntry = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    progressAnim.setValue(0);
  };

  const nextStage = (next: Stage | 'done') =>
    fadeOut(() => {
      if (next === 'done') { onFinish(); return; }
      resetEntry();
      setStage(next);
    });

  // ── Stage runners ─────────────────────────────────────────────────────────
  useEffect(() => {
    resetEntry();
    switch (stage) {
      // Stage 1 — Brand splash  (~1.6 s)
      case 1:
        Animated.parallel([
          fadeIn(500),
          Animated.timing(progressAnim, {
            toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false,
          }),
        ]).start(() => setTimeout(() => nextStage(2), 100));
        break;

      // Stage 2 — Smart Billing  (~1 s)
      case 2:
        Animated.parallel([
          fadeIn(),
          Animated.timing(progressAnim, {
            toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false,
          }),
        ]).start(() => setTimeout(() => nextStage(3), 150));
        break;

      // Stage 3 — Circular loader  (~1.2 s)
      case 3: {
        logoRotate.setValue(0);
        Animated.parallel([
          fadeIn(),
          Animated.loop(
            Animated.timing(logoRotate, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
            { iterations: 1 }
          ),
        ]).start(() => setTimeout(() => nextStage(4), 100));
        break;
      }

      // Stage 4 — Dashboard preview  (~1 s)
      case 4:
        Animated.parallel([
          fadeIn(),
          Animated.timing(progressAnim, {
            toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false,
          }),
        ]).start(() => setTimeout(() => nextStage(5), 150));
        break;

      // Stage 5 — Success  (~0.8 s)
      case 5:
        setCheckVisible(true);
        Animated.parallel([
          fadeIn(300),
          Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        ]).start(() => setTimeout(() => nextStage('done'), 700));
        break;
    }
  }, [stage]);

  const spin = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── Stage 1: Brand ────────────────────────────────────────────────── */}
        {stage === 1 && (
          <View style={styles.center}>
            <BillDeskLogo size={100} />
            <Text style={[styles.brandName, { color: textColor }]}>BillDesk</Text>
            <Text style={[styles.brandSub, { color: GREEN }]}>SHAYONA GROUP</Text>
            <View style={styles.progressWrap}>
              <ProgressBar progress={progressAnim} />
              <Text style={[styles.caption, { color: subColor }]}>Initializing…</Text>
            </View>
          </View>
        )}

        {/* ── Stage 2: Smart Billing ───────────────────────────────────────── */}
        {stage === 2 && (
          <View style={styles.center}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Svg width={60} height={50} viewBox="0 0 120 100">
                <Rect x="10" y="5" width="80" height="90" rx="6"
                  fill={isDark ? '#2A2A2A' : '#F3F4F6'} stroke={GREEN} strokeWidth="2" />
                <Rect x="20" y="20" width="50" height="5" rx="2" fill={GREEN_LIGHT} opacity={0.6} />
                <Rect x="20" y="32" width="38" height="4" rx="2" fill={isDark ? '#444' : '#D1D5DB'} />
                <Rect x="20" y="42" width="44" height="4" rx="2" fill={isDark ? '#444' : '#D1D5DB'} />
                <Rect x="20" y="56" width="60" height="1" rx="1" fill={GREEN} opacity={0.3} />
                <Rect x="20" y="65" width="25" height="6" rx="3" fill={GOLD} opacity={0.85} />
                <Circle cx="78" cy="72" r="12" fill={GREEN} opacity={0.15} />
                <Circle cx="78" cy="72" r="9" fill={GREEN} />
                <Path d="M73 72 L77 76 L84 67" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <View style={{ marginLeft: 16 }}>
                <Text style={[styles.cardTitle, { color: textColor }]}>Smart Billing</Text>
                <Text style={[styles.cardSub, { color: subColor }]}>₹ Invoices · Payments</Text>
                <Text style={[styles.cardSub, { color: subColor }]}>Track every rupee</Text>
              </View>
            </View>
            <Text style={[styles.tagline, { color: textColor }]}>
              Smart Billing for{'\n'}Modern Businesses
            </Text>
            <View style={styles.progressWrap}>
              <ProgressBar progress={progressAnim} />
              <Text style={[styles.caption, { color: subColor }]}>Preparing your workspace…</Text>
            </View>
          </View>
        )}

        {/* ── Stage 3: Circular Loader ─────────────────────────────────────── */}
        {stage === 3 && (
          <View style={styles.center}>
            <View style={styles.ringWrap}>
              {/* outer ring */}
              <Svg width={160} height={160} viewBox="0 0 160 160" style={{ position: 'absolute' }}>
                <Circle cx="80" cy="80" r="70" stroke={GREEN_LIGHT} strokeWidth="5" fill="none" opacity={0.2} />
                <Circle cx="80" cy="80" r="70" stroke={GREEN} strokeWidth="5" fill="none"
                  strokeDasharray="220 220" strokeLinecap="round"
                  transform="rotate(-90 80 80)" />
                <Circle cx="80" cy="80" r="70" stroke={GOLD} strokeWidth="3" fill="none"
                  strokeDasharray="55 385" strokeLinecap="round"
                  transform="rotate(30 80 80)" opacity={0.8} />
              </Svg>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <BillDeskLogo size={68} />
              </Animated.View>
            </View>
            <Text style={[styles.tagline, { color: textColor, marginTop: 28 }]}>
              Preparing your workspace…
            </Text>
            <DotLoader />
          </View>
        )}

        {/* ── Stage 4: Dashboard Preview ───────────────────────────────────── */}
        {stage === 4 && (
          <View style={styles.center}>
            <View style={[styles.dashCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.dashHeading, { color: textColor }]}>Business Overview</Text>
              <View style={styles.statsRow}>
                {[
                  { label: 'Revenue', val: '₹2.4L', color: GREEN },
                  { label: 'Pending', val: '₹18K', color: GOLD },
                  { label: 'Invoices', val: '142', color: GREEN },
                ].map(s => (
                  <View key={s.label} style={[styles.statBox, { backgroundColor: isDark ? '#2A2A2A' : '#fff', borderColor: cardBorder }]}>
                    <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                    <Text style={[styles.statLbl, { color: subColor }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 14, alignItems: 'flex-end' }}>
                <BarChart />
              </View>
            </View>
            <Text style={[styles.tagline, { color: textColor }]}>
              Loading your business data…
            </Text>
            <View style={styles.progressWrap}>
              <ProgressBar progress={progressAnim} />
              <Text style={[styles.caption, { color: subColor }]}>Almost ready…</Text>
            </View>
          </View>
        )}

        {/* ── Stage 5: Success ─────────────────────────────────────────────── */}
        {stage === 5 && (
          <View style={styles.center}>
            {checkVisible && (
              <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <CheckMark size={96} />
              </Animated.View>
            )}
            <View style={{ marginTop: 20 }}>
              <BillDeskLogo size={52} />
            </View>
            <Text style={[styles.brandName, { color: textColor, marginTop: 14, fontSize: 26 }]}>
              Welcome Back!
            </Text>
            <Text style={[styles.caption, { color: subColor, marginTop: 6 }]}>
              Opening your workspace…
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Stage indicator dots */}
      <View style={styles.dots}>
        {([1, 2, 3, 4, 5] as Stage[]).map(s => (
          <View
            key={s}
            style={[
              styles.dot,
              {
                backgroundColor: s === stage ? GREEN : (isDark ? '#333' : '#E5E7EB'),
                width: s === stage ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    width: '100%',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 18,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 5,
  },
  tagline: {
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 29,
    marginTop: 24,
  },
  caption: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.2,
  },
  progressWrap: {
    marginTop: 40,
    width: SCREEN_W * 0.62,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: GREEN,
  },
  ringWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    width: SCREEN_W * 0.8,
    marginBottom: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  cardSub: { fontSize: 12, marginTop: 1 },
  dashCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    width: SCREEN_W * 0.84,
    marginBottom: 6,
  },
  dashHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 14,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    padding: 10, alignItems: 'center',
  },
  statVal: { fontSize: 15, fontWeight: '800' },
  statLbl: { fontSize: 10, marginTop: 2 },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 44,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

export default SplashAnimation;
