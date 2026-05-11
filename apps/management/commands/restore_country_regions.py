import json
from django.core.management.base import BaseCommand
from apps.models import City, Country, Region

class Command(BaseCommand):
    help = 'Restores country-region links based on the cities.json fixture'

    def handle(self, *args, **options):
        fixture_path = 'apps/fixtures/cities.json'
        with open(fixture_path, 'r') as f:
            data = json.load(f)
        
        self.stdout.write(f"Processing {len(data)} cities from fixture...")
        
        updated_countries = set()
        
        for item in data:
            if item['model'] == 'apps.city':
                fields = item['fields']
                city_name = fields['name']
                region_id = fields['region']
                
                # Find this city in our current DB
                # We use name and slug to be sure
                city = City.objects.filter(name=city_name).first()
                if city and city.country and region_id:
                    country = city.country
                    region = Region.objects.filter(id=region_id).first()
                    
                    if region and country.region != region:
                        country.region = region
                        country.save(update_fields=['region'])
                        updated_countries.add(country.name)
                        # self.stdout.write(f"Linked {country.name} to {region.name}")

        self.stdout.write(self.style.SUCCESS(f"Finished! Updated {len(updated_countries)} countries."))
        
        # Check regions again
        for r in Region.objects.filter(level=0):
            count = Country.objects.filter(region=r).count()
            self.stdout.write(f"Region {r.name}: {count} countries")

