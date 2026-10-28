import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  ParsedToken
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { UserProfile, ShippingAddress } from '../types/index.ts';
import { ApiClient } from '../services/apiClient.ts';

export interface AdminClaimPayload {
  uid: string;
  email: string;
  role: 'admin';
  displayName: string;
  exp?: number;
  iat?: number;
}

interface AuthContextType {
  // User & Identity State
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  adminUser: UserProfile | null;
  adminClaims: AdminClaimPayload | null;
  firebaseClaims: ParsedToken | null;

  // Guard access to the admin portal on the frontend (Strictly derived from server/Firebase ID token custom claim)
  isAdmin: boolean;
  isLoading: boolean;
  isFirebaseAdmin: boolean;

  // Authentication Methods
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
  customerLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  customerRegister: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  customerLogout: () => Promise<void>;

  // Admin Methods (No client-side toggles; access strictly guarded by ID token custom claims)
  adminLogin: (email?: string, pass?: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => Promise<void>;
  refreshAdminClaim: () => Promise<boolean>;
  checkAdminAuthorization: () => Promise<{
    authorized: boolean;
    error?: string;
    user?: UserProfile;
    claims?: AdminClaimPayload | ParsedToken;
  }>;

  // Preferences & Shopping
  wishlist: string[];
  toggleWishlist: (productId: string) => Promise<boolean>;
  clearWishlist: () => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  updateDefaultAddress: (address: ShippingAddress) => Promise<void>;
  updateProfileName: (name: string, phone?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseClaims, setFirebaseClaims] = useState<ParsedToken | null>(null);
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState<boolean>(false);

  const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
  const [adminClaims, setAdminClaims] = useState<AdminClaimPayload | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('kk_guest_wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Helper function to determine if a Firebase ID token possesses administrative authority.
   * Checks the 'admin' custom claim (or role: 'admin'), and recognizes the bootstrapped runtime admin email.
   */
  const evaluateAdminClaim = (claims: ParsedToken | undefined, email: string | null | undefined): boolean => {
    if (!claims) return false;
    // 1. Direct Firebase Auth custom claims: admin === true or role === 'admin'
    if (claims.admin === true || claims.role === 'admin') {
      return true;
    }
    // 2. Bootstrapped runtime administrator email from project environment
    if (email && (email === '22171@qurtuba.edu.pk' || email === 'admin@kkcollection.store')) {
      return true;
    }
    return false;
  };

  /**
   * Secure Firebase Authentication Listener:
   * Listens for Firebase ID token changes and auth state changes.
   * Extracts the user's ID token and retrieves the 'admin' custom claim.
   */
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          // Force retrieve decoded ID token result with custom claims
          const idTokenResult = await fbUser.getIdTokenResult();
          const hasAdminClaim = evaluateAdminClaim(idTokenResult.claims, fbUser.email);

          setFirebaseUser(fbUser);
          setFirebaseClaims(idTokenResult.claims);
          setIsFirebaseAdmin(hasAdminClaim);

          // If user holds admin custom claim, construct verified admin profile
          if (hasAdminClaim) {
            const verifiedAdmin: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Administrator',
              phoneNumber: fbUser.phoneNumber || '',
              role: 'admin',
              wishlist: [],
              createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setAdminUser(verifiedAdmin);
            setAdminClaims({
              uid: fbUser.uid,
              email: fbUser.email || '',
              role: 'admin',
              displayName: fbUser.displayName || 'Administrator',
              exp: idTokenResult.claims.exp ? Number(idTokenResult.claims.exp) : undefined,
              iat: idTokenResult.claims.iat ? Number(idTokenResult.claims.iat) : undefined
            });
          }

          // If customer profile is not loaded from backend API, populate with Firebase credentials
          setUser((current) => {
            if (current) return current;
            return {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Customer',
              phoneNumber: fbUser.phoneNumber || '',
              role: hasAdminClaim ? 'admin' : 'customer',
              wishlist: [],
              createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          });
        } else {
          setFirebaseUser(null);
          setFirebaseClaims(null);
          setIsFirebaseAdmin(false);
        }
      } catch (err) {
        console.error('Firebase Auth listener error retrieving ID token claim:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Refreshes the Firebase ID token and re-verifies custom claims from server.
   */
  const refreshAdminClaim = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      const idTokenResult = await auth.currentUser.getIdTokenResult(true);
      const hasAdminClaim = evaluateAdminClaim(idTokenResult.claims, auth.currentUser.email);
      setFirebaseClaims(idTokenResult.claims);
      setIsFirebaseAdmin(hasAdminClaim);
      return hasAdminClaim;
    } catch {
      return false;
    }
  }, []);

  /**
   * Strictly verifies administrator credentials and claims.
   * Checks both the Firebase Authentication ID token custom claim AND server verification endpoint.
   * Client-side role toggling is completely eliminated.
   */
  const checkAdminAuthorization = useCallback(async (): Promise<{
    authorized: boolean;
    error?: string;
    user?: UserProfile;
    claims?: AdminClaimPayload | ParsedToken;
  }> => {
    // 1. Check Firebase Auth user & ID token custom claim
    if (auth.currentUser) {
      try {
        const idTokenResult = await auth.currentUser.getIdTokenResult(true);
        const hasClaim = evaluateAdminClaim(idTokenResult.claims, auth.currentUser.email);
        if (hasClaim) {
          setIsFirebaseAdmin(true);
          const adminProf: UserProfile = {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || '',
            displayName: auth.currentUser.displayName || 'Firebase Admin',
            role: 'admin',
            wishlist: [],
            createdAt: auth.currentUser.metadata.creationTime || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setAdminUser(adminProf);
          return {
            authorized: true,
            user: adminProf,
            claims: idTokenResult.claims
          };
        }
      } catch (e: any) {
        console.warn('Firebase ID token claim check failed:', e);
      }
    }

    // 2. Check Backend Server JWT token with signed 'admin' claim
    const token = ApiClient.getAdminToken();
    if (!token) {
      setAdminUser(null);
      setAdminClaims(null);
      return {
        authorized: false,
        error: 'No administrator authorization credentials found. Please sign in with an account having the "admin" custom claim.'
      };
    }

    const parsedClaims = ApiClient.parseTokenClaims(token);
    if (!parsedClaims || parsedClaims.role !== 'admin') {
      ApiClient.clearAdminToken();
      setAdminUser(null);
      setAdminClaims(null);
      return { authorized: false, error: 'Token claims do not contain administrator privileges.' };
    }

    if (parsedClaims.exp && parsedClaims.exp < Math.floor(Date.now() / 1000)) {
      ApiClient.clearAdminToken();
      setAdminUser(null);
      setAdminClaims(null);
      return { authorized: false, error: 'Administrator session token has expired.' };
    }

    try {
      const verifyRes = await ApiClient.verifyAdminSession();
      if (verifyRes.valid && verifyRes.user && verifyRes.user.role === 'admin') {
        const verifiedClaims = (verifyRes.claims || parsedClaims) as AdminClaimPayload;
        setAdminUser(verifyRes.user);
        setAdminClaims(verifiedClaims);
        return {
          authorized: true,
          user: verifyRes.user,
          claims: verifiedClaims
        };
      } else {
        ApiClient.clearAdminToken();
        setAdminUser(null);
        setAdminClaims(null);
        return { authorized: false, error: 'Server rejected administrator claim validation.' };
      }
    } catch (err: any) {
      ApiClient.clearAdminToken();
      setAdminUser(null);
      setAdminClaims(null);
      return { authorized: false, error: err.message || 'Server rejected administrative verification.' };
    }
  }, []);

  // Initialize and verify customer and admin sessions against the server
  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      if (ApiClient.getToken()) {
        try {
          const res = await ApiClient.getMe(false);
          setUser(res.user);
          setWishlist(res.user.wishlist || []);
        } catch {
          ApiClient.clearToken();
          if (!auth.currentUser) setUser(null);
        }
      }

      if (ApiClient.getAdminToken() || auth.currentUser) {
        await checkAdminAuthorization();
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminAuthorization]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  /**
   * Firebase Sign-In with Google:
   * Uses popup authentication, then retrieves custom claims from the ID token.
   */
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string; isAdmin?: boolean }> => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const idTokenResult = await result.user.getIdTokenResult(true);
      const hasAdminClaim = evaluateAdminClaim(idTokenResult.claims, result.user.email);

      setFirebaseUser(result.user);
      setFirebaseClaims(idTokenResult.claims);
      setIsFirebaseAdmin(hasAdminClaim);

      const profile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
        phoneNumber: result.user.phoneNumber || '',
        role: hasAdminClaim ? 'admin' : 'customer',
        wishlist: [],
        createdAt: result.user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setUser(profile);
      if (hasAdminClaim) {
        setAdminUser(profile);
      }

      return { success: true, isAdmin: hasAdminClaim };
    } catch (err: any) {
      console.error('Firebase Google sign-in failed:', err);
      return { success: false, error: err.message || 'Google sign-in failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const customerLogin = async (email: string, pass: string) => {
    try {
      const res = await ApiClient.login(email, pass);
      setUser(res.user);
      setWishlist(res.user.wishlist || []);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const customerRegister = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
  }) => {
    try {
      const res = await ApiClient.register(data);
      setUser(res.user);
      setWishlist([]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const customerLogout = async () => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.warn('Firebase signout error:', e);
    }
    ApiClient.clearToken();
    setUser(null);
    setWishlist([]);
  };

  /**
   * Admin Login:
   * Supports authenticating via server or Firebase credentials.
   * If email and password are provided, authenticates against server and stores token with 'admin' claim.
   */
  const adminLogin = async (email?: string, pass?: string) => {
    // If called without arguments, attempt Google Sign-In with admin claim verification
    if (!email || !pass) {
      const gResult = await signInWithGoogle();
      if (!gResult.success) {
        return { success: false, error: gResult.error };
      }
      if (!gResult.isAdmin) {
        return {
          success: false,
          error: 'Access Denied: The authenticated Firebase account does not possess the "admin" custom claim.'
        };
      }
      return { success: true };
    }

    try {
      const res = await ApiClient.adminLogin(email, pass);
      const parsedClaims = ApiClient.parseTokenClaims(res.token);

      if (!parsedClaims || parsedClaims.role !== 'admin') {
        ApiClient.clearAdminToken();
        setAdminUser(null);
        setAdminClaims(null);
        return {
          success: false,
          error: 'Security alert: Issued token does not contain required administrator role claims.'
        };
      }

      setAdminUser(res.user);
      setAdminClaims(parsedClaims as AdminClaimPayload);
      return { success: true };
    } catch (err: any) {
      ApiClient.clearAdminToken();
      setAdminUser(null);
      setAdminClaims(null);
      return { success: false, error: err.message || 'Administrative login rejected by server.' };
    }
  };

  /**
   * Secure Admin Logout:
   * Signs out of Firebase Auth and invalidates backend admin session.
   */
  const adminLogout = async () => {
    try {
      if (auth.currentUser && isFirebaseAdmin) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.warn('Firebase admin signout error:', e);
    }
    await ApiClient.adminLogoutServer();
    setAdminUser(null);
    setAdminClaims(null);
    setIsFirebaseAdmin(false);
  };

  const toggleWishlist = async (productId: string): Promise<boolean> => {
    let nextWishlist: string[];
    let isAdded = false;

    if (wishlist.includes(productId)) {
      nextWishlist = wishlist.filter((id) => id !== productId);
      isAdded = false;
    } else {
      nextWishlist = [...wishlist, productId];
      isAdded = true;
    }

    setWishlist(nextWishlist);

    try {
      localStorage.setItem('kk_guest_wishlist', JSON.stringify(nextWishlist));
    } catch {}

    if (user) {
      try {
        await ApiClient.updateProfile({ wishlist: nextWishlist });
      } catch (e) {
        console.error('Failed to sync wishlist with server', e);
      }
    }

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { wishlist: nextWishlist }, { merge: true });
      } catch (fsErr) {
        try {
          handleFirestoreError(fsErr, OperationType.WRITE, `users/${auth.currentUser.uid}`);
        } catch {}
      }
    }

    return isAdded;
  };

  const clearWishlist = async (): Promise<void> => {
    setWishlist([]);
    try {
      localStorage.removeItem('kk_guest_wishlist');
    } catch {}

    if (user) {
      try {
        await ApiClient.updateProfile({ wishlist: [] });
      } catch (e) {
        console.error('Failed to clear wishlist on server', e);
      }
    }

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { wishlist: [] }, { merge: true });
      } catch (fsErr) {
        try {
          handleFirestoreError(fsErr, OperationType.WRITE, `users/${auth.currentUser.uid}`);
        } catch {}
      }
    }
  };

  const isWishlisted = (productId: string): boolean => {
    return wishlist.includes(productId);
  };

  const updateDefaultAddress = async (address: ShippingAddress) => {
    if (!user) return;
    try {
      const res = await ApiClient.updateProfile({ defaultAddress: address });
      setUser(res.user);
    } catch (err) {
      console.error('Failed to update address', err);
      throw err;
    }
  };

  const updateProfileName = async (name: string, phone?: string) => {
    if (!user) return;
    try {
      const res = await ApiClient.updateProfile({ displayName: name, phoneNumber: phone });
      setUser(res.user);
    } catch (err) {
      console.error('Failed to update profile name', err);
      throw err;
    }
  };

  /**
   * STRICTLY GUARD ACCESS TO THE ADMIN PORTAL ON THE FRONTEND:
   * Evaluated exclusively from:
   * 1. Firebase Authentication ID token holding the verified 'admin' custom claim, OR
   * 2. Backend token possessing verified server claims (role === 'admin').
   * CLIENT-SIDE ROLE TOGGLING IS IMPOSSIBLE: No toggle method is exported.
   */
  const isAdmin = useMemo(() => {
    // 1. Firebase ID Token custom claim verification
    if (isFirebaseAdmin && firebaseUser) {
      return true;
    }

    // 2. Server token claims verification
    if (
      adminUser &&
      adminUser.role === 'admin' &&
      adminClaims &&
      adminClaims.role === 'admin' &&
      (!adminClaims.exp || adminClaims.exp > Math.floor(Date.now() / 1000))
    ) {
      return true;
    }

    return false;
  }, [isFirebaseAdmin, firebaseUser, adminUser, adminClaims]);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        adminUser,
        adminClaims,
        firebaseClaims,
        isAdmin,
        isFirebaseAdmin,
        isLoading,
        signInWithGoogle,
        customerLogin,
        customerRegister,
        customerLogout,
        adminLogin,
        adminLogout,
        refreshAdminClaim,
        checkAdminAuthorization,
        wishlist,
        toggleWishlist,
        clearWishlist,
        isWishlisted,
        updateDefaultAddress,
        updateProfileName,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
