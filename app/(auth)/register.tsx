// app/(auth)/register.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Camera, ArrowRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { shopService } from '../../src/services/database/shopService';
import { UserRepository, hashPassword } from '../../src/repositories/UserRepository';
import { generateId } from '../../src/services/database/db';
import { useAuth } from '../../src/contexts/AuthContext';
import { BUSINESS_TYPES } from '../../src/constants';

// Business Type selector or generic dropdown
const registerSchema = z.object({
  // Step 1: Shop Details
  shopName: z.string().min(3, 'Shop Name must be at least 3 characters'),
  businessType: z.string().min(1, 'Business Type is required'),
  gst: z.string().optional(),
  address: z.string().optional(),
  // Step 2: Owner Details
  ownerName: z.string().min(3, 'Owner Name must be at least 3 characters'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits').max(12, 'Mobile must be at most 12 digits'),
  // Step 3: Credentials
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, trigger, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      shopName: '',
      businessType: BUSINESS_TYPES[0],
      gst: '',
      address: '',
      ownerName: '',
      mobile: '',
      email: '',
      password: '',
    },
  });

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'You need to allow gallery access to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof RegisterFormValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['shopName', 'businessType', 'gst', 'address'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['ownerName', 'mobile'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      // 1. Create the shop in the database
      const newShop = await shopService.create({
        name: data.shopName,
        ownerName: data.ownerName,
        email: data.email,
        mobile: data.mobile,
        gst: data.gst,
        address: data.address,
        businessType: data.businessType,
        logoUrl: logoUri ?? undefined,
      });

      // 2. Create the owner user record with hashed password
      const userId = generateId();
      await UserRepository.create(userId, newShop.id, {
        fullName: data.ownerName,
        email: data.email,
        mobile: data.mobile,
        passwordHash: hashPassword(data.password),
        role: 'owner',
      });

      // 3. Login with the newly created credentials
      await login(data.email, data.password);

      Alert.alert(t('common.success', 'Success'), 'Shop registered successfully!', [
        { text: 'Let\'s Go', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      Alert.alert(t('common.failed', 'Failed'), 'Email already exists or registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={currentStep > 1 ? prevStep : () => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('register.title', 'Create your shop')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stepper */}
      <View style={styles.stepperContainer}>
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <View style={[
              styles.stepBubble,
              currentStep >= step && styles.stepBubbleActive,
              currentStep > step && styles.stepBubbleCompleted
            ]}>
              {currentStep > step ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>{step}</Text>
              )}
            </View>
            {step < 3 && (
              <View style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <Text style={styles.stepTitle}>
        {currentStep === 1 && t('register.step1', 'Shop Details')}
        {currentStep === 2 && t('register.step2', 'Owner Details')}
        {currentStep === 3 && t('register.step3', 'Business Info')}
      </Text>

      {/* Step Contents */}
      <View style={styles.card}>
        {currentStep === 1 && (
          <View>
            {/* Logo Upload Section */}
            <View style={styles.logoPickerContainer}>
              <TouchableOpacity onPress={pickImage} style={styles.logoCircle} activeOpacity={0.8}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImage} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Camera size={24} color={Colors.textSecondary} />
                  </View>
                )}
                <View style={styles.cameraIconBadge}>
                  <Camera size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.logoLabel}>{logoUri ? t('register.changeLogo', 'Change Logo') : t('register.uploadLogo', 'Upload Logo')}</Text>
            </View>

            <Controller
              control={control}
              name="shopName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.shopName', 'Shop Name')}
                  placeholder={t('placeholders.nameExampleShop', 'e.g. Shayona Kirana Store')}
                  required
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.shopName?.message}
                />
              )}
            />

            <View style={{ marginBottom: Spacing.base }}>
              <Text style={styles.inputLabel}>{t('register.businessType', 'Business Type')} *</Text>
              <View style={styles.dropdownContainer}>
                <Controller
                  control={control}
                  name="businessType"
                  render={({ field: { onChange, value } }) => (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessTypeRow}>
                      {BUSINESS_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[styles.typeBadge, value === type && styles.typeBadgeActive]}
                          onPress={() => onChange(type)}
                        >
                          <Text style={[styles.typeBadgeText, value === type && styles.typeBadgeTextActive]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="gst"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.gst', 'GST Number')}
                  placeholder={t('placeholders.gstExample', 'e.g. 24ABCDE1234F1Z5')}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.gst?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.address', 'Address')}
                  placeholder={t('placeholders.addressExampleShop', 'e.g. Ring Road, Surat, Gujarat')}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.address?.message}
                  multiline
                  numberOfLines={3}
                />
              )}
            />

            <Button
              title={t('common.next', 'Next')}
              icon={<ArrowRight size={18} color="#FFFFFF" />}
              iconPosition="right"
              onPress={nextStep}
              style={styles.actionButton}
            />
          </View>
        )}

        {currentStep === 2 && (
          <View>
            <Controller
              control={control}
              name="ownerName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.ownerName', 'Owner Name')}
                  placeholder={t('placeholders.nameExampleOwner', 'e.g. Krish Vasoya')}
                  required
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.ownerName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="mobile"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.mobile', 'Mobile Number')}
                  placeholder={t('placeholders.mobileExample', 'e.g. 9876543210')}
                  required
                  keyboardType="phone-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.mobile?.message}
                />
              )}
            />

            <View style={styles.stepButtonRow}>
              <Button
                title={t('common.back', 'Back')}
                variant="outline"
                onPress={prevStep}
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.next', 'Next')}
                icon={<ArrowRight size={18} color="#FFFFFF" />}
                iconPosition="right"
                onPress={nextStep}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.email', 'Email Address')}
                  placeholder={t('placeholders.emailExampleOwner', 'e.g. krish@shayonagroup.com')}
                  required
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
                  placeholder={t('placeholders.passwordPlaceholder', 'Min 8 characters')}
                  required
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <View style={styles.stepButtonRow}>
              <Button
                title={t('common.back', 'Back')}
                variant="outline"
                onPress={prevStep}
                style={{ flex: 1 }}
              />
              <Button
                title={t('auth.registerButton', 'Create new account')}
                loading={loading}
                onPress={handleSubmit(onSubmit)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
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
    paddingBottom: Spacing['3xl'],
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
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  stepBubbleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  stepBubbleCompleted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  stepNumberActive: {
    color: Colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  stepTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
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
  logoPickerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  logoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dropdownContainer: {
    marginHorizontal: -Spacing.xl,
  },
  businessTypeRow: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeBadgeActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  typeBadgeTextActive: {
    color: Colors.primary,
  },
  actionButton: {
    marginTop: Spacing.lg,
  },
  stepButtonRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.lg,
  },
});
export default RegisterScreen;
