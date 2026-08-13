import { memo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Typography, type TextVariant, type ThemeColor } from '@/theme';

export type ThemedTextProps = TextProps & {
  type?: TextVariant;
  themeColor?: ThemeColor;
};

/**
 * Registering the scale once with `StyleSheet.create` keeps variant lookups to an
 * integer id instead of allocating a fresh style object on every render.
 */
const variants = StyleSheet.create(Typography);

function ThemedTextBase({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  return (
    <Text style={[{ color: Colors[themeColor ?? 'text'] }, variants[type], style]} {...rest} />
  );
}

/**
 * The theme is static, so this component only ever re-renders when its own props
 * change — worth memoising given how many instances a dense screen carries.
 */
export const ThemedText = memo(ThemedTextBase);
