def wishlist_slugs(request):
    if not request.user.is_authenticated:
        return {'user_wishlist_slugs': set(), 'user_wishlist_count': 0}

    from django.core.cache import cache
    from apps.models.wishlist import Wishlist

    cache_key = f'wishlist_slugs_{request.user.pk}'
    cached = cache.get(cache_key)
    if cached is not None:
        return {'user_wishlist_slugs': cached, 'user_wishlist_count': len(cached)}

    slugs = set(
        Wishlist.objects
        .filter(user=request.user)
        .values_list('destination__slug', flat=True)
    )
    cache.set(cache_key, slugs, timeout=300)
    return {'user_wishlist_slugs': slugs, 'user_wishlist_count': len(slugs)}