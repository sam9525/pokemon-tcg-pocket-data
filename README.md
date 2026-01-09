# Pokémon TCG Pocket Data

https://pokemon-tcg-pocket-data.com/

## About

Pokémon TCG Pocket Data is a website where you can view all cards from the game called Pokémon TCG Pocket, check the decks I have collected, and build your own deck.

## Description

This project was built to practice website development using Next.js, create-next-app, next-auth, React, TypeScript, and Tailwind CSS.

## Languages Supported

- 繁體中文　（Traditional Chinese）
- English
- 日本語　（Japanese）

## Pages

| Page                   | Description                                                                                                       | Implemented |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| **Login page**         | Allows users to login with their email and password. Also allows users to login with Google.                      | ✅          |
| **Register page**      | Allows users to register for an account with their email and password. Also allows users to register with Google. | ✅          |
| **Profile page**       | It shows the user's name, email, and avatar. Users can also change their name, password and avatar.               | ✅          |
| **Home page**          | First page that users see when they visit the website. It shows the all packages.                                 | ✅          |
| **Cards page**         | Display all cards by packages. With the filtering options.                                                        | ✅          |
| **Decks List page**    | Display all decks.                                                                                                | ✅          |
| **Search page**        | Allow to search cards by name, number, type, etc.                                                                 | ✅          |
| **My Deck**            | Display the user's decks.                                                                                         |             |
| **Deck Collection**    | Display the user's deck collection.                                                                               |             |
| **Build Deck**         | Allow to build a deck.                                                                                            |             |
| **Users page**         | Only show for admin. Display all the users from the database.                                                     | ✅          |
| **S3 Cards List page** | Only show for admin. Display the cards from the S3 bucket with the filtering options.                             | ✅          |

## Technology Stack

| Technology       | Package               | Version       |
| ---------------- | --------------------- | ------------- |
| **Frontend**     | react                 | 19.0.0        |
|                  | next                  | 15.2.4        |
|                  | tailwindcss           | 4             |
|                  | typescript            | 5             |
| **Backend**      | auth                  | 1.2.3         |
|                  | next-auth             | 5.0.0-beta.25 |
| **Database**     | MongoDB with Mongoose | 8.13.2        |
| **Storage**      | aws-sdk/client-s3     | 3.787.0       |
| **Notification** | react-hot-toast       | 2.5.2         |
