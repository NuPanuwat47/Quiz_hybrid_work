// API Test Script - ใช้สำหรับทดสอบ API endpoints ตาม API Documentation

import ApiService from '../services/api';

// Test like functionality according to API docs
export const testLikeAPI = async (statusId) => {
  console.log('=== Testing Like API (API Docs Format) ===');
  
  try {
    console.log('Testing POST /like...');
    const likeResponse = await ApiService.likeStatus(statusId);
    console.log('Like response:', likeResponse);
    
    console.log('Testing DELETE /unlike...');
    const unlikeResponse = await ApiService.unlikeStatus(statusId);
    console.log('Unlike response:', unlikeResponse);
    
  } catch (error) {
    console.error('Like API test failed:', error);
  }
};

// Test comment functionality according to API docs  
export const testCommentAPI = async (statusId) => {
  console.log('=== Testing Comment API (API Docs Format) ===');
  
  try {
    const commentData = {
      statusId: statusId,
      content: 'Test comment from API'
    };
    
    console.log('Testing POST /comment...');
    const addResponse = await ApiService.addComment(commentData);
    console.log('Add comment response:', addResponse);
    
    // If comment has ID, try to delete it
    if (addResponse && addResponse.id) {
      console.log('Testing DELETE /comment/{id}...');
      const deleteResponse = await ApiService.deleteComment(addResponse.id);
      console.log('Delete comment response:', deleteResponse);
    }
    
  } catch (error) {
    console.error('Comment API test failed:', error);
  }
};

// Test class API according to API docs
export const testClassAPI = async (year) => {
  console.log('=== Testing Class API (API Docs Format) ===');
  
  try {
    console.log(`Testing GET /class/${year}...`);
    const classResponse = await ApiService.getClassByYear(year);
    console.log('Class response:', classResponse);
    
  } catch (error) {
    console.error('Class API test failed:', error);
  }
};

// Test different request body formats
export const testAlternativeAPIs = async (statusId) => {
  console.log('=== Testing Alternative API Formats ===');
  
  // Test different like request body formats
  const likeFormats = [
    { statusId: statusId },
    { status_id: statusId },
    { postId: statusId },
    { post_id: statusId },
    { id: statusId }
  ];
  
  for (const [index, format] of likeFormats.entries()) {
    try {
      console.log(`Testing like format ${index + 1}:`, format);
      const response = await ApiService.makeRequest('/like', {
        method: 'POST',
        body: JSON.stringify(format)
      });
      console.log(`Like format ${index + 1} success:`, response);
      
      // Try to unlike immediately
      try {
        await ApiService.makeRequest('/unlike', {
          method: 'DELETE',
          body: JSON.stringify(format)
        });
        console.log(`Unlike format ${index + 1} success`);
      } catch (unlikeError) {
        console.log(`Unlike format ${index + 1} failed:`, unlikeError.message);
      }
      
      break; // If successful, no need to try other formats
    } catch (error) {
      console.log(`Like format ${index + 1} failed:`, error.message);
    }
  }
  
  // Test different comment request body formats
  const commentFormats = [
    { statusId: statusId, content: 'Test comment 1' },
    { status_id: statusId, content: 'Test comment 2' },
    { statusId: statusId, text: 'Test comment 3' },
    { postId: statusId, content: 'Test comment 4' },
    { post_id: statusId, message: 'Test comment 5' }
  ];
  
  for (const [index, format] of commentFormats.entries()) {
    try {
      console.log(`Testing comment format ${index + 1}:`, format);
      const response = await ApiService.makeRequest('/comment', {
        method: 'POST',
        body: JSON.stringify(format)
      });
      console.log(`Comment format ${index + 1} success:`, response);
      break; // If successful, no need to try other formats
    } catch (error) {
      console.log(`Comment format ${index + 1} failed:`, error.message);
    }
  }
};

// Comprehensive API test based on documentation
export const runComprehensiveAPITest = async () => {
  console.log('=== Comprehensive API Test Based on Documentation ===');
  
  try {
    // First get status posts to have data to work with
    console.log('1. Testing GET /status...');
    const statusResponse = await ApiService.getAllStatus();
    console.log('Status posts response:', statusResponse);
    
    if (statusResponse && statusResponse.length > 0) {
      const firstStatus = statusResponse[0];
      const statusId = firstStatus.id || firstStatus._id;
      
      if (statusId) {
        console.log('2. Testing Like APIs...');
        await testLikeAPI(statusId);
        
        console.log('3. Testing Comment APIs...');
        await testCommentAPI(statusId);
        
        console.log('4. Testing Alternative Formats...');
        await testAlternativeAPIs(statusId);
      } else {
        console.log('No valid status ID found for testing');
      }
    } else {
      console.log('No status posts found for testing');
    }
    
    console.log('5. Testing Class API...');
    await testClassAPI('2567'); // Test with a sample year
    
  } catch (error) {
    console.error('Comprehensive API test failed:', error);
  }
};
