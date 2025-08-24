import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, Timestamp, deleteDoc, doc, QuerySnapshot, QueryDocumentSnapshot, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Unsubscribe, DocumentData } from "firebase/firestore";

// --- Type Definitions ---
export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    description: string;
    amount: number;
    timestamp: Timestamp;
    category?: string;
    paymentMethod?: string;
    receiptUrl?: string;
}
export type AddTransactionData = Omit<Transaction, 'id' | 'timestamp'> & { date: string };

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// --- Firestore Collection Reference ---
const transactionsCollectionRef = (userId: string) => {
    const isCanvasEnvironment = typeof __app_id !== 'undefined';
    const path = isCanvasEnvironment
        ? `artifacts/${__app_id}/users/${userId}/transactions`
        : `users/${userId}/transactions`;
    return collection(db, path);
};

// --- Authentication Functions ---
export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const signOutUser = () => signOut(auth);
export const listenToAuth = (callback: (user: FirebaseUser | null) => void): Unsubscribe => onAuthStateChanged(auth, callback);


// --- Firestore Functions ---
export const listenToTransactions = (callback: (transactions: Transaction[]) => void, selectedYear: string, selectedMonth: string): Unsubscribe => {
    const user = auth.currentUser;
    if (!user) {
        callback([]);
        return () => { };
    }

    const colRef = transactionsCollectionRef(user.uid);
    return onSnapshot(colRef, (snapshot: QuerySnapshot<DocumentData>) => {
        const transactions = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp as Timestamp,
        })) as Transaction[];

        const filteredAndSorted = transactions
            .filter(t => {
                const date = t.timestamp?.toDate();
                if (!date) return false;
                const yearMatch = selectedYear === 'all' || date.getFullYear().toString() === selectedYear;
                const monthMatch = selectedMonth === 'all' || (date.getMonth() + 1).toString().padStart(2, '0') === selectedMonth;
                return yearMatch && monthMatch;
            })
            .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

        callback(filteredAndSorted);
    }, (error) => {
        console.error("Error listening to transactions:", error);
    });
};

export const addTransaction = (data: AddTransactionData) => {
    const user = auth.currentUser;
    if (!user) return Promise.reject("User not authenticated.");

    const colRef = transactionsCollectionRef(user.uid);

    // MODIFIED: Create a date object from the user's input string in the local timezone
    const [year, month, day] = data.date.split('-').map(s => parseInt(s, 10));
    const userDate = new Date(year, month - 1, day);


    // Get the current time
    const now = new Date();

    // Combine the user's selected date with the current time to ensure correct sorting
    const combinedDate = new Date(
        userDate.getFullYear(),
        userDate.getMonth(),
        userDate.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
    );

    return addDoc(colRef, {
        ...data,
        timestamp: Timestamp.fromDate(combinedDate),
    });
};


export const updateTransaction = (id: string, data: Partial<Omit<Transaction, 'id'>>) => {
    const user = auth.currentUser;
    if (!user) return Promise.reject("User not authenticated.");

    const docRef = doc(transactionsCollectionRef(user.uid), id);
    return updateDoc(docRef, data);
};

export const deleteTransaction = (id: string) => {
    const user = auth.currentUser;
    if (!user) return Promise.reject("User not authenticated.");

    const docRef = doc(transactionsCollectionRef(user.uid), id);
    return deleteDoc(docRef);
};

export const uploadReceipt = async (file: File): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");

    const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};
