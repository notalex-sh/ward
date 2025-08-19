# WARD - Alias Management System

WARD is an identity management system for creating and managing digital aliases. It provides a comprehensive solution for generating complete identity profiles, including AI-generated photos, secure password storage, and 2FA authentication code generation, all with a focus on privacy and security.

> **Important**: Never share your encryption password with anyone. If you lose your password, you will not be able to decrypt your data.

There is a live deployment of Ward available however it is closed access. Contact me hello@notalex.sh for more information.

## Features 

* **Realistic Identity Generation**: Creates believable identities with Australian addresses and details.
* **AI-Powered Face Generation**: Integrates with `thispersondoesnotexist.com` to generate unique profile photos.
* **Encrypted Password Manager**: Securely store and manage passwords for each alias.
* **TOTP/2FA Code Generation**: Built-in support for time-based one-time passwords.
* **Military-Grade Encryption**: All data is encrypted using AES-256 with PBKDF2 for key derivation.
* **Password-Protected Export/Import**: Easily back up and restore your aliases with encrypted files.

## Getting Started 

### Prerequisites

* Node.js and npm (or yarn) installed on your machine.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/notalex-sh/ward.git](https://github.com/notalex-sh/ward.git)
    cd ward
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create a `.env` file** in the root directory and add the following line to set your system password:
    ```
    WARD_PASSWORD=your_secure_password
    ```
4.  **Start the server:**
    ```bash
    npm run dev
    ```
5.  Open your browser and navigate to `http://localhost:3000`. You will be prompted to enter the system password you set in the `.env` file.

## Usage

* **Create an Alias**: Click the `+` button in the tab bar to generate a new identity. You can regenerate the details until you are satisfied and then select a username to create the alias.
* **Generate Profile Photo**: Once an alias is created, you can generate an AI-powered profile photo. You can keep generating new photos until you find one you like, then "lock" it to save.
* **Manage Passwords**: Add, view, copy, and delete passwords associated with an alias. A password generator is included for creating strong, random passwords.
* **Manage 2FA**: Add services and their secret keys to generate TOTP codes.
* **Import/Export**: Use the "Import" and "Export" buttons to load and save your encrypted alias data. **It is highly recommended to export your data regularly as a backup.**

### Keyboard Shortcuts

* `Ctrl+N`: New alias
* `Ctrl+S`: Export file
* `Ctrl+O`: Import file
* `ESC`: Close modals

## Technology Stack 🛠️

* **Backend**: Node.js, Express
* **Frontend**: HTML, CSS, JavaScript
* **Styling**: Tailwind CSS
* **Encryption**: CryptoJS
* **API for street data**: Overpass API
