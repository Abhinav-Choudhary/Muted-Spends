import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithCustomToken, signInAnonymously } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, Timestamp, deleteDoc, doc, QuerySnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import type { Unsubscribe, DocumentData } from "firebase/firestore";

declare global {
    const __initial_auth_token: string;
    const __app_id: string;
}

// Define a type for your transaction data
export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    description: string;
    amount: number;
    timestamp: Timestamp;
    category?: string;
    paymentMethod?: string;
}

// Define a type for data when adding a new transaction
export type AddTransactionData = Omit<Transaction, 'id' | 'timestamp'> & { date: string };


// Helper function to check for canvas environment
const isCanvas = typeof __initial_auth_token !== 'undefined';

// Your web app's Firebase configuration from .env
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const transactionsCollectionRef = (userId: string) => {
    // The __app_id is a unique identifier for your canvas environment.
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-expense-tracker-pro';
    
    // Check if the environment is a canvas and adjust path accordingly
    const path = isCanvas ? `artifacts/${appId}/users/${userId}/transactions` : `users/${userId}/transactions`;
    return collection(db, path);
};


// Sign in with Google provider
const provider = new GoogleAuthProvider();
export const signInWithGoogle = () => {
    signInWithPopup(auth, provider).catch((error) => {
        console.error("Error signing in with Google:", error);
    });
};

// Sign out function
export const signOutUser = () => {
    signOut(auth).catch((error) => {
        console.error("Error signing out:", error);
    });
};

// Function to handle authentication state
export const listenToAuth = (callback: (user: FirebaseUser | null) => void): Unsubscribe => {
    // Canvas-specific authentication
    if (isCanvas) {
        signInWithCustomToken(auth, __initial_auth_token)
            .then(() => {
                const user = auth.currentUser;
                callback(user);
            })
            .catch(async (error) => {
                console.error("Error signing in with custom token:", error);
                // Fallback to anonymous sign-in if custom token fails
                try {
                    const user = auth.currentUser;
                    await signInAnonymously(auth);
                    callback(user);
                } catch (anonError) {
                    console.error("Error signing in anonymously:", anonError);
                    callback(null);
                }
            });
            // This is a placeholder for the unsubscribe function, as onAuthStateChanged is not
            // called in this code path.
            return () => {};
    } else {
        // Standard authentication for web
        return onAuthStateChanged(auth, user => {
            callback(user);
        });
    }
};

// Listen to transactions in real-time
export const listenToTransactions = (callback: (transactions: Transaction[]) => void, selectedYear: string, selectedMonth: string): Unsubscribe => {
    const user = auth.currentUser;
    if (!user) {
        callback([]);
        return () => {}; // Return a no-op unsubscribe function
    }

    const colRef = transactionsCollectionRef(user.uid);

    // Use onSnapshot to get real-time updates
    const unsubscribe = onSnapshot(colRef, (snapshot: QuerySnapshot<DocumentData>) => {
        const transactions: Transaction[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data(),
            // Ensure timestamp is properly typed
            timestamp: doc.data().timestamp as Timestamp,
        })) as Transaction[];

        // Sort in memory to avoid Firestore index issues
        transactions.sort((a, b) => {
            const dateA = a.timestamp?.toDate() || new Date(0);
            const dateB = b.timestamp?.toDate() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        // Filter in memory to handle combined month/year selection
        const filteredTransactions = transactions.filter(t => {
            const date = t.timestamp?.toDate();
            if (!date) return false;

            const transYear = date.getFullYear().toString();
            const transMonth = (date.getMonth() + 1).toString().padStart(2, '0');

            // If a year is selected but no month, show all transactions for that year.
            const yearMatch = selectedYear === 'all' || transYear === selectedYear;

            // If a month is selected, or if 'all' is selected for both, show all.
            const monthMatch = selectedMonth === 'all' || transMonth === selectedMonth;

            return yearMatch && monthMatch;
        });

        callback(filteredTransactions);

    }, (error) => {
        console.error("Error listening to transactions:", error);
    });

    return unsubscribe;
};

export const addTransaction = async (data: AddTransactionData) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated.");
    }
    const colRef = transactionsCollectionRef(user.uid);

    try {
        await addDoc(colRef, {
            ...data,
            timestamp: Timestamp.fromDate(new Date(data.date)),
        });
    } catch (error) {
        console.error("Error adding transaction:", error);
        throw error;
    }
};

export const deleteTransaction = async (id: string) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated.");
    }
    
    const docRef = doc(transactionsCollectionRef(user.uid), id);

    try {
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting transaction:", error);
        throw error;
    }
};