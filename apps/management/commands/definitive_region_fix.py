from django.core.management.base import BaseCommand
from apps.models import Country, Region

class Command(BaseCommand):
    help = 'Assigns correct regions to countries using a definitive mapping'

    def handle(self, *args, **options):
        mapping = {
            "Europe": [
                "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", 
                "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", 
                "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", 
                "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova, Republic of", 
                "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland", 
                "Portugal", "Romania", "Russian Federation", "San Marino", "Serbia", "Slovakia", 
                "Slovenia", "Spain", "Sweden", "Switzerland", "Ukraine", "United Kingdom", "Vatican City", "Türkiye"
            ],
            "North America": [
                "United States", "Canada", "Mexico", "Greenland"
            ],
            "South America": [
                "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", 
                "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela"
            ],
            "Central America": [
                "Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama"
            ],
            "Caribbean": [
                "Antigua and Barbuda", "Bahamas", "Barbados", "Cuba", "Dominica", "Dominican Republic", 
                "Grenada", "Haiti", "Jamaica", "Saint Kitts and Nevis", "Saint Lucia", 
                "Saint Vincent and the Grenadines", "Trinidad and Tobago", "Aruba", "Puerto Rico", "Anguilla", "Cayman Islands"
            ],
            "Asia": [
                "Afghanistan", "Armenia", "Azerbaijan", "Bangladesh", "Bhutan", "Brunei", "Cambodia", 
                "China", "Georgia", "India", "Indonesia", "Japan", "Kazakhstan", "Kyrgyzstan", 
                "Lao People's Democratic Republic", "Malaysia", "Maldives", "Mongolia", "Myanmar", 
                "Nepal", "North Korea", "Korea, Republic of", "Pakistan", "Philippines", "Singapore", 
                "Sri Lanka", "Taiwan", "Tajikistan", "Thailand", "Timor-Leste", "Turkmenistan", 
                "Uzbekistan", "Viet Nam"
            ],
            "Middle East": [
                "Bahrain", "Iran", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon", "Oman", 
                "Palestine", "Qatar", "Saudi Arabia", "Syria", "United Arab Emirates", "Yemen"
            ],
            "Africa": [
                "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", 
                "Cameroon", "Central African Republic", "Chad", "Comoros", "Congo", "Cote d'Ivoire", 
                "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", 
                "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya", "Lesotho", 
                "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", 
                "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", 
                "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa", "South Sudan", 
                "Sudan", "Tanzania, United Republic of", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"
            ],
            "Oceania": [
                "Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", 
                "New Zealand", "Palau", "Papua New Guinea", "Samoa", "Solomon Islands", 
                "Tonga", "Tuvalu", "Vanuatu"
            ]
        }

        for region_name, country_list in mapping.items():
            region = Region.objects.filter(name__iexact=region_name).first()
            if not region:
                self.stdout.write(self.style.ERROR(f"Region not found: {region_name}"))
                continue
            
            for country_name in country_list:
                country = Country.objects.filter(name__icontains=country_name).first()
                if country:
                    country.region = region
                    country.save(update_fields=['region'])
                    # self.stdout.write(f"Fixed: {country.name} -> {region.name}")
                else:
                    self.stdout.write(self.style.WARNING(f"Country not found: {country_name}"))

        self.stdout.write(self.style.SUCCESS("All major countries fixed!"))

