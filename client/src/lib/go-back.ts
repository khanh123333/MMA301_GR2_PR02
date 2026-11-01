import { router } from 'expo-router';

// A reload or deep link opens a screen with nothing behind it to go back to.
export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
