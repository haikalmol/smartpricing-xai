from decimal import Decimal


def clamp_to_hpp(price: Decimal, hpp: Decimal) -> Decimal:
    """Guard-rail: a suggested price may never go below HPP. Called by every recommendation source."""
    return price if price >= hpp else hpp
