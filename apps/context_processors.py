def wishlist_slugs(request):
    if not request.user.is_authenticated:
        return {'user_wishlist_slugs': set(), 'user_wishlist_count': 0}
    from apps.models.wishlist import Wishlist
    slugs = set(
        Wishlist.objects
        .filter(user=request.user)
        .values_list('destination__slug', flat=True)
    )
    return {'user_wishlist_slugs': slugs, 'user_wishlist_count': len(slugs)}