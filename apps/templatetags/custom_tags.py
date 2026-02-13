from django import template

register = template.Library()


@register.filter
def int_space(value):
    """
    Custom filter: Raqamni har 3 raqamdan keyin bo‘sh joy bilan ajratadi.
    Misol: 1234567 -> 1 234 567
    """
    try:
        value = int(value)
        return f"{value:,}".replace(",", " ")
    except (ValueError, TypeError):
        return value
