import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Menu, Searchbar, useTheme } from 'react-native-paper';

import type { Category, TransactionOrdering, TransactionType } from '@/api/types';

import { type Period, PERIOD_LABELS } from './format';
import { ORDERING_LABELS } from './labels';

export type FilterState = {
  search: string;
  type?: TransactionType;
  period: Period;
  category?: string;
  ordering: TransactionOrdering;
};

export const DEFAULT_FILTERS: FilterState = { search: '', period: 'all', ordering: '-date' };

export function hasActiveFilters(filters: FilterState): boolean {
  return Boolean(
    filters.search.trim() ||
    filters.type ||
    filters.category ||
    filters.period !== DEFAULT_FILTERS.period ||
    filters.ordering !== DEFAULT_FILTERS.ordering,
  );
}

type TransactionFiltersProps = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  categories: Category[];
};

type MenuName = 'period' | 'category' | 'ordering' | null;

/** Recherche, type, période, catégorie et tri de la liste des transactions. */
export function TransactionFilters({ filters, onChange, categories }: TransactionFiltersProps) {
  const { colors } = useTheme();
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const update = (patch: Partial<FilterState>) => {
    onChange({ ...filters, ...patch });
    setOpenMenu(null);
  };

  const categoryOptions = categories.filter((c) => !filters.type || c.type === filters.type);
  const categoryName = categories.find((c) => c.id === filters.category)?.name;
  const selectedStyle = { backgroundColor: colors.primaryContainer };

  return (
    <View style={styles.root}>
      <Searchbar
        placeholder="Rechercher une description"
        value={filters.search}
        onChangeText={(search) => onChange({ ...filters, search })}
        style={[
          styles.search,
          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
        ]}
        inputStyle={styles.searchInput}
        accessibilityLabel="Rechercher une transaction"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {(['expense', 'income'] as const).map((type) => (
          <Chip
            key={type}
            selected={filters.type === type}
            style={filters.type === type ? selectedStyle : undefined}
            onPress={() =>
              // Changer de type peut rendre la catégorie choisie incohérente : on la retire.
              update({ type: filters.type === type ? undefined : type, category: undefined })
            }>
            {type === 'expense' ? 'Dépenses' : 'Revenus'}
          </Chip>
        ))}

        <Menu
          visible={openMenu === 'period'}
          onDismiss={() => setOpenMenu(null)}
          anchor={
            <Chip
              icon="calendar-range"
              selected={filters.period !== 'all'}
              showSelectedCheck={false}
              style={filters.period !== 'all' ? selectedStyle : undefined}
              onPress={() => setOpenMenu('period')}>
              {PERIOD_LABELS[filters.period]}
            </Chip>
          }>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
            <Menu.Item
              key={period}
              title={PERIOD_LABELS[period]}
              leadingIcon={filters.period === period ? 'check' : undefined}
              onPress={() => update({ period })}
            />
          ))}
        </Menu>

        <Menu
          visible={openMenu === 'category'}
          onDismiss={() => setOpenMenu(null)}
          anchor={
            <Chip
              icon="shape-outline"
              selected={Boolean(filters.category)}
              showSelectedCheck={false}
              style={filters.category ? selectedStyle : undefined}
              onPress={() => setOpenMenu('category')}>
              {categoryName ?? 'Catégorie'}
            </Chip>
          }>
          <Menu.Item
            title="Toutes les catégories"
            leadingIcon={!filters.category ? 'check' : undefined}
            onPress={() => update({ category: undefined })}
          />
          {categoryOptions.map((category) => (
            <Menu.Item
              key={category.id}
              title={category.name}
              leadingIcon={filters.category === category.id ? 'check' : undefined}
              onPress={() => update({ category: category.id })}
            />
          ))}
        </Menu>

        <Menu
          visible={openMenu === 'ordering'}
          onDismiss={() => setOpenMenu(null)}
          anchor={
            <Chip icon="sort" onPress={() => setOpenMenu('ordering')}>
              {ORDERING_LABELS[filters.ordering]}
            </Chip>
          }>
          {(Object.keys(ORDERING_LABELS) as TransactionOrdering[]).map((ordering) => (
            <Menu.Item
              key={ordering}
              title={ORDERING_LABELS[ordering]}
              leadingIcon={filters.ordering === ordering ? 'check' : undefined}
              onPress={() => update({ ordering })}
            />
          ))}
        </Menu>

        {hasActiveFilters(filters) ? (
          <Chip icon="close" mode="outlined" onPress={() => update(DEFAULT_FILTERS)}>
            Réinitialiser
          </Chip>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  search: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, elevation: 0 },
  searchInput: { minHeight: 0 },
  chips: { gap: 8, paddingRight: 20 },
});
