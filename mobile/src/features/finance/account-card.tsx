import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';

import type { Account } from '@/api/types';
import { IconBadge } from '@/components/icon-badge';

import { formatAmount } from './format';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from './labels';

type AccountRowProps = {
  account: Account;
  onPress: () => void;
};

/** Ligne d'un compte : type, nom et solde calculé par le backend. */
export function AccountRow({ account, onPress }: AccountRowProps) {
  const { colors } = useTheme();
  const balance = formatAmount(account.balance, account.currency);
  const negative = account.balance.startsWith('-');

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, solde ${balance}${account.is_archived ? ', archivé' : ''}`}>
      <View style={[styles.row, account.is_archived && styles.archived]}>
        <IconBadge
          icon={ACCOUNT_TYPE_ICONS[account.type]}
          tone={account.type === 'savings' ? 'tertiary' : 'primary'}
          size={44}
        />
        <View style={styles.text}>
          <Text variant="titleSmall" numberOfLines={1}>
            {account.name}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {ACCOUNT_TYPE_LABELS[account.type]}
            {account.is_archived ? ' · archivé' : ''}
          </Text>
        </View>
        <Text
          variant="titleSmall"
          style={[styles.balance, { color: negative ? colors.error : colors.onSurface }]}>
          {balance}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  archived: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  balance: { fontWeight: '700' },
});
