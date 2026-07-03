// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
  Alert, Platform, ActivityIndicator, Modal, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTabBarHeight } from '../../src/hooks/useTabBarHeight';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Store, Globe, LogOut, Info, ChevronRight,
  FileDown, UploadCloud, Paintbrush, Check, X, Camera, CreditCard
} from 'lucide-react-native';

import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { useShop } from '../../src/contexts/ShopContext';
import { shopService } from '../../src/services/database/shopService';
import { getCurrentLanguage, changeLanguage } from '../../src/services/i18n';
import { backupService } from '../../src/services/database/backupService';
import { APP_NAME, APP_VERSION } from '../../src/constants';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { Button } from '../../src/components/ui/Button';

const profileSchema = z.object({
  name: z.string().min(2, 'Shop name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  businessType: z.string().min(1, 'Business type is required'),
  address: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const businessSchema = z.object({
  gst: z.string().optional(),
  upiId: z.string().optional(),
  bankDetails: z.string().optional(),
});

type BusinessFormValues = z.infer<typeof businessSchema>;

export function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout, shopId } = useAuth();
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const { theme, setTheme, colors, isDark } = useTheme();
  const currentLang = getCurrentLanguage();

  const [loading, setLoading] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [businessModalVisible, setBusinessModalVisible] = useState(false);

  const { control: profileControl, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: shop?.shopName ?? '',
      ownerName: shop?.ownerName ?? '',
      mobile: shop?.phone ?? '',
      email: shop?.email ?? '',
      businessType: shop?.businessType ?? 'Retailer',
      address: shop?.address ?? '',
    },
  });

  const { control: businessControl, handleSubmit: handleBusinessSubmit, formState: { errors: businessErrors } } = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    values: {
      gst: shop?.gst ?? '',
      upiId: shop?.upiId ?? '',
      bankDetails: shop?.bankDetails ?? '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      shopService.update(shopId || '', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      setProfileModalVisible(false);
      Alert.alert(t('common.success', 'Success'), t('validation.updateSuccess', 'Profile updated successfully!'));
    },
    onError: () => Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Could not update profile.')),
  });

  const updateBusinessMutation = useMutation({
    mutationFn: (values: BusinessFormValues) =>
      shopService.update(shopId || '', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      setBusinessModalVisible(false);
      Alert.alert(t('common.success', 'Success'), t('validation.updateSuccess', 'Business details updated successfully!'));
    },
    onError: () => Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Could not update business details.')),
  });

  const handleLanguageChange = () => {
    const nextLang = currentLang === 'en' ? 'gu' : 'en';
    changeLanguage(nextLang);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await backupService.exportBackup(shopId || '');
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.failed', 'Failed'), t('validation.backupFailed', 'Could not export backup file.'));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      t('settings.restore', 'Restore Data'),
      t('settings.restoreConfirm', 'Importing a backup will merge records. Ensure you select a valid BillDesk backup JSON file.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.confirm', 'Import'),
          onPress: async () => {
            setLoading(true);
            try {
              const success = await backupService.importBackup(shopId || '');
              if (success) {
                Alert.alert(t('common.success', 'Success'), t('validation.saveSuccess', 'Backup data imported successfully!'));
              }
            } catch (e) {
              console.error(e);
              Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Please verify the file format.'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout', 'Logout'),
      t('settings.logoutConfirm', 'Are you sure you want to logout?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.logout', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handlePickLogo = () => {
    Alert.alert(
      t('settings.logoSource', 'Profile Logo Source'),
      t('settings.selectSource', 'Select source for profile photo'),
      [
        { text: t('settings.camera', 'Camera'), onPress: () => pickLogo(true) },
        { text: t('settings.gallery', 'Gallery'), onPress: () => pickLogo(false) },
        { text: t('common.cancel', 'Cancel'), style: 'cancel' }
      ]
    );
  };

  const pickLogo = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t('common.failed', 'Failed'), t('validation.cameraPermission', 'Camera permission is required.'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t('common.failed', 'Failed'), t('validation.galleryPermission', 'Gallery permission is required.'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const pickedUri = result.assets[0].uri;
        const filename = `logo_${Date.now()}.jpg`;
        const destination = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({ from: pickedUri, to: destination });

        await shopService.update(shopId || '', { logo: destination });
        queryClient.invalidateQueries({ queryKey: ['shop'] });
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Could not select photo.'));
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  const tabBarHeight = useTabBarHeight();
  const styles = getStyles(colors);

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title', 'Settings')}</Text>
      </View>

      {/* Shop Profile Summary Card */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => setProfileModalVisible(true)}
        activeOpacity={0.8}
      >
        {shop?.logo ? (
          <Image source={{ uri: shop.logo }} style={styles.logo} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Store size={24} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.shopName} numberOfLines={1}>{shop?.shopName || t('settings.myShop', 'My Shop')}</Text>
          <Text style={styles.ownerName}>{shop?.ownerName || t('register.ownerName', 'Owner')}</Text>
          <Text style={styles.businessType}>{shop?.businessType || 'Retailer'}</Text>
        </View>
        <ChevronRight size={18} color={colors.textDisabled} />
      </TouchableOpacity>

      {/* Settings Options Groups */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appSettings', 'App Settings')}</Text>

        {/* Theme Selector Row */}
        <TouchableOpacity style={styles.rowButton} onPress={() => setThemeModalVisible(true)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
              <Paintbrush size={18} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>{t('settings.theme', 'Theme')}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.langValue}>
              {theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'System Default'}
            </Text>
            <ChevronRight size={16} color={colors.textDisabled} />
          </View>
        </TouchableOpacity>

        {/* Language Row */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: colors.infoLight }]}>
              <Globe size={18} color={colors.info} />
            </View>
            <Text style={styles.rowLabel}>{t('settings.language', 'Language')}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.langValue}>{currentLang === 'en' ? 'English' : 'ગુજરાતી'}</Text>
            <Switch
              value={currentLang === 'gu'}
              onValueChange={handleLanguageChange}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={currentLang === 'gu' ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>


      </View>

      {/* Backup and Restore */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.backup', 'Backup & Restore')}</Text>
        <TouchableOpacity style={styles.rowButton} onPress={handleExport} disabled={loading}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: colors.successLight }]}>
              <FileDown size={18} color={colors.success} />
            </View>
            <Text style={styles.rowLabel}>{t('settings.backup', 'Backup Data (Export JSON)')}</Text>
          </View>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <ChevronRight size={16} color={colors.textDisabled} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowButton} onPress={handleImport} disabled={loading}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
              <UploadCloud size={18} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>{t('settings.restore', 'Restore Data (Import JSON)')}</Text>
          </View>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <ChevronRight size={16} color={colors.textDisabled} />}
        </TouchableOpacity>
      </View>

      {/* Business Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.businessDetails', 'Business Details')}</Text>

        {/* Edit profile row */}
        <TouchableOpacity style={styles.rowButton} onPress={() => setProfileModalVisible(true)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
              <Store size={18} color={colors.primary} />
            </View>
            <Text style={styles.rowLabel}>{t('settings.shopDetails', 'Shop Details')}</Text>
          </View>
          <ChevronRight size={16} color={colors.textDisabled} />
        </TouchableOpacity>

        {/* Business details / credentials edit row */}
        <TouchableOpacity style={styles.rowButton} onPress={() => setBusinessModalVisible(true)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: colors.accentGoldLight }]}>
              <CreditCard size={18} color={colors.accentGold} />
            </View>
            <Text style={styles.rowLabel}>{t('settings.businessDetails', 'Invoice Credentials & Bank')}</Text>
          </View>
          <ChevronRight size={16} color={colors.textDisabled} />
        </TouchableOpacity>

        {/* Support option */}
        <TouchableOpacity style={styles.rowButton} onPress={() => Alert.alert(t('settings.support', 'Support'), `For assistance, email: support@billdesk.com`)}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: colors.successLight }]}>
              <Info size={18} color={colors.success} />
            </View>
            <Text style={styles.rowLabel}>{t('settings.help', 'Support & Help')}</Text>
          </View>
          <ChevronRight size={16} color={colors.textDisabled} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut size={18} color={colors.error} />
        <Text style={styles.logoutText}>{t('settings.logout', 'Logout')}</Text>
      </TouchableOpacity>

      {/* Branding Info */}
      <View style={styles.branding}>
        <Text style={styles.brandPoweredBy}>{t('common.poweredBy', 'Powered by BillDesk')}</Text>
        <Text style={styles.appVersion}>{t('settings.version', 'Version')} {APP_VERSION}</Text>
      </View>

      {/* Theme Bottom Sheet/Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.theme', 'Select Theme')}</Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('light'); setThemeModalVisible(false); }}>
              <Text style={[styles.themeOptionText, theme === 'light' && styles.themeOptionTextSelected]}>{t('settings.themes.light', 'Light Mode')}</Text>
              {theme === 'light' && <Check size={18} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('dark'); setThemeModalVisible(false); }}>
              <Text style={[styles.themeOptionText, theme === 'dark' && styles.themeOptionTextSelected]}>{t('settings.themes.dark', 'Dark Mode')}</Text>
              {theme === 'dark' && <Check size={18} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.themeOption} onPress={() => { setTheme('system'); setThemeModalVisible(false); }}>
              <Text style={[styles.themeOptionText, theme === 'system' && styles.themeOptionTextSelected]}>{t('settings.themes.system', 'System Default')}</Text>
              {theme === 'system' && <Check size={18} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.fullModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.editProfile', 'Edit Shop Profile')}</Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Logo Picker Section */}
            <View style={styles.logoPickerSection}>
              <TouchableOpacity style={styles.logoContainer} onPress={handlePickLogo}>
                {shop?.logo ? (
                  <Image source={{ uri: shop.logo }} style={styles.logoEdit} />
                ) : (
                  <View style={styles.logoPlaceholderEdit}>
                    <Text style={styles.logoInitialEdit}>{(shop?.shopName?.[0] ?? 'B').toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  <Camera size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.logoSubtext}>{t('register.logo', 'Shop Logo')}</Text>
            </View>

            <Controller
              control={profileControl}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('register.shopName', 'Shop Name')}
                  value={value}
                  onChangeText={onChange}
                  error={profileErrors.name?.message}
                />
              )}
            />

            <Controller
              control={profileControl}
              name="ownerName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('register.ownerName', 'Owner Name')}
                  value={value}
                  onChangeText={onChange}
                  error={profileErrors.ownerName?.message}
                />
              )}
            />

            <Controller
              control={profileControl}
              name="mobile"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('register.mobile', 'Mobile Number')}
                  value={value}
                  onChangeText={onChange}
                  error={profileErrors.mobile?.message}
                  keyboardType="phone-pad"
                />
              )}
            />

            <Controller
              control={profileControl}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('auth.email', 'Email Address')}
                  value={value}
                  onChangeText={onChange}
                  error={profileErrors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />

            <Controller
              control={profileControl}
              name="businessType"
              render={({ field: { onChange, value } }) => (
                <Select
                  label={t('register.businessType', 'Business Type')}
                  value={value}
                  options={[
                    { label: 'Retailer', value: 'Retailer' },
                    { label: 'Wholesaler', value: 'Wholesaler' },
                    { label: 'Manufacturer', value: 'Manufacturer' },
                    { label: 'Distributor', value: 'Distributor' },
                    { label: 'Service Provider', value: 'Service Provider' },
                  ]}
                  onChange={onChange}
                  error={profileErrors.businessType?.message}
                />
              )}
            />

            <Controller
              control={profileControl}
              name="address"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('register.address', 'Address')}
                  value={value}
                  onChangeText={onChange}
                  error={profileErrors.address?.message}
                  multiline
                  numberOfLines={3}
                />
              )}
            />

            <Button
              title={t('common.save', 'Save Changes')}
              onPress={handleProfileSubmit(val => updateProfileMutation.mutate(val))}
              loading={updateProfileMutation.isPending}
              style={{ marginTop: Spacing.md, marginBottom: Spacing['4xl'] }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Business Details Modal */}
      <Modal
        visible={businessModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBusinessModalVisible(false)}
      >
        <View style={styles.fullModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.businessDetails', 'Invoice Credentials & Bank')}</Text>
            <TouchableOpacity onPress={() => setBusinessModalVisible(false)}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Controller
              control={businessControl}
              name="gst"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('register.gst', 'GST Number')}
                  value={value}
                  onChangeText={onChange}
                  error={businessErrors.gst?.message}
                  autoCapitalize="characters"
                />
              )}
            />

            <Controller
              control={businessControl}
              name="upiId"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('settings.upiId', 'UPI ID')}
                  value={value}
                  onChangeText={onChange}
                  error={businessErrors.upiId?.message}
                  autoCapitalize="none"
                />
              )}
            />

            <Controller
              control={businessControl}
              name="bankDetails"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('settings.bankDetails', 'Bank Details')}
                  value={value}
                  onChangeText={onChange}
                  error={businessErrors.bankDetails?.message}
                  multiline
                  numberOfLines={4}
                  placeholder={t('placeholders.bankDetails', 'Bank Name, A/C No., IFSC')}
                />
              )}
            />

            <Button
              title={t('common.save', 'Save Changes')}
              onPress={handleBusinessSubmit(val => updateBusinessMutation.mutate(val))}
              loading={updateBusinessMutation.isPending}
              style={{ marginTop: Spacing.md, marginBottom: Spacing['4xl'] }}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    padding: Spacing.base,
    backgroundColor: colors.background,
  },
  header: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadow.sm,
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.base,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  profileInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  ownerName: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  businessType: {
    fontSize: FontSize.xs,
    color: colors.primary,
    fontWeight: FontWeight.semibold,
    marginTop: 4,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  rowButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: colors.textPrimary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  langValue: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginTop: Spacing.base,
  },
  logoutText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: colors.error,
  },
  branding: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
  },
  brandPoweredBy: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  appVersion: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...Shadow.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: Spacing.base,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  themeOptionText: {
    fontSize: FontSize.base,
    color: colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  themeOptionTextSelected: {
    color: colors.primary,
    fontWeight: FontWeight.bold,
  },
  fullModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: Spacing.base,
  },
  modalContent: {
    paddingBottom: 40,
  },
  logoPickerSection: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  logoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholderEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitialEdit: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSubtext: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
});

export default SettingsScreen;
