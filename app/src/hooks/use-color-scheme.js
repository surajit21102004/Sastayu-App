// Explicitly lock to light mode to prevent unintended dark mode on user devices
export function useColorScheme() {
  return 'light';
}
