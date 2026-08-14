import { memo, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, space, tint } from '@/theme/tokens';

/**
 * Bottom sheet.
 *
 * A `Modal` rather than an absolutely-positioned overlay, so the Android back button
 * dismisses it and the screen behind is genuinely inert — a scrubber that still responds
 * to drags underneath a confirmation dialog is a way to change the thing you are being
 * asked to confirm.
 *
 * The scrim is tappable. A sheet asking a money question must always have a way out that
 * is not the confirm button.
 */
function SheetBase({
  visible,
  onDismiss,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(180)}
          exiting={reduced ? undefined : FadeOut.duration(140)}
          style={styles.scrim}>
          <Pressable
            style={styles.fill}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={onDismiss}
          />
        </Animated.View>

        <Animated.View
          entering={reduced ? undefined : SlideInDown.duration(280)}
          exiting={reduced ? undefined : SlideOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: insets.bottom + space.cardPad }]}
          accessibilityViewIsModal>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // `StyleSheet.absoluteFillObject` is absent in this RN version; spelled out instead.
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tint.scrim,
  },
  sheet: {
    backgroundColor: color.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderTopColor: color.line,
    paddingHorizontal: space.screenX,
    paddingTop: 10,
    gap: space.gap,
  },
  handle: {
    width: 34,
    height: 3.5,
    borderRadius: radius.pill,
    backgroundColor: color.line,
    alignSelf: 'center',
    marginBottom: 6,
  },
});

export const Sheet = memo(SheetBase);
