import React, { createContext, useContext, useReducer, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import ApiService from '../services/api';
import { getUserDataFromToken, getUserIdFromToken } from '../utils/jwtUtils';

const AuthContext = createContext();

const authReducer = (state, action) => {
  console.log('Auth reducer action:', action.type, action.payload);
  
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SIGN_OUT':
      return { ...state, user: null, isAuthenticated: false, error: null };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('Checking authentication status...');
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      if (token) {
        console.log('JWT token found');
        
        // Get user data from JWT token first
        const tokenUserData = await getUserDataFromToken();
        console.log('User data from JWT token:', tokenUserData);
        
        try {
          // Try to fetch fresh profile from API
          const apiUserData = await ApiService.getProfile();
          console.log('User profile from API:', apiUserData);
          
          // Combine token data with API data, prioritizing API data but ensuring _id exists
          const combinedUserData = {
            ...tokenUserData,
            ...apiUserData,
            _id: apiUserData._id || tokenUserData?.id || tokenUserData?._id,
            id: apiUserData.id || apiUserData._id || tokenUserData?.id
          };
          
          dispatch({ type: 'SET_USER', payload: combinedUserData });
          console.log('Combined user data set:', combinedUserData);
        } catch (profileError) {
          console.error('Failed to fetch user profile from API:', profileError);
          
          // If API fails but we have token data, use token data
          if (tokenUserData) {
            const fallbackUserData = {
              ...tokenUserData,
              _id: tokenUserData.id || tokenUserData._id,
              id: tokenUserData.id || tokenUserData._id
            };
            dispatch({ type: 'SET_USER', payload: fallbackUserData });
            console.log('Using fallback user data from token:', fallbackUserData);
          } else {
            // Token might be expired, remove it
            await SecureStore.deleteItemAsync('jwt_token');
            dispatch({ type: 'SET_USER', payload: null });
          }
        }
      } else {
        console.log('No JWT token found');
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await SecureStore.deleteItemAsync('jwt_token');
      dispatch({ type: 'SET_USER', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const signIn = async (credentials) => {
    console.log('Signing in with credentials:', credentials);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      const response = await ApiService.signIn(credentials);
      console.log('Sign in response:', response);
      
      if (response.user) {
        dispatch({ type: 'SET_USER', payload: response.user });
        console.log('User signed in successfully:', response.user);
      } else {
        throw new Error('No user data received from server');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const signOut = async () => {
    console.log('Signing out user');
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await ApiService.signOut();
      dispatch({ type: 'SIGN_OUT' });
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    signIn,
    signOut,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
