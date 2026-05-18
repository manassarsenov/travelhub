from django.core.management.base import BaseCommand
from apps.models import Country, Destination
from apps.models.categories import City, Region

COUNTRY_REGION_MAP = {
    # Europe
    'AD': 'europe', 'AL': 'europe', 'AT': 'europe', 'AX': 'europe',
    'BA': 'europe', 'BE': 'europe', 'BG': 'europe', 'BY': 'europe',
    'CH': 'europe', 'CY': 'europe', 'CZ': 'europe', 'DE': 'europe',
    'DK': 'europe', 'EE': 'europe', 'ES': 'europe', 'FI': 'europe',
    'FO': 'europe', 'FR': 'europe', 'GB': 'europe', 'GG': 'europe',
    'GI': 'europe', 'GR': 'europe', 'HR': 'europe', 'HU': 'europe',
    'IE': 'europe', 'IM': 'europe', 'IS': 'europe', 'IT': 'europe',
    'JE': 'europe', 'LI': 'europe', 'LT': 'europe', 'LU': 'europe',
    'LV': 'europe', 'MC': 'europe', 'MD': 'europe', 'ME': 'europe',
    'MK': 'europe', 'MT': 'europe', 'NL': 'europe', 'NO': 'europe',
    'PL': 'europe', 'PT': 'europe', 'RO': 'europe', 'RS': 'europe',
    'RU': 'europe', 'SE': 'europe', 'SI': 'europe', 'SJ': 'europe',
    'SK': 'europe', 'SM': 'europe', 'TR': 'europe', 'UA': 'europe',
    'VA': 'europe', 'XK': 'europe',

    # North America
    'BM': 'north-america', 'CA': 'north-america', 'GL': 'north-america',
    'MX': 'north-america', 'PM': 'north-america', 'US': 'north-america',

    # Central America
    'BZ': 'central-america', 'CR': 'central-america', 'GT': 'central-america',
    'HN': 'central-america', 'NI': 'central-america', 'PA': 'central-america',
    'SV': 'central-america',

    # Caribbean
    'AG': 'caribbean', 'AI': 'caribbean', 'AW': 'caribbean', 'BB': 'caribbean',
    'BL': 'caribbean', 'BQ': 'caribbean', 'BS': 'caribbean', 'CU': 'caribbean',
    'CW': 'caribbean', 'DM': 'caribbean', 'DO': 'caribbean', 'GD': 'caribbean',
    'GP': 'caribbean', 'HT': 'caribbean', 'JM': 'caribbean', 'KN': 'caribbean',
    'KY': 'caribbean', 'LC': 'caribbean', 'MF': 'caribbean', 'MQ': 'caribbean',
    'MS': 'caribbean', 'PR': 'caribbean', 'SX': 'caribbean', 'TC': 'caribbean',
    'TT': 'caribbean', 'VC': 'caribbean', 'VG': 'caribbean', 'VI': 'caribbean',

    # South America
    'AR': 'south-america', 'BO': 'south-america', 'BR': 'south-america',
    'CL': 'south-america', 'CO': 'south-america', 'EC': 'south-america',
    'FK': 'south-america', 'GF': 'south-america', 'GS': 'south-america',
    'GY': 'south-america', 'PE': 'south-america', 'PY': 'south-america',
    'SR': 'south-america', 'UY': 'south-america', 'VE': 'south-america',

    # Africa
    'AO': 'africa', 'BF': 'africa', 'BI': 'africa', 'BJ': 'africa',
    'BV': 'africa', 'BW': 'africa', 'CD': 'africa', 'CF': 'africa',
    'CG': 'africa', 'CI': 'africa', 'CM': 'africa', 'CV': 'africa',
    'DJ': 'africa', 'DZ': 'africa', 'EG': 'africa', 'EH': 'africa',
    'ER': 'africa', 'ET': 'africa', 'GA': 'africa', 'GH': 'africa',
    'GM': 'africa', 'GN': 'africa', 'GQ': 'africa', 'GW': 'africa',
    'IO': 'africa', 'KE': 'africa', 'KM': 'africa', 'LR': 'africa',
    'LS': 'africa', 'LY': 'africa', 'MA': 'africa', 'MG': 'africa',
    'ML': 'africa', 'MR': 'africa', 'MU': 'africa', 'MW': 'africa',
    'MZ': 'africa', 'NA': 'africa', 'NE': 'africa', 'NG': 'africa',
    'RE': 'africa', 'RW': 'africa', 'SC': 'africa', 'SD': 'africa',
    'SH': 'africa', 'SL': 'africa', 'SN': 'africa', 'SO': 'africa',
    'SS': 'africa', 'ST': 'africa', 'SZ': 'africa', 'TD': 'africa',
    'TF': 'africa', 'TG': 'africa', 'TN': 'africa', 'TZ': 'africa',
    'UG': 'africa', 'YT': 'africa', 'ZA': 'africa', 'ZM': 'africa',
    'ZW': 'africa',

    # Middle East
    'AE': 'middle-east', 'BH': 'middle-east', 'IL': 'middle-east',
    'IQ': 'middle-east', 'IR': 'middle-east', 'JO': 'middle-east',
    'KW': 'middle-east', 'LB': 'middle-east', 'OM': 'middle-east',
    'PS': 'middle-east', 'QA': 'middle-east', 'SA': 'middle-east',
    'SY': 'middle-east', 'YE': 'middle-east',

    # Asia
    'AF': 'asia', 'AM': 'asia', 'AQ': 'asia', 'AZ': 'asia',
    'BD': 'asia', 'BN': 'asia', 'BT': 'asia', 'CC': 'asia',
    'CN': 'asia', 'CX': 'asia', 'GE': 'asia', 'HK': 'asia',
    'ID': 'asia', 'IN': 'asia', 'JP': 'asia', 'KG': 'asia',
    'KH': 'asia', 'KP': 'asia', 'KR': 'asia', 'KZ': 'asia',
    'LA': 'asia', 'LK': 'asia', 'MM': 'asia', 'MN': 'asia',
    'MO': 'asia', 'MV': 'asia', 'MY': 'asia', 'NP': 'asia',
    'PH': 'asia', 'PK': 'asia', 'SG': 'asia', 'TH': 'asia',
    'TJ': 'asia', 'TL': 'asia', 'TM': 'asia', 'TW': 'asia',
    'UZ': 'asia', 'VN': 'asia',

    # Oceania
    'AS': 'oceania', 'AU': 'oceania', 'CK': 'oceania', 'FJ': 'oceania',
    'FM': 'oceania', 'GU': 'oceania', 'HM': 'oceania', 'KI': 'oceania',
    'MH': 'oceania', 'MP': 'oceania', 'NC': 'oceania', 'NF': 'oceania',
    'NR': 'oceania', 'NU': 'oceania', 'NZ': 'oceania', 'PF': 'oceania',
    'PG': 'oceania', 'PN': 'oceania', 'PW': 'oceania', 'SB': 'oceania',
    'TK': 'oceania', 'TO': 'oceania', 'TV': 'oceania', 'UM': 'oceania',
    'VU': 'oceania', 'WF': 'oceania', 'WS': 'oceania',
}


class Command(BaseCommand):
    help = 'Links countries to regions and cities to countries'

    def handle(self, *args, **options):
        regions = {r.slug: r for r in Region.objects.filter(level=0)}

        updated = 0
        skipped = 0
        for code, region_slug in COUNTRY_REGION_MAP.items():
            region = regions.get(region_slug)
            if not region:
                self.stdout.write(self.style.WARNING(f'Region not found: {region_slug}'))
                continue
            count = Country.objects.filter(code=code, region__isnull=True).update(region=region)
            if count:
                updated += count
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(f'Countries updated: {updated}, already set: {skipped}'))

        city_to_country = {
            'London': 'GB', 'Istanbul': 'TR', 'Paris': 'FR', 'Hamburg': 'DE',
            'Amsterdam': 'NL', 'Lisbon': 'PT', 'Rome': 'IT', 'Athens': 'GR',
            'Madrid': 'ES', 'Barcelona': 'ES', 'Berlin': 'DE', 'Tashkent': 'UZ',
            'Samarkand': 'UZ', 'Bukhara': 'UZ', 'Dubai': 'AE', 'New York': 'US',
            'Tokyo': 'JP', 'Sydney': 'AU', 'Singapore': 'SG', 'Bangkok': 'TH',
            'Bali': 'ID', 'Mumbai': 'IN', 'Delhi': 'IN', 'Beijing': 'CN',
            'Shanghai': 'CN', 'Seoul': 'KR', 'Hong Kong': 'HK', 'Taipei': 'TW',
            'Kuala Lumpur': 'MY', 'Ho Chi Minh City': 'VN', 'Hanoi': 'VN',
            'Cairo': 'EG', 'Nairobi': 'KE', 'Cape Town': 'ZA',
            'Johannesburg': 'ZA', 'Casablanca': 'MA', 'Marrakech': 'MA',
            'Riyadh': 'SA', 'Doha': 'QA', 'Kuwait City': 'KW',
            'Tel Aviv': 'IL', 'Jerusalem': 'IL', 'Beirut': 'LB',
            'Toronto': 'CA', 'Vancouver': 'CA', 'Montreal': 'CA',
            'Los Angeles': 'US', 'Chicago': 'US', 'Miami': 'US',
            'San Francisco': 'US', 'Las Vegas': 'US', 'Washington': 'US',
            'Mexico City': 'MX', 'Buenos Aires': 'AR', 'São Paulo': 'BR',
            'Rio de Janeiro': 'BR', 'Santiago': 'CL', 'Bogotá': 'CO',
            'Lima': 'PE', 'Vienna': 'AT', 'Prague': 'CZ', 'Budapest': 'HU',
            'Warsaw': 'PL', 'Stockholm': 'SE', 'Copenhagen': 'DK',
            'Oslo': 'NO', 'Helsinki': 'FI', 'Brussels': 'BE', 'Zurich': 'CH',
            'Geneva': 'CH', 'Munich': 'DE', 'Frankfurt': 'DE',
            'Dublin': 'IE', 'Edinburgh': 'GB', 'Manchester': 'GB',
            'Liverpool': 'GB', 'Venice': 'IT', 'Milan': 'IT', 'Florence': 'IT',
            'Naples': 'IT', 'Bologna': 'IT', 'Seville': 'ES', 'Valencia': 'ES',
            'Porto': 'PT', 'Dubrovnik': 'HR', 'Split': 'HR', 'Santorini': 'GR',
            'Mykonos': 'GR', 'Thessaloniki': 'GR', 'Reykjavik': 'IS',
            'Bruges': 'BE', 'Ghent': 'BE', 'Bratislava': 'SK', 'Ljubljana': 'SI',
            'Tallinn': 'EE', 'Riga': 'LV', 'Vilnius': 'LT', 'Krakow': 'PL',
            'Gdansk': 'PL', 'Wroclaw': 'PL', 'Bucharest': 'RO',
            'Sofia': 'BG', 'Sarajevo': 'BA', 'Skopje': 'MK',
            'Tirana': 'AL', 'Podgorica': 'ME', 'Belgrade': 'RS',
            'Valletta': 'MT', 'Nicosia': 'CY', 'Innsbruck': 'AT',
            'Salzburg': 'AT', 'Gothenburg': 'SE', 'Malmö': 'SE',
            'Bruges': 'BE', 'Antwerp': 'BE', 'Luxembourg': 'LU',
            'Bern': 'CH', 'Basel': 'CH', 'Cologne': 'DE', 'Hamburg': 'DE',
            'Düsseldorf': 'DE', 'Stuttgart': 'DE', 'Nuremberg': 'DE',
            'Faro': 'PT', 'Cordoba': 'ES', 'Granada': 'ES', 'Bilbao': 'ES',
            'Pisa': 'IT', 'Turin': 'IT', 'Palermo': 'IT', 'Catania': 'IT',
            'Nice': 'FR', 'Lyon': 'FR', 'Marseille': 'FR', 'Bordeaux': 'FR',
            'Toulouse': 'FR', 'Strasbourg': 'FR', 'Montpellier': 'FR',
        }

        cities_updated = 0
        countries_cache = {c.code: c for c in Country.objects.all()}
        for city_name, country_code in city_to_country.items():
            country = countries_cache.get(country_code)
            if country:
                count = City.objects.filter(name__iexact=city_name, country__isnull=True).update(country=country)
                cities_updated += count

        self.stdout.write(self.style.SUCCESS(f'Cities updated: {cities_updated}'))

        dest_updated = 0
        for dest in Destination.objects.filter(city__isnull=False, city__country__isnull=False):
            if dest.country_id != dest.city.country_id:
                dest.country = dest.city.country
                dest.save(update_fields=['country'])
                dest_updated += 1

        self.stdout.write(self.style.SUCCESS(f'Destinations updated: {dest_updated}'))
        self.stdout.write(self.style.SUCCESS('Done!'))