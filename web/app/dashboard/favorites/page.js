'use client';

import CardList from '@/components/CardList';
import { useApp } from '@/components/Providers';

export default function Favorites() {
  const { t } = useApp();
  return <CardList path="/me/favorites?kind=like" title={t.lists.favorites} empty={t.lists.favoritesEmpty} removable />;
}
