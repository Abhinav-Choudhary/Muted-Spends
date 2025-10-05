import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, Timestamp, deleteDoc, doc, QuerySnapshot, QueryDocumentSnapshot, updateDoc, setDoc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Unsubscribe, DocumentData } from "firebase/firestore";
import { defaultCategories, defaultPaymentMethods } from '../context/LookupContext'; // Import defaults

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

// Type definition for dynamic lookup items
export interface LookupItem {
    id: string;
    name: string;
    color: string;
    isDefault: boolean;
}

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

// Document reference for the starting balance in a dedicated settings document
const startingBalanceDocRef = (userId: string) => {
    const isCanvasEnvironment = typeof __app_id !== 'undefined';
    const basePath = isCanvasEnvironment
        ? `artifacts/${__app_id}/users/${userId}`
        : `users/${userId}`;
    // Path: users/{userId}/settings/starting_balance
    return doc(db, basePath, 'settings', 'starting_balance');
};

const seedStatusDocRef = (userId: string) => {
    const isCanvasEnvironment = typeof __app_id !== 'undefined';
    const basePath = isCanvasEnvironment
        ? `artifacts/${__app_id}/users/${userId}`
        : `users/${userId}`;
    // Path: users/{userId}/settings/seed_status
    return doc(db, basePath, 'settings', 'seed_status');
};

// Collection references for dynamic lookups
const lookupCollectionRef = (userId: string, lookupType: 'categories' | 'paymentMethods') => {
    const isCanvasEnvironment = typeof __app_id !== 'undefined';
    const path = isCanvasEnvironment
        ? `artifacts/${__app_id}/users/${userId}/${lookupType}`
        : `users/${userId}/${lookupType}`;
    return collection(db, path);
};

// --- Authentication Functions ---
// Added logic to include isDefault field
const seedDefaultLookups = async (userId: string) => {
    const seedRef = seedStatusDocRef(userId);

    try {
        const seedSnap = await getDoc(seedRef);

        // 1. Check if seeding has already been done
        if (seedSnap.exists() && seedSnap.data().seeded) {
            console.log("Defaults already seeded for this user. Skipping.");
            return;
        }

        // 2. If not seeded, immediately set the flag to prevent duplicates from concurrent calls
        await setDoc(seedRef, { seeded: true, timestamp: Timestamp.now() });
        console.log("Starting initial seed process...");

        const categoriesRef = lookupCollectionRef(userId, 'categories');
        const paymentsRef = lookupCollectionRef(userId, 'paymentMethods');

        // Execute seeding for Categories
        for (const [index, cat] of defaultCategories.entries()) {
            await addDoc(categoriesRef, { ...cat, isDefault: index === 0 });
        }

        // Execute seeding for Payment Methods
        for (const [index, method] of defaultPaymentMethods.entries()) {
            await addDoc(paymentsRef, { ...method, isDefault: index === 0 });
        }

        console.log("Default lookups seeded successfully.");

    } catch (error) {
        console.error("Error during default data seeding. Manual cleanup may be required.", error);
        // If an error occurs (like permission issue), we should still log it,
        // but the atomic check should prevent the duplication issue moving forward 
        // once the user has the correct security rules applied.
        throw error;
    }
}

export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const signOutUser = () => signOut(auth);
export const listenToAuth = (callback: (user: FirebaseUser | null) => void): Unsubscribe => onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Run seeding logic for new users in the background
        await seedDefaultLookups(user.uid);
    }
    callback(user);
});


// --- Starting Balance Functions ---
export const getStartingBalance = (callback: (balance: number) => void): Unsubscribe => {
    const user = auth.currentUser;
    if (!user) {
        callback(0);
        return () => { };
    }

    const docRef = startingBalanceDocRef(user.uid);
    return onSnapshot(docRef, (docSnap) => {
        // Reads 'amount' field from the document, defaults to 0 if not set
        const balance = docSnap.exists() ? docSnap.data().amount || 0 : 0;
        callback(balance);
    }, (error) => {
        console.error("Error listening to starting balance:", error);
    });
};

export const setStartingBalance = (amount: number) => {
    const user = auth.currentUser;
    if (!user) return Promise.reject("User not authenticated.");

    const docRef = startingBalanceDocRef(user.uid);
    // Use setDoc to create/overwrite the document with the new starting balance amount
    return setDoc(docRef, { amount, lastUpdated: Timestamp.now() }, { merge: true });
};

// Function to perform bulk migration of category or payment method names
export const runMigrationBatch = async (
    field: 'category' | 'paymentMethod',
    oldName: string,
    newName: string
): Promise<number> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");

    const transactionsRef = transactionsCollectionRef(user.uid);
    const q = query(transactionsRef, where(field, '==', oldName));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return 0;

    const batch = writeBatch(db);
    
    snapshot.docs.forEach((docSnap) => {
        // Only update if the transaction name is the old name
        batch.update(doc(transactionsRef, docSnap.id), {
            [field]: newName,
        });
    });

    await batch.commit();
    return snapshot.size;
};


// --- Dynamic Lookup CRUD Functions ---

// Listen to all items in a lookup collection
export const listenToLookups = (
    userId: string,
    lookupType: 'categories' | 'paymentMethods',
    callback: (items: LookupItem[]) => void
): Unsubscribe => {
    const colRef = lookupCollectionRef(userId, lookupType);
    return onSnapshot(colRef, (snapshot: QuerySnapshot<DocumentData>) => {
        const items = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            name: doc.data().name,
            color: doc.data().color,
            isDefault: doc.data().isDefault || false, // NEW: Include isDefault
        })) as LookupItem[];

        // Keep the default item at the top of the list for easy access
        items.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
        });

        callback(items);
    }, (error) => {
        console.error(`Error listening to ${lookupType}:`, error);
    });
};

export const listenToCategories = (userId: string, callback: (items: LookupItem[]) => void) =>
    listenToLookups(userId, 'categories', callback);

export const listenToPaymentMethods = (userId: string, callback: (items: LookupItem[]) => void) =>
    listenToLookups(userId, 'paymentMethods', callback);

// Helper to disable existing default item when a new one is set
const clearExistingDefault = async (userId: string, lookupType: 'categories' | 'paymentMethods', newDefaultId: string) => {
    const colRef = lookupCollectionRef(userId, lookupType);
    const q = query(colRef, where('isDefault', '==', true));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
        if (docSnap.id !== newDefaultId) {
            await updateDoc(doc(colRef, docSnap.id), { isDefault: false });
        }
    }
};

// Add a new item to a lookup collection
export const addLookupItem = async (lookupType: 'categories' | 'paymentMethods', data: Omit<LookupItem, 'id'>) => {
    const user = auth.currentUser;
    if (!user) return Promise.reject("User not authenticated.");

    const colRef = lookupCollectionRef(user.uid, lookupType);

    // If the new item is set as default, clear the existing one first.
    if (data.isDefault) {
        await clearExistingDefault(user.uid, lookupType, ''); // ID is empty because we don't have the new doc ID yet
    }

    return addDoc(colRef, data);
};

// Update an existing item
export const updateLookupItem = async (lookupType: 'categories' | 'paymentMethods', id: string, data: Partial<Omit<LookupItem, 'id'>>) => {
    const user = auth.currentUser;
    if (!user) return Promise.reject("User not authenticated.");

    // If attempting to set a new default, clear the existing one
    if (data.isDefault === true) {
        await clearExistingDefault(user.uid, lookupType, id);
    }

    const docRef = doc(lookupCollectionRef(user.uid, lookupType), id);
    return updateDoc(docRef, data);
};

// Delete with restricted logic
export const deleteLookupItem = async (lookupType: 'categories' | 'paymentMethods', id: string, name: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");

    // Check if item is the last available, preventing deletion of the last one.
    const colRef = lookupCollectionRef(user.uid, lookupType);
    const allItemsSnapshot = await getDocs(colRef);
    if (allItemsSnapshot.size <= 1) {
        throw new Error(`Cannot delete "${name}". You must have at least one ${lookupType.slice(0, -1)} configured.`);
    }

    // 1. Check for linked transactions (Restricted Delete)
    const transactionsRef = transactionsCollectionRef(user.uid);
    let fieldToCheck: 'category' | 'paymentMethod';

    if (lookupType === 'categories') {
        fieldToCheck = 'category';
    } else if (lookupType === 'paymentMethods') {
        fieldToCheck = 'paymentMethod';
    } else {
        throw new Error("Invalid lookup type for deletion.");
    }

    const constraint = where(fieldToCheck, '==', name);
    const q = query(transactionsRef, constraint);
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // If documents are found, deletion is restricted.
        const count = querySnapshot.docs.length;
        throw new Error(`Cannot delete "${name}". It is linked to ${count} transaction${count === 1 ? '' : 's'} in the main Transactions table. Please update those transactions first.`);
    }

    // 2. If no links are found, proceed with deletion
    const docRef = doc(colRef, id);

    // 3. If the item being deleted was the default, simply proceed. The frontend context will find the next available default.

    return deleteDoc(docRef);
};

export const listenToTransactions = (callback: (transactions: Transaction[]) => void, selectedYear: string, selectedMonth: string): Unsubscribe => {
    const user = auth.currentUser;
    if (!user) {
        callback([]);
        return () => { };
    }

    const colRef = transactionsCollectionRef(user.uid);
    // Removed date filters from the initial query and moved filtering to the client.
    // This ensures all transactions are available for cumulative balance calculations in Dashboard.
    // We only sort by timestamp here.
    return onSnapshot(colRef, (snapshot: QuerySnapshot<DocumentData>) => {
        const transactions = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp as Timestamp,
        })) as Transaction[];

        // Sorting still happens on the client side after fetching all data.
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

    // Create a date object from the user's input string in the local timezone
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


export const updateTransaction = (id: string, data: Partial<Omit<Transaction, 'id' | 'timestamp'>> & { timestamp?: Timestamp }) => {
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