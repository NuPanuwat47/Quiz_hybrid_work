import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    console.log('Profile screen - Sign out button pressed');
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: () => {
            console.log('User confirmed sign out');
            signOut();
          },
        },
      ]
    );
  };

  // Extract user data from the complex user object structure
  const userData = user?.data || user;
  const fullName = userData?.firstname && userData?.lastname 
    ? `${userData.firstname} ${userData.lastname}`.trim()
    : userData?.name || userData?.email || 'ผู้ใช้';

  console.log('Rendering profile screen for user:', user);
  console.log('Extracted user data:', userData);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>โปรไฟล์</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={100} color="#007bff" />
          {userData?.image && (
            <View style={styles.imageBadge}>
              <Ionicons name="camera" size={16} color="#007bff" />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {fullName}
          </Text>
          
          {userData?.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{userData.email}</Text>
            </View>
          )}

          {(userData?.studentId || userData?.education?.studentId) && (
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                รหัสนักศึกษา: {userData.studentId || userData.education?.studentId}
              </Text>
            </View>
          )}

          {userData?.type && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.infoText}>ประเภท: {userData.type}</Text>
            </View>
          )}

          {userData?.role && (
            <View style={styles.infoRow}>
              <Ionicons name="shield-outline" size={16} color="#666" />
              <Text style={styles.infoText}>บทบาท: {userData.role}</Text>
            </View>
          )}

          {userData?.createdAt && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                เข้าร่วมเมื่อ: {new Date(userData.createdAt).toLocaleDateString('th-TH')}
              </Text>
            </View>
          )}

          {userData?.confirmed !== undefined && (
            <View style={styles.infoRow}>
              <Ionicons 
                name={userData.confirmed ? "checkmark-circle-outline" : "close-circle-outline"} 
                size={16} 
                color={userData.confirmed ? "#28a745" : "#dc3545"} 
              />
              <Text style={[styles.infoText, { color: userData.confirmed ? '#28a745' : '#dc3545' }]}>
                {userData.confirmed ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.signOutSection}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="white" />
          <Text style={styles.signOutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  menuSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  signOutSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  versionInfo: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  versionSubText: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
});

export default ProfileScreen;
