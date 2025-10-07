// JWT Token utilities
import * as SecureStore from 'expo-secure-store';

// Decode JWT token without verification (for client-side use only)
export const decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    console.log('Decoded JWT payload:', decoded);
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

// Get user ID from stored JWT token
export const getUserIdFromToken = async () => {
  try {
    const token = await SecureStore.getItemAsync('jwt_token');
    if (!token) return null;
    
    const decoded = decodeJWT(token);
    return decoded?.id || decoded?._id || decoded?.userId;
  } catch (error) {
    console.error('Failed to get user ID from token:', error);
    return null;
  }
};

// Get full user data from JWT token
export const getUserDataFromToken = async () => {
  try {
    const token = await SecureStore.getItemAsync('jwt_token');
    if (!token) return null;
    
    return decodeJWT(token);
  } catch (error) {
    console.error('Failed to get user data from token:', error);
    return null;
  }
};
