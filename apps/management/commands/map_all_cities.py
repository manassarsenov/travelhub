from django.core.management.base import BaseCommand
from apps.models import City, Country, Region
from geopy.geocoders import Nominatim
import time

class Command(BaseCommand):
    help = 'Automatically maps all cities to their respective countries using geopy'

    def handle(self, *args, **options):
        geolocator = Nominatim(user_agent="travelhub_mapper_v2")
        cities = City.objects.filter(country__isnull=True)
        count = cities.count()
        self.stdout.write(f"Found {count} cities without country. Starting mapping...")

        # Cache for countries to avoid repeated DB lookups
        country_cache = {c.name.lower(): c for c in Country.objects.all()}
        
        # Specific overrides for naming differences
        name_overrides = {
            "united states": "united states of america",
            "uk": "united kingdom",
            "russia": "russian federation",
            "turkey": "türkiye",
            "uae": "united arab emirates"
        }

        success_count = 0
        fail_count = 0

        for i, city in enumerate(cities):
            try:
                # Nominatim query
                location = geolocator.geocode(city.name, language='en', timeout=10)
                if location:
                    # Usually the last part of the address is the country
                    address_parts = location.address.split(',')
                    country_name = address_parts[-1].strip()
                    
                    # Try to find country in our DB
                    target_country = None
                    search_name = country_name.lower()
                    
                    # Check overrides
                    for key, val in name_overrides.items():
                        if key in search_name:
                            search_name = val
                            break

                    # 1. Exact match
                    target_country = country_cache.get(search_name)
                    
                    # 2. Case-insensitive search if not in cache
                    if not target_country:
                        target_country = Country.objects.filter(name__icontains=search_name).first()
                    
                    if target_country:
                        city.country = target_country
                        city.save(update_fields=['country'])
                        success_count += 1
                        self.stdout.write(f"[{i+1}/{count}] {city.name} -> {target_country.name}")
                        country_cache[search_name] = target_country # Add to cache
                    else:
                        fail_count += 1
                        self.stdout.write(self.style.WARNING(f"[{i+1}/{count}] {city.name} -> Country '{country_name}' not found in DB"))
                else:
                    fail_count += 1
                    self.stdout.write(self.style.ERROR(f"[{i+1}/{count}] {city.name} -> Could not geocode"))

                # Nominatim rate limit: 1 request per second
                time.sleep(1)

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing {city.name}: {e}"))
                time.sleep(2)

        self.stdout.write(self.style.SUCCESS(f"Finished! Success: {success_count}, Failed: {fail_count}"))

