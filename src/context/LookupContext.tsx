import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { listenToCategories, listenToPaymentMethods, type LookupItem } from '../services/firebaseService';
import { listenToAuth } from '../services/firebaseService';

// --- Type Definitions ---
export interface LookupItemWithDefault {
    id: string;
    name: string;
    color: string;
    isDefault: boolean;
}

interface LookupContextType {
  categories: LookupItemWithDefault[];
  paymentMethods: LookupItemWithDefault[];
  categoryColors: Record<string, string>;
  paymentColors: Record<string, string>;
  defaultCategoryName: string;
  defaultPaymentMethodName: string;
  isLookupsLoading: boolean;
}

// Default fallback values
const fallbackCategory = { id: 'fallback-cat', name: 'Misc', color: '#94a3b8', isDefault: true };
const fallbackPayment = { id: 'fallback-pm', name: 'Other', color: '#A0AEC0', isDefault: true };

// Default value including dummy color maps for initial access before data is loaded
const defaultContextValue: LookupContextType = {
    categories: [fallbackCategory],
    paymentMethods: [fallbackPayment],
    categoryColors: { 'Misc': '#94a3b8' },
    paymentColors: { 'Other': '#A0AEC0' },
    defaultCategoryName: fallbackCategory.name,
    defaultPaymentMethodName: fallbackPayment.name,
    isLookupsLoading: true,
};

const LookupContext = createContext<LookupContextType>(defaultContextValue);

export const useLookups = () => {
    const context = useContext(LookupContext);
    if (context === undefined) {
        throw new Error('useLookups must be used within a LookupProvider');
    }
    return context;
};

export const LookupProvider = ({ children }: { children: ReactNode }) => {
    const [categories, setCategories] = useState<LookupItemWithDefault[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<LookupItemWithDefault[]>([]);
    const [isLookupsLoading, setIsLookupsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Auth listener to get userId
    useEffect(() => {
        const unsubscribeAuth = listenToAuth((user) => {
            setUserId(user ? user.uid : null);
        });
        return () => unsubscribeAuth();
    }, []);

    // Firestore listeners
    useEffect(() => {
        if (!userId) {
            setIsLookupsLoading(false);
            setCategories([]);
            setPaymentMethods([]);
            return;
        }

        setIsLookupsLoading(true);

        const unsubscribeCategories = listenToCategories(userId, (fetchedCategories) => {
            setCategories(fetchedCategories as LookupItemWithDefault[]);
        });

        const unsubscribePayments = listenToPaymentMethods(userId, (fetchedPaymentMethods) => {
            setPaymentMethods(fetchedPaymentMethods as LookupItemWithDefault[]);
            setIsLookupsLoading(false);
        });

        return () => {
            unsubscribeCategories();
            unsubscribePayments();
        };
    }, [userId]);

    // Convert list to a lookup map for colors
    const categoryColors = categories.reduce<Record<string, string>>((acc, item) => {
        acc[item.name] = item.color;
        return acc;
    }, {});

    const paymentColors = paymentMethods.reduce<Record<string, string>>((acc, item) => {
        acc[item.name] = item.color;
        return acc;
    }, {});

    const defaultCategory = categories.find(c => c.isDefault) || categories[0] || fallbackCategory;
    const defaultPaymentMethod = paymentMethods.find(p => p.isDefault) || paymentMethods[0] || fallbackPayment;

    const value = {
        categories,
        paymentMethods,
        categoryColors,
        paymentColors,
        defaultCategoryName: defaultCategory.name,
        defaultPaymentMethodName: defaultPaymentMethod.name,
        isLookupsLoading,
    };

    return (
        <LookupContext.Provider value={value}>
            {children}
        </LookupContext.Provider>
    );
};

// Default hardcoded values for initial data seeding
export const defaultCategories: Omit<LookupItemWithDefault, 'id'>[] = [
    { name: 'Groceries', color: '#4ade80', isDefault: true }, // Default
    { name: 'Dining', color: '#facc15', isDefault: false },
    { name: 'Travel', color: '#60a5fa', isDefault: false },
    { name: 'Rent', color: '#c084fc', isDefault: false },
    { name: 'Bills', color: '#f87171', isDefault: false },
    { name: 'Misc', color: '#94a3b8', isDefault: false },
    { name: 'Shopping', color: '#ff7849', isDefault: false },
    { name: 'Entertainment', color: '#8b5cf6', isDefault: false },
];

export const defaultPaymentMethods: Omit<LookupItemWithDefault, 'id'>[] = [
    { name: 'Amex Credit Card', color: '#2D72C0', isDefault: true }, // Default
    { name: 'Zolve Mastercard', color: '#EB001B', isDefault: false },
    { name: 'Debit Card', color: '#FF9900', isDefault: false },
    { name: 'Apple Cash', color: '#00A859', isDefault: false },
    { name: 'Venmo', color: '#008CFF', isDefault: false },
    { name: 'Other', color: '#A0AEC0', isDefault: false },
    { name: 'Zelle', color: '#f7b539', isDefault: false },
];
