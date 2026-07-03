// app/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      // Simulate sending reset link
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSent(true);
    } catch (error) {
      Alert.alert(t('common.failed', 'Failed'), 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('auth.forgotPassword', 'Forgot Password?')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          {sent
            ? t('auth.resetPasswordSent', 'A reset link has been sent to your email address. Please follow the instructions in the email to restore access.')
            : t('auth.resetPasswordDesc', 'Enter your registered email address below, and we will send you a secure link to reset your account password.')}
        </Text>

        {!sent ? (
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
                  leftIcon={<Mail size={20} color={Colors.textSecondary} />}
                />
              )}
            />

            <Button
              title={t('auth.resetPassword', 'Reset Password')}
              loading={loading}
              onPress={handleSubmit(onSubmit)}
              style={styles.submitButton}
            />
          </View>
        ) : (
          <Button
            title={t('auth.signIn', 'Back to Sign In')}
            onPress={() => router.replace('/login')}
            style={styles.signInButton}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  content: {
    marginTop: Spacing.xl,
  },
  description: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
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
  submitButton: {
    marginTop: Spacing.base,
  },
  signInButton: {
    marginTop: Spacing.base,
  },
});
export default ForgotPasswordScreen;
