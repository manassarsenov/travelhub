from django.core.management.base import BaseCommand
from apps.models import City, Country, Region, Destination

class Command(BaseCommand):
    help = 'Automatically links cities to countries and countries to regions'

    def handle(self, *args, **options):
        # 1. Get Regions
        regions = {r.name.lower(): r for r in Region.objects.all()}
        
        # 2. Map Countries to Regions
        country_to_region = {
            "United Kingdom": "Europe",
            "Türkiye": "Europe",
            "France": "Europe",
            "Germany": "Europe",
            "Netherlands": "Europe",
            "Portugal": "Europe",
            "Italy": "Europe",
            "Greece": "Europe",
            "Spain": "Europe",
            "United States": "North America",
            "Japan": "Asia",
            "China": "Asia",
            "Uzbekistan": "Asia",
            "United Arab Emirates": "Middle East",
            "Egypt": "Africa",
            "Australia": "Oceania",
        }

        for country_name, region_name in country_to_region.items():
            region = regions.get(region_name.lower())
            if region:
                Country.objects.filter(name__icontains=country_name, region__isnull=True).update(region=region)
        
        # 3. Map Cities to Countries
        city_to_country_map = {
            "London": {"name": "United Kingdom"},
            "Istanbul": {"name": "Türkiye"},
            "Paris": {"name": "France"},
            "Hamburg": {"name": "Germany"},
            "Amsterdam": {"name": "Netherlands"},
            "Lisbon": {"name": "Portugal"},
            "Rome": {"name": "Italy"},
            "Athens": {"name": "Greece"},
            "Madrid": {"name": "Spain"},
            "Barcelona": {"name": "Spain"},
            "Berlin": {"name": "Germany"},
            "Tashkent": {"name": "Uzbekistan"},
            "Samarkand": {"name": "Uzbekistan"},
            "Bukhara": {"name": "Uzbekistan"},
            "Dubai": {"name": "United Arab Emirates"},
            "New York": {"name": "United States"},
            "Tokyo": {"name": "Japan"},
        }

        for city_name, country_info in city_to_country_map.items():
            country = Country.objects.filter(name__icontains=country_info['name']).first()
            if country:
                City.objects.filter(name__iexact=city_name, country__isnull=True).update(country=country)
                self.stdout.write(f"Linked {city_name} to {country.name}")
            else:
                self.stdout.write(self.style.WARNING(f"Country {country_info['name']} not found for city {city_name}"))

        # 4. Final check for Destinations
        for dest in Destination.objects.all():
            if dest.city and dest.city.country:
                if dest.country != dest.city.country:
                    dest.country = dest.city.country
                    dest.save(update_fields=['country'])
                    self.stdout.write(f"Updated Destination {dest.name} country to {dest.country.name}")

        self.stdout.write(self.style.SUCCESS("Location mapping completed!"))
