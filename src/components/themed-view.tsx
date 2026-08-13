import { memo } from 'react';
import { View, type ViewProps } from 'react-native';

import { Colors, type ThemeColor } from '@/theme';

export type ThemedViewProps = ViewProps & {
  /** Semantic surface token; defaults to the page background. */
  type?: ThemeColor;
};

function ThemedViewBase({ style, type, ...rest }: ThemedViewProps) {
  return <View style={[{ backgroundColor: Colors[type ?? 'background'] }, style]} {...rest} />;
}

export const ThemedView = memo(ThemedViewBase);
