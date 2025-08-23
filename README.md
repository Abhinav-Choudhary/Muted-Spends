# Muted Spends 💸

Muted Spends is a modern, responsive expense tracker application built with React and Firebase. It allows users to monitor their income and expenses, visualize their spending habits, and manage their personal finances effectively.

---

## ✨ Features

* **🔒 Google Authentication:** Secure sign-in using a Google account.
* **🔄 Transaction Management:** Full CRUD (Create, Read, Update, Delete) functionality for income and expense transactions.
* **🧾 Receipt Uploads:** Optionally attach an image of a receipt to any expense for better record-keeping.
* **📊 Interactive Dashboard:**
    * View summary cards for total income, expenses, and current balance.
    * Analyze spending with pie charts for categories and payment methods, including percentage breakdowns relative to income.
    * Track spending trends with a monthly expense bar chart.
* **🔍 Dynamic Filtering & Search:**
    * Filter transactions by year and month.
    * Instantly search for transactions by description.
* **💵 Dual Currency Mode:** A global toggle to view all financial data in either **USD** or **INR**, with live exchange rate conversion.
* **📄 Data Export:** Download all your transaction data to an Excel file (`.xlsx`).
* **📱 Responsive Design:** A clean, mobile-first interface that works seamlessly on any device.
* **🔔 Real-time Notifications:** Get instant feedback with toast notifications for adding, updating, or deleting transactions.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS
* **Backend & Database:** Firebase (Authentication, Firestore, Storage)
* **Charting:** Recharts
* **Data Export:** `xlsx`

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* Node.js (v18 or later)
* npm
* A Firebase account

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd muted-spends
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up Firebase:**
    * Create a new project on the [Firebase Console](https://console.firebase.google.com/).
    * Create a **Web App** within your Firebase project.
    * Copy the Firebase configuration object provided.
    * Create a `.env` file in the root of the project by copying the `.env.example` file:
        ```sh
        cp .env.example .env
        ```
    * Paste your Firebase configuration values into the `.env` file. The keys should match the `VITE_*` variables in `.env.example`.
    * In the Firebase Console, enable **Authentication** (with the Google provider), **Firestore Database**, and **Storage**.

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

---

## ☁️ Deployment

This project is configured for easy deployment to Firebase Hosting.

1.  **Build the project for production:**
    ```sh
    npm run build
    ```
    This command creates a `dist` folder with the optimized production files.

2.  **Deploy to Firebase:**
    * If you haven't already, install the Firebase CLI globally: `npm install -g firebase-tools`
    * Log in to your Firebase account: `firebase login`
    * Initialize Firebase in your project (if you haven't already): `firebase init`
    * Deploy the site:
        ```sh
        firebase deploy --only hosting
        ```

---

## 📜 License

This project is licensed under the **MIT License**.

Please note that this project is intended strictly for **personal and non-commercial use**. It is provided as-is, and you are free to modify and use it for your own purposes. However, it is not intended for redistribution or commercial use.
