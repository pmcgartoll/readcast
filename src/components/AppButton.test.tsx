import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { AppButton } from './AppButton';

describe('AppButton', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    render(<AppButton label="Save for later" onPress={onPress} />);
    fireEvent.press(screen.getByText('Save for later'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    render(<AppButton label="Disabled" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the label while loading', () => {
    render(<AppButton label="Loading" onPress={() => {}} loading />);
    expect(screen.queryByText('Loading')).toBeNull();
  });
});
