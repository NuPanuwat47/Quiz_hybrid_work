import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';

const ClassScreen = () => {
  const [classMembers, setClassMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [enrollmentYear, setEnrollmentYear] = useState('');

  useEffect(() => {
    console.log('ClassScreen component mounted');
  }, []);

  const fetchClassMembers = async (year) => {
    console.log(`Fetching class members for year: ${year}`);
    setLoading(true);
    
    try {
      const response = await ApiService.getClassByYear(year);
      console.log('Class members response:', response);
      
      // API returns data in response.data, not response.users
      if (response && response.data && Array.isArray(response.data)) {
        setClassMembers(response.data);
        console.log(`Found ${response.data.length} class members`);
      } else if (response && Array.isArray(response)) {
        // Handle case where response is directly an array
        setClassMembers(response);
        console.log(`Found ${response.length} class members`);
      } else {
        setClassMembers([]);
        console.log('No class members found or unexpected response format');
        console.log('Response structure:', Object.keys(response || {}));
      }
    } catch (error) {
      console.error('Failed to fetch class members:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสมาชิกในชั้นปีได้');
      setClassMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleYearSubmit = () => {
    if (!enrollmentYear.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ปีที่เข้าศึกษา');
      return;
    }
    
    console.log('Submitting year:', enrollmentYear);
    setModalVisible(false);
    fetchClassMembers(enrollmentYear);
  };

  const onRefresh = () => {
    if (enrollmentYear) {
      console.log('Refreshing class members data');
      setRefreshing(true);
      fetchClassMembers(enrollmentYear).finally(() => setRefreshing(false));
    }
  };

  const renderMember = ({ item, index }) => {
    console.log(`Rendering member ${index + 1}:`, item);
    console.log('Available keys:', Object.keys(item));
    console.log('Education object:', item.education);
    
    // Create full name from firstname and lastname
    const fullName = `${item.firstname || ''} ${item.lastname || ''}`.trim();
    const displayName = fullName || item.name || item.username || `สมาชิก ${index + 1}`;
    
    // Try to find student ID from various possible locations
    let studentId = item.studentId;
    
    // If not in root, check education object
    if (!studentId && item.education) {
      studentId = item.education.studentId;
    }
    
    // Fallback to _id if no student ID found
    if (!studentId) {
      studentId = item._id || item.id || 'N/A';
    }
    
    console.log('Final studentId:', studentId);
    
    return (
      <View style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {displayName}
          </Text>
          <Text style={styles.memberDetails}>
            รหัสนักศึกษา: {studentId}
          </Text>
          {item.email && (
            <Text style={styles.memberDetails}>อีเมล: {item.email}</Text>
          )}
          {item.education && item.education.year && (
            <Text style={styles.memberDetails}>ปีการศึกษา: {item.education.year}</Text>
          )}
          {item.type && (
            <Text style={styles.memberDetails}>ประเภท: {item.type}</Text>
          )}
          {item.role && (
            <Text style={styles.memberDetails}>บทบาท: {item.role}</Text>
          )}
        </View>
        <View style={styles.memberAvatar}>
          <Ionicons name="person-circle" size={50} color="#007bff" />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>สมาชิกในชั้นปี</Text>
        <TouchableOpacity
          style={styles.selectYearButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="calendar" size={20} color="white" />
          <Text style={styles.selectYearText}>เลือกปี</Text>
        </TouchableOpacity>
      </View>

      {enrollmentYear ? (
        <Text style={styles.currentYear}>ปีที่เข้าศึกษา: {enrollmentYear}</Text>
      ) : (
        <Text style={styles.noYearText}>กรุณาเลือกปีที่เข้าศึกษา</Text>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <Text>กำลังโหลดข้อมูล...</Text>
        </View>
      )}

      {!loading && classMembers.length === 0 && enrollmentYear && (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>ไม่พบสมาชิกในชั้นปีนี้</Text>
        </View>
      )}

      <FlatList
        data={classMembers}
        renderItem={renderMember}
        keyExtractor={(item, index) => `member-${index}-${item.id || item.username || index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกปีที่เข้าศึกษา</Text>
            
            <TextInput
              style={styles.yearInput}
              value={enrollmentYear}
              onChangeText={setEnrollmentYear}
              placeholder="เช่น 2567, 2566"
              keyboardType="numeric"
              maxLength={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleYearSubmit}
              >
                <Text style={styles.confirmButtonText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  selectYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  selectYearText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '600',
  },
  currentYear: {
    textAlign: 'center',
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
    paddingVertical: 10,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  noYearText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  listContainer: {
    padding: 20,
  },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  memberDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  yearInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontWeight: '600',
  },
  confirmButtonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '600',
  },
});

export default ClassScreen;
