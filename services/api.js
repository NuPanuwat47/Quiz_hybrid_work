import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://cis.kku.ac.th/api/classroom';
const API_KEY = 'c2deee81a448e2552c5a2fa12e88cfaa9c151f514d448707ad3ebc59e04bc000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.apiKey = API_KEY;
  }

  async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('jwt_token');
    const headers = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('API Headers:', headers);
    return headers;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getAuthHeaders();
    
    const config = {
      headers,
      ...options,
    };

    console.log(`Making API request to: ${url}`);
    console.log('Request config:', config);

    try {
      const response = await fetch(url, config);
      console.log(`Response status: ${response.status}`);
      
      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        const text = await response.text();
        console.log('Raw response text:', text);
        data = { message: text || 'Invalid response format' };
      }
      
      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP error! status: ${response.status}`;
        console.error('API Error:', {
          status: response.status,
          url: url,
          errorMessage: errorMessage,
          responseData: data
        });
        throw new Error(errorMessage);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async signIn(credentials) {
    console.log('Attempting to sign in with:', credentials);
    const response = await this.makeRequest('/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    console.log('Raw signin response:', response);
    
    // Handle different response formats
    let userData, token;
    
    if (response.data) {
      // API returns {data: {user data including token}}
      userData = response.data;
      token = userData.token;
    } else if (response.user && response.token) {
      // API returns {user: {...}, token: "..."}
      userData = response.user;
      token = response.token;
    } else if (response.token) {
      // API returns user data directly with token
      userData = response;
      token = response.token;
    } else {
      throw new Error('Invalid response format from server');
    }
    
    if (token) {
      await SecureStore.setItemAsync('jwt_token', token);
      console.log('JWT token saved successfully:', token);
    } else {
      throw new Error('No token received from server');
    }
    
    // Return standardized format
    return {
      user: userData,
      token: token
    };
  }

  async signOut() {
    console.log('Signing out user');
    await SecureStore.deleteItemAsync('jwt_token');
  }

  // Profile
  async getProfile() {
    console.log('Fetching user profile');
    return await this.makeRequest('/profile');
  }

  async updateProfile(profileData) {
    console.log('Updating profile with:', profileData);
    return await this.makeRequest('/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  // Class - Get users by enrollment year
  async getClassByYear(enrollmentYear) {
    console.log(`Fetching class data for year: ${enrollmentYear}`);
    return await this.makeRequest(`/class/${enrollmentYear}`);
  }

  // Status
  async getAllStatus() {
    console.log('Fetching all status posts');
    return await this.makeRequest('/status');
  }

  async getStatusById(id) {
    console.log(`Fetching status post with ID: ${id}`);
    return await this.makeRequest(`/status/${id}`);
  }

  async createStatus(statusData) {
    console.log('Creating new status post:', statusData);
    return await this.makeRequest('/status', {
      method: 'POST',
      body: JSON.stringify(statusData),
    });
  }

  async deleteStatus(id) {
    console.log(`Deleting status post with ID: ${id}`);
    return await this.makeRequest(`/status/${id}`, {
      method: 'DELETE',
    });
  }

  // Like - Like and unlike functionality for status posts
  async likeStatus(statusId) {
    console.log(`Liking status post with ID: ${statusId}`);
    
    if (!statusId) {
      throw new Error('statusId is required for like operation');
    }
    
    console.log('Like endpoint: POST /like');
    
    // Try different request body formats
    const formats = [
      { statusId: statusId },
      { status_id: statusId },
      { postId: statusId },
      { id: statusId }
    ];
    
    for (const [index, format] of formats.entries()) {
      try {
        console.log(`Trying like format ${index + 1}:`, format);
        const response = await this.makeRequest('/like', {
          method: 'POST',
          body: JSON.stringify(format),
        });
        console.log(`Like successful with format ${index + 1}:`, response);
        return response;
      } catch (error) {
        console.log(`Like format ${index + 1} failed:`, error.message);
        if (index === formats.length - 1) {
          throw error; // Throw the last error if all formats fail
        }
      }
    }
  }

  async unlikeStatus(statusId) {
    console.log(`Unliking status post with ID: ${statusId}`);
    
    if (!statusId) {
      throw new Error('statusId is required for unlike operation');
    }
    
    console.log('Unlike endpoints: DELETE /unlike or DELETE /like');
    
    // Try different request body formats with different endpoints
    const endpoints = ['/unlike', '/like'];
    const formats = [
      { statusId: statusId },
      { status_id: statusId },
      { postId: statusId },
      { id: statusId }
    ];
    
    for (const endpoint of endpoints) {
      for (const [formatIndex, format] of formats.entries()) {
        try {
          console.log(`Trying DELETE ${endpoint} with format ${formatIndex + 1}:`, format);
          const response = await this.makeRequest(endpoint, {
            method: 'DELETE',
            body: JSON.stringify(format),
          });
          console.log(`Unlike successful via ${endpoint} with format ${formatIndex + 1}:`, response);
          return response;
        } catch (error) {
          console.log(`DELETE ${endpoint} format ${formatIndex + 1} failed:`, error.message);
        }
      }
    }
    
    // If all attempts fail, throw the last error
    throw new Error('All unlike endpoint attempts failed');
  }

  // Comment - Comment management for status posts
  async addComment(commentData) {
    console.log('Adding comment with data:', commentData);
    console.log('Comment endpoint: POST /comment');
    console.log('Comment request body:', JSON.stringify(commentData));
    
    try {
      const response = await this.makeRequest('/comment', {
        method: 'POST',
        body: JSON.stringify(commentData),
      });
      console.log('Comment added successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    console.log(`Deleting comment with ID: ${commentId}`);
    console.log('Delete comment endpoint: DELETE /comment/{id}');
    
    try {
      const response = await this.makeRequest(`/comment/${commentId}`, {
        method: 'DELETE',
      });
      console.log('Comment deleted successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  // Companies
  async getAllCompanies() {
    console.log('Fetching all companies');
    return await this.makeRequest('/company');
  }

  // Schools
  async getAllSchools() {
    console.log('Fetching all schools');
    return await this.makeRequest('/school');
  }

  // Teachers
  async getAllTeachers() {
    console.log('Fetching all teachers');
    return await this.makeRequest('/teacher');
  }
}

export default new ApiService();
