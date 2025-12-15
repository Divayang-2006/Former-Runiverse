import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import CustomInput from '@/components/CustomInput';
import { useStore } from '@/store/useStore';
import { Link, useRouter } from 'expo-router';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/AuthService';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen = () => {
   const { theme } = useTheme();
   const router = useRouter();
   const user = useStore((s) => s.user);
   const updateUser = useStore((s) => s.updateUser);

   const isDarkMode = theme === 'dark';
   const bgClass = isDarkMode ? 'bg-background-dark' : 'bg-gray-100';
   const textClass = isDarkMode ? 'text-text-primary' : 'text-gray-900';
   const cardBgClass = isDarkMode ? 'bg-card-dark' : 'bg-white';

   const [username, setUsername] = useState(user?.username || '');
   const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
   const [pickedImage, setPickedImage] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);

   const dirty = pickedImage !== null || username !== (user?.username || '') || avatarUrl !== (user?.avatarUrl || '');

   const pickImage = async () => {
      try {
         const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
         if (status !== 'granted') {
            Alert.alert('Permission required', 'Allow photo library access to choose an avatar.');
            return;
         }
         const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
         });
         if (!result.canceled) {
            const uri = result.assets[0].uri;
            setPickedImage(uri);
            setAvatarUrl(uri); // for now treat same as avatarUrl until backend upload implemented
         }
      } catch (e: any) {
         Alert.alert('Image Picker Error', e.message || 'Could not pick image');
      }
   };

   const removeImage = async () => {
      try {
         setLoading(true);
         setPickedImage(null);
         setAvatarUrl('');
         const { success, data, message } = await profileService.updateUserProfile({ avatarUrl: null });
         if (success && data) {
            updateUser(data);
            Alert.alert('Removed', 'Avatar removed successfully.');
         } else {
            Alert.alert('Error', message || 'Failed to remove avatar');
         }
      } catch (e: any) {
         Alert.alert('Error', e.message || 'Unexpected error while removing avatar');
      } finally {
         setLoading(false);
      }
   };

   const onSave = async () => {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
         Alert.alert('Validation', 'Username is required');
         return;
      }
      try {
         setLoading(true);
         const payload = { username: trimmedUsername, avatarUrl: avatarUrl.trim() };
         const { success, data, message } = await profileService.updateUserProfile(payload);
         if (success && data) {
            updateUser(data);
            Alert.alert('Success', message || 'Profile updated');
            router.back();
         } else {
            Alert.alert('Error', message || 'Failed to update profile');
         }
      } catch (e: any) {
         Alert.alert('Error', e.message || 'Unexpected error');
      } finally {
         setLoading(false);
      }
   };

   return (
      <SafeAreaView className={`flex-1 ${bgClass}`}>
         <View className="flex-row items-center px-6 py-4">
            <Link href="/(tabs)/profile" asChild>
               <TouchableOpacity className="p-2 mr-4" disabled={loading}>
                  <Ionicons name="arrow-back" size={26} color={isDarkMode ? 'white' : 'black'} />
               </TouchableOpacity>
            </Link>
            <Text className={`text-2xl font-bold ${textClass}`}>Edit Profile</Text>
         </View>

         <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
            <View className={`rounded-xl p-6 mt-4 shadow-md ${cardBgClass}`}>
               {/* Avatar Section */}
               <Text className={`text-base mb-2 ${textClass}`}>Avatar</Text>
               <View className="flex-row items-center mb-4">
                  {(pickedImage || avatarUrl) ? (
                     <Image
                        source={{ uri: pickedImage || avatarUrl }}
                        className="w-20 h-20 rounded-full mr-4"
                     />
                  ) : (
                     <View className="w-20 h-20 rounded-full mr-4 bg-gray-400 items-center justify-center">
                        <Ionicons name="person" size={36} color="#fff" />
                     </View>
                  )}
                  <View className="flex-1">
                     <TouchableOpacity
                        onPress={pickImage}
                        disabled={loading}
                        className="bg-primary-green py-2 px-4 rounded-lg mb-2"
                     >
                        <Text className="text-white text-center font-medium">Choose Photo</Text>
                     </TouchableOpacity>
                     {(pickedImage || avatarUrl) && (
                        <TouchableOpacity
                           onPress={removeImage}
                           disabled={loading}
                           className="bg-red-500 py-2 px-4 rounded-lg"
                        >
                           <Text className="text-white text-center font-medium">Remove</Text>
                        </TouchableOpacity>
                     )}
                  </View>
               </View>

               {/* Username Field */}
               <Text className={`text-base mb-2 ${textClass}`}>Username</Text>
               <CustomInput
                  iconName="account"
                  placeholder="Enter username"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                  editable={!loading}
               />

               {/* Avatar URL Field */}
               <Text className={`text-base mt-4 mb-2 ${textClass}`}>Avatar URL</Text>
               <CustomInput
                  iconName="image"
                  placeholder="https://..."
                  autoCapitalize="none"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  editable={!loading}
               />

               {/* Save Changes Button */}
               <TouchableOpacity
                  onPress={onSave}
                  disabled={loading || !dirty}
                  className={`mt-6 py-3 rounded-lg ${(loading || !dirty) ? 'opacity-60' : ''} bg-primary-green`}
               >
                  {loading ? (
                     <ActivityIndicator color="#fff" />
                  ) : (
                     <Text className="text-white text-center text-lg font-semibold">Save Changes</Text>
                  )}
               </TouchableOpacity>
            </View>
         </ScrollView>
      </SafeAreaView>
   );
};

export default EditProfileScreen;