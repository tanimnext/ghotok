'use client';

import CardList from '@/components/CardList';
import { useApp } from '@/components/Providers';

export default function FavoritedMe() {
  const { t } = useApp();
  return (
    <CardList
      path="/me/favorited-me"
      title={t.lists.favoritedMe}
      empty={t.lists.favoritedMeEmpty}
      footer={(d, n) =>
        d.anonymous > 0 ? (
          <p className="muted">
            +{n(d.anonymous)} {t.lists.anonymous}
          </p>
        ) : null
      }
    />
  );
}
