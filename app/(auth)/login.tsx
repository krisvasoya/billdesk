// app/(auth)/login.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, CloudLightning, Zap, Globe, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Logo } from '../../src/components/shared/Logo';
import { useAuth } from '../../src/contexts/AuthContext';
import { getCurrentLanguage, changeLanguage } from '../../src/services/i18n';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const currentLang = getCurrentLanguage();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t('common.failed', 'Failed'), error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'gu' : 'en';
    changeLanguage(nextLang);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      {/* Top Bar for Language Switcher */}
      <View style={styles.topBar}>
        <View style={styles.langSelector}>
          <Globe size={16} color={Colors.textSecondary} />
          <Text style={styles.langText}>{currentLang === 'en' ? 'English' : 'ગુજરાતી'}</Text>
          <Switch
            value={currentLang === 'gu'}
            onValueChange={toggleLanguage}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={currentLang === 'gu' ? Colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.logoSection}>
        <Logo size={70} showText={true} />
        <Text style={styles.welcomeTitle}>{t('auth.welcome', 'Welcome to BillDesk')}</Text>
        <Text style={styles.tagline}>{t('auth.tagline', 'Smart billing for modern businesses')}</Text>
      </View>

      <View style={styles.card}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('auth.email', 'Email Address')}
              placeholder={t('placeholders.emailExampleLogin', 'e.g. owner@shayonagroup.com')}
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('auth.password', 'Password')}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
              rightIcon={showPassword ? <EyeOff size={20} color={Colors.textSecondary} /> : <Eye size={20} color={Colors.textSecondary} />}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
          )}
        />

        <View style={styles.row}>
          <Controller
            control={control}
            name="rememberMe"
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.8}
                onPress={() => onChange(!value)}
              >
                <View style={[styles.checkbox, value && styles.checkboxActive]}>
                  {value && <View style={styles.checkboxTick} />}
                </View>
                <Text style={styles.checkboxLabel}>{t('auth.rememberMe', 'Remember me')}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotText}>{t('auth.forgotPassword', 'Forgot Password?')}</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={t('auth.loginButton', 'Login to your account')}
          loading={loading}
          onPress={handleSubmit(onSubmit)}
          style={styles.submitButton}
        />

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orContinueWith', 'Or continue with')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title={t('auth.googleLogin', 'Continue with Google')}
          variant="outline"
          onPress={() => Alert.alert('Google Auth', 'Google login integration coming soon')}
          style={styles.googleButton}
        />
      </View>

      <View style={styles.registerContainer}>
        <Text style={styles.noAccountText}>{t('auth.dontHaveAccount', "Don't have an account?")}</Text>
        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.registerLink}>{t('auth.register', 'Register')}</Text>
        </TouchableOpacity>
      </View>

      {/* Trust Badges */}
      <View style={styles.trustBadges}>
        <View style={styles.badgeItem}>
          <View style={styles.badgeIconBg}>
            <ShieldCheck size={18} color={Colors.primary} />
          </View>
          <Text style={styles.badgeTitle}>{t('auth.secureLogin', 'Secure Login')}</Text>
        </View>
        <View style={styles.badgeItem}>
          <View style={styles.badgeIconBg}>
            <CloudLightning size={18} color={Colors.primary} />
          </View>
          <Text style={styles.badgeTitle}>{t('auth.cloudSync', 'Cloud Sync')}</Text>
        </View>
        <View style={styles.badgeItem}>
          <View style={styles.badgeIconBg}>
            <Zap size={18} color={Colors.primary} />
          </View>
          <Text style={styles.badgeTitle}>{t('auth.fastBilling', 'Fast Billing')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing['3xl'],
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.md,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  welcomeTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  tagline: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxTick: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  checkboxLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  submitButton: {
    marginBottom: Spacing.base,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
    fontWeight: FontWeight.semibold,
  },
  googleButton: {
    borderColor: Colors.border,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  noAccountText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing['3xl'],
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: Spacing.xl,
  },
  badgeItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgeIconBg: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
});
export default LoginScreen;
