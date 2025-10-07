import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { testLikeAPI, testCommentAPI, testAlternativeAPIs, runComprehensiveAPITest } from '../utils/apiTester';

const StatusScreen = () => {
  const [statusPosts, setStatusPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [newStatusText, setNewStatusText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    console.log('StatusScreen component mounted');
    fetchStatusPosts();
  }, []);

  const fetchStatusPosts = async () => {
    console.log('Fetching status posts');
    setLoading(true);
    
    try {
      const response = await ApiService.getAllStatus();
      console.log('Status posts response:', response);
      
      let posts = [];
      if (response && Array.isArray(response)) {
        posts = response;
      } else if (response && response.data) {
        posts = response.data;
      }
      
      console.log('Raw posts data:', posts);
      
      // Process posts to ensure proper like status and user info
      const processedPosts = posts.map((post, index) => {
        const userId = user?._id || user?.id;
        console.log(`Processing post ${index + 1}:`, post);
        console.log(`Current user ID: ${userId}`);
        
        // Check if current user has liked this post - use 'like' array from API
        let isLiked = false;
        
        if (post.like && Array.isArray(post.like)) {
          console.log(`Post ${index + 1} like array:`, post.like);
          isLiked = post.like.some(likeUser => {
            const likeUserId = likeUser._id || likeUser.id;
            console.log(`Comparing like user ID: ${likeUserId} with current user: ${userId}`);
            return likeUserId === userId;
          });
          console.log(`Post ${index + 1} isLiked from like array: ${isLiked}`);
        }
        
        const processedPost = {
          ...post,
          // Map API fields to our expected fields
          id: post._id, // Add id field for compatibility
          isLiked: isLiked,
          likeCount: post.like?.length || 0,
          likes: post.like, // Keep original like array
          commentCount: post.comment?.length || 0,
          comments: post.comment, // Keep original comment array
          author: post.createdBy, // Map createdBy to author for compatibility
          userId: post.createdBy?._id // Add userId for ownership check
        };
        
        console.log(`Final processed post ${index + 1}:`, {
          id: processedPost.id,
          _id: processedPost._id,
          isLiked: processedPost.isLiked,
          likeCount: processedPost.likeCount,
          commentCount: processedPost.commentCount,
          authorId: processedPost.createdBy?._id
        });
        
        return processedPost;
      });
      
      setStatusPosts(processedPosts);
      console.log(`Found ${processedPosts.length} status posts`);
      
    } catch (error) {
      console.error('Failed to fetch status posts:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดโพสต์ได้');
      setStatusPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    console.log('Refreshing status posts');
    setRefreshing(true);
    fetchStatusPosts().finally(() => setRefreshing(false));
  };

  const handleCreateStatus = async () => {
    if (!newStatusText.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ข้อความ');
      return;
    }

    console.log('Creating new status:', newStatusText);
    
    try {
      const statusData = {
        content: newStatusText.trim(),
      };
      
      const response = await ApiService.createStatus(statusData);
      console.log('Create status response:', response);
      
      setNewStatusText('');
      setCreateModalVisible(false);
      fetchStatusPosts(); // Refresh the list
      Alert.alert('สำเร็จ', 'โพสต์ถูกสร้างแล้ว');
    } catch (error) {
      console.error('Failed to create status:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถสร้างโพสต์ได้');
    }
  };

  const handleLikeStatus = async (statusId, isLiked) => {
    console.log(`${isLiked ? 'Unliking' : 'Liking'} status:`, statusId);
    console.log('Current user:', user);
    
    // Validate statusId
    if (!statusId) {
      console.error('No statusId provided');
      Alert.alert('ข้อผิดพลาด', 'ไม่พบ ID ของโพสต์');
      return;
    }
    
    // Validate user
    if (!user) {
      console.error('No user logged in');
      Alert.alert('ข้อผิดพลาด', 'กรุณาเข้าสู่ระบบ');
      return;
    }
    
    // Update UI immediately (optimistic update)
    setStatusPosts(prevPosts => 
      prevPosts.map(post => {
        const postId = post.id || post._id || post.statusId;
        return postId === statusId 
          ? { 
              ...post, 
              isLiked: !isLiked,
              likeCount: (post.likeCount || 0) + (isLiked ? -1 : 1),
              // Mark as pending to show loading state if needed
              likePending: true
            }
          : post;
      })
    );
    
    try {
      if (isLiked) {
        const response = await ApiService.unlikeStatus(statusId);
        console.log('Status unliked successfully:', response);
      } else {
        const response = await ApiService.likeStatus(statusId);
        console.log('Status liked successfully:', response);
      }
      
      // Remove pending state after successful API call
      setStatusPosts(prevPosts => 
        prevPosts.map(post => {
          const postId = post.id || post._id || post.statusId;
          return postId === statusId 
            ? { ...post, likePending: false }
            : post;
        })
      );
      
      // Refresh data after a short delay to get actual server state
      setTimeout(() => {
        console.log('Refreshing status posts to get latest like status');
        fetchStatusPosts();
      }, 500);
      
    } catch (error) {
      console.error('Failed to like/unlike status:', error);
      console.error('Error details:', {
        message: error.message,
        statusId: statusId,
        isLiked: isLiked,
        userId: user?._id || user?.id
      });
      
      // Revert optimistic update on error
      setStatusPosts(prevPosts => 
        prevPosts.map(post => {
          const postId = post.id || post._id || post.statusId;
          return postId === statusId 
            ? { 
                ...post, 
                isLiked: isLiked, // Revert to original state
                likeCount: (post.likeCount || 0) - (isLiked ? -1 : 1), // Revert count
                likePending: false
              }
            : post;
        })
      );
      
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถ${isLiked ? 'ยกเลิก' : ''}ถูกใจได้: ${error.message}`);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !selectedStatus) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ข้อความคอมเม้นท์');
      return;
    }

    const statusId = selectedStatus.id || selectedStatus._id || selectedStatus.statusId;
    
    console.log('Adding comment to status:', statusId, newCommentText);
    console.log('Current user:', user);
    console.log('Selected status:', selectedStatus);
    
    // Validate statusId
    if (!statusId) {
      console.error('No statusId found in selectedStatus');
      Alert.alert('ข้อผิดพลาด', 'ไม่พบ ID ของโพสต์');
      return;
    }
    
    try {
      const commentData = {
        statusId: statusId,
        content: newCommentText.trim(),
      };
      
      console.log('Sending comment data:', commentData);
      const response = await ApiService.addComment(commentData);
      console.log('Add comment response:', response);
      
      // Clear form and close modal first
      setNewCommentText('');
      setCommentModalVisible(false);
      
      // Optimistically add comment to local state
      const newComment = {
        id: response?.id || `temp-${Date.now()}`,
        content: newCommentText.trim(),
        author: {
          name: user?.firstname + ' ' + user?.lastname || user?.name || 'คุณ',
          _id: user?._id || user?.id
        },
        createdAt: new Date().toISOString(),
        ...response
      };
      
      // Update local state immediately
      setStatusPosts(prevPosts => 
        prevPosts.map(post => {
          const postId = post.id || post._id || post.statusId;
          if (postId === statusId) {
            return {
              ...post,
              comments: [...(post.comments || []), newComment],
              commentCount: (post.commentCount || 0) + 1
            };
          }
          return post;
        })
      );
      
      Alert.alert('สำเร็จ', 'คอมเม้นท์ถูกเพิ่มแล้ว');
      
      // Refresh in background to ensure data consistency
      setTimeout(() => {
        fetchStatusPosts();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to add comment:', error);
      console.error('Error details:', {
        message: error.message,
        statusId: statusId,
        commentText: newCommentText,
        userId: user?._id || user?.id
      });
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถเพิ่มคอมเม้นท์ได้: ${error.message}`);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    console.log('Attempting to delete status:', statusId);
    
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบโพสต์นี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบ', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteStatus(statusId);
              console.log('Status deleted successfully');
              fetchStatusPosts(); // Refresh the list
              Alert.alert('สำเร็จ', 'โพสต์ถูกลบแล้ว');
            } catch (error) {
              console.error('Failed to delete status:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบโพสต์ได้');
            }
          }
        }
      ]
    );
  };

  const openCommentModal = (status) => {
    console.log('Opening comment modal for status:', status.id);
    setSelectedStatus(status);
    setCommentModalVisible(true);
  };

  // Debug function to test APIs
  const debugAPIs = () => {
    console.log('=== Starting Comprehensive API Debug Tests ===');
    console.log('Current user:', user);
    console.log('Status posts count:', statusPosts.length);
    
    // Run comprehensive test that covers all scenarios
    runComprehensiveAPITest();
    
    // Also test with current posts if available
    if (statusPosts.length > 0) {
      const firstStatus = statusPosts[0];
      console.log('Testing with first status post:', firstStatus);
      const statusId = firstStatus.id || firstStatus._id || firstStatus.statusId;
      
      if (statusId) {
        console.log('=== Testing with Current Posts ===');
        testAlternativeAPIs(statusId);
        testLikeAPI(statusId);
        testCommentAPI(statusId);
      } else {
        console.log('No valid statusId found in current posts');
      }
    } else {
      console.log('No status posts available for testing');
    }
  };

  const renderStatusPost = ({ item, index }) => {
    console.log(`Rendering status post ${index + 1}:`, item);
    console.log('Status ID:', item.id);
    console.log('Status _id:', item._id);
    console.log('Available keys:', Object.keys(item));
    console.log('createdBy:', item.createdBy);
    
    // Try different ID fields that might be used by the API
    const statusId = item._id || item.id || item.statusId;
    
    // Check ownership using API response structure (createdBy._id)
    const isOwner = user && (
      item.createdBy?._id === user._id || 
      item.createdBy?._id === user.id ||
      item.createdBy?.id === user._id ||
      item.createdBy?.id === user.id ||
      item.author?._id === user._id ||
      item.author?.id === user.id
    );
    
    const isLiked = item.isLiked || false;
    const likeCount = item.likeCount || item.like?.length || 0;
    const commentCount = item.commentCount || item.comment?.length || 0;
    
    console.log('Final statusId:', statusId);
    console.log('User ID (_id):', user?._id);
    console.log('User ID (id):', user?.id);
    console.log('Is owner:', isOwner);

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.authorInfo}>
            <Ionicons name="person-circle" size={40} color="#007bff" />
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>
                {item.createdBy?.email || item.author?.email || 'ผู้ใช้'}
              </Text>
              <Text style={styles.statusDate}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : 'เมื่อสักครู่'}
              </Text>
            </View>
          </View>
          {isOwner && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteStatus(statusId)}
            >
              <Ionicons name="trash-outline" size={20} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.statusContent}>
          {item.content || item.text || 'ไม่มีเนื้อหา'}
        </Text>

        <View style={styles.statusActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLikeStatus(statusId, isLiked)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={20} 
              color={isLiked ? "#dc3545" : "#666"} 
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {likeCount} ถูกใจ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openCommentModal(item)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionText}>{commentCount} คอมเม้นท์</Text>
          </TouchableOpacity>
        </View>

        {item.comments && item.comments.length > 0 && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>คอมเม้นท์:</Text>
            {item.comments.slice(0, 2).map((comment, commentIndex) => (
              <View key={`comment-${commentIndex}`} style={styles.comment}>
                <Text style={styles.commentAuthor}>
                  {comment.createdBy?.email || comment.author?.email || comment.email || 'ผู้ใช้'}:
                </Text>
                <Text style={styles.commentText}>
                  {comment.content || comment.text}
                </Text>
              </View>
            ))}
            {item.comments.length > 2 && (
              <Text style={styles.moreComments}>
                และอีก {item.comments.length - 2} คอมเม้นท์...
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>โพสต์สถานะ</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={debugAPIs}
          >
            <Ionicons name="bug" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {loading && statusPosts.length === 0 && (
        <View style={styles.loadingContainer}>
          <Text>กำลังโหลดโพสต์...</Text>
        </View>
      )}

      {!loading && statusPosts.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>ยังไม่มีโพสต์</Text>
        </View>
      )}

      <FlatList
        data={statusPosts}
        renderItem={renderStatusPost}
        keyExtractor={(item, index) => `status-${index}-${item.id || index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Create Status Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>สร้างโพสต์ใหม่</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.statusInput}
              value={newStatusText}
              onChangeText={setNewStatusText}
              placeholder="คุณกำลังคิดอะไรอยู่?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateStatus}
            >
              <Text style={styles.submitButtonText}>โพสต์</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commentModalVisible}
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เพิ่มคอมเม้นท์</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedStatus && (
              <View style={styles.selectedStatusPreview}>
                <Text style={styles.previewText} numberOfLines={2}>
                  {selectedStatus.content || selectedStatus.text}
                </Text>
              </View>
            )}
            
            <TextInput
              style={styles.commentInput}
              value={newCommentText}
              onChangeText={setNewCommentText}
              placeholder="เขียนคอมเม้นท์..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddComment}
            >
              <Text style={styles.submitButtonText}>เพิ่มคอมเม้นท์</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugButton: {
    backgroundColor: '#dc3545',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#007bff',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
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
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorDetails: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 5,
  },
  statusContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 15,
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#dc3545',
  },
  commentsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
    marginRight: 5,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  moreComments: {
    fontSize: 12,
    color: '#007bff',
    fontStyle: 'italic',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    height: 120,
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    height: 80,
    marginBottom: 20,
  },
  selectedStatusPreview: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StatusScreen;
