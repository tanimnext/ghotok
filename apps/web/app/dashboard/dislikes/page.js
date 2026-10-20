'use client';

import CardList from '@/components/CardList';
import { useApp } from '@/components/Providers';

export default function Dislikes() {
  const { t } = useApp();
  return (
    <CardList path="/me/favorites?kind=dislike" title={t.lists.dislikes} empty={t.lists.dislikesEmpty} removable />
  );
}
