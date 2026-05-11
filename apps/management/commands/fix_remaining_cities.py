from django.core.management.base import BaseCommand
from apps.models import City, Country, Region, Destination
from geopy.geocoders import Nominatim
import time

class Command(BaseCommand):
    help = 'Fixes the remaining 83 cities with accurate mapping'

    def handle(self, *args, **options):
        geolocator = Nominatim(user_agent="travelhub_final_fixer")
        
        # Manual mapping for problematic city names (typos or specific names)
        manual_city_fixes = {
            "Armacoa De Pera": "Armacao de Pera",
            "Marseillo": "Marseille",
            "Dusseldrof": "Dusseldorf",
            "Cadiz": "Cadiz, Spain",
            "Nu'rnberg": "Nuremberg",
            "Dresdon": "Dresden",
            "Antrwerp": "Antwerp",
            "Wrocklaw": "Wroclaw",
            "Liandudno": "Llandudno",
            "Borderaux": "Bordeaux",
            "Feteire": "Feteira, Portugal",
            "Monterossa Al Mare": "Monterosso al Mare",
            "Rhodes Town": "Rhodes, Greece",
            "Cancu'n": "Cancun",
            "NUrghada": "Hurghada",
            "Chefchaouene": "Chefchaouen",
            "Da nang": "Da Nang",
            "Johor Bahra": "Johor Bahru",
            "Hoi an": "Hoi An",
            "Nha Trang": "Nha Trang",
            "Hue": "Hue, Vietnam",
            "Hanoi": "Hanoi",
            "Seoul": "Seoul",
            "Busan": "Busan",
            "Las Vegas": "Las Vegas, Nevada",
            "Miami": "Miami, Florida",
            "Chicago": "Chicago, Illinois",
            # ... adding more if needed
        }

        # Country name normalization (Mapping geocoder output to DB names)
        country_norm = {
            "united states": "United States",
            "united states of america": "United States",
            "vietnam": "Viet Nam",
            "viet nam": "Viet Nam",
            "south korea": "Korea, Republic of",
            "republic of korea": "Korea, Republic of",
            "korea": "Korea, Republic of",
            "uk": "United Kingdom",
            "great britain": "United Kingdom",
            "czech republic": "Czechia",
            "czechia": "Czechia",
            "turkey": "Türkiye",
            "türkiye": "Türkiye",
            "russian federation": "Russian Federation",
            "russia": "Russian Federation",
            "tanzania": "Tanzania, United Republic of",
            "moldova": "Moldova, Republic of",
            "laos": "Lao People's Democratic Republic"
        }

        # Region mapping for countries
        country_to_region = {
            "United States": "North America",
            "Canada": "North America",
            "Mexico": "North America",
            "Viet Nam": "Asia",
            "Korea, Republic of": "Asia",
            "Japan": "Asia",
            "China": "Asia",
            "Thailand": "Asia",
            "Philippines": "Asia",
            "Malaysia": "Asia",
            "Cambodia": "Asia",
            "Indonesia": "Asia",
            "India": "Asia",
            "Sri Lanka": "Asia",
            "United Kingdom": "Europe",
            "Germany": "Europe",
            "France": "Europe",
            "Spain": "Europe",
            "Italy": "Europe",
            "Portugal": "Europe",
            "Belgium": "Europe",
            "Netherlands": "Europe",
            "Austria": "Europe",
            "Switzerland": "Europe",
            "Greece": "Europe",
            "Türkiye": "Europe",
            "Norway": "Europe",
            "Sweden": "Europe",
            "Denmark": "Europe",
            "Poland": "Europe",
            "Czechia": "Europe",
            "Ireland": "Europe",
            "Egypt": "Africa",
            "Morocco": "Africa",
            "Kenya": "Africa",
            "South Africa": "Africa",
            "Tanzania, United Republic of": "Africa",
            "United Arab Emirates": "Middle East",
            "Jordan": "Middle East",
            "Oman": "Middle East",
            "Qatar": "Middle East",
            "Saudi Arabia": "Middle East",
            "Australia": "Oceania",
            "New Zealand": "Oceania",
        }

        cities_to_fix = City.objects.filter(country__isnull=True)
        self.stdout.write(f"Fixing {cities_to_fix.count()} cities...")

        for city in cities_to_fix:
            search_name = manual_city_fixes.get(city.name, city.name)
            try:
                location = geolocator.geocode(search_name, language='en', timeout=10)
                if location:
                    address = location.address.split(',')
                    raw_country = address[-1].strip()
                    
                    # Normalize country name
                    target_country_name = country_norm.get(raw_country.lower(), raw_country)
                    
                    # Find Country in DB
                    country = Country.objects.filter(name__iexact=target_country_name).first()
                    if not country:
                        # Try fuzzy search if exact fails
                        country = Country.objects.filter(name__icontains=target_country_name).first()
                    
                    if country:
                        city.country = country
                        city.save(update_fields=['country'])
                        self.stdout.write(f"OK: {city.name} -> {country.name}")
                        
                        # Fix Region for Country if missing
                        region_name = country_to_region.get(country.name)
                        if region_name:
                            region = Region.objects.filter(name__iexact=region_name).first()
                            if region and country.region != region:
                                country.region = region
                                country.save(update_fields=['region'])
                                self.stdout.write(f"   Region updated: {country.name} -> {region.name}")
                    else:
                        self.stdout.write(self.style.WARNING(f"FAIL: {city.name} (Geo: {raw_country} -> {target_country_name})"))
                else:
                    self.stdout.write(self.style.ERROR(f"NOT FOUND: {city.name}"))
                
                time.sleep(1) # Respect Nominatim
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"ERROR: {city.name}: {e}"))

        self.stdout.write(self.style.SUCCESS("Final fix completed!"))
