import requests
from bs4 import BeautifulSoup
import pandas as pd
from io import StringIO  # Import StringIO for wrapping HTML strings
from tabulate import tabulate
import re

input_association = input("Association?")

if input_association.strip().upper() == "NBA":
    url = "https://www.espn.com/nba/standings"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'lxml')
        conf_tables = soup.find_all('div', {'class': 'ResponsiveTable ResponsiveTable--fixed-left'})

        for table in conf_tables:
            # Extract the conference name
            name_conference = table.find('div', {'class': 'Table__Title'}).text.strip()
            print(f"\n{name_conference}:")

            # Find the specific <table> inside the div
            html_table = table.find('table')

            if html_table:
              # Wrap the HTML string in StringIO for compatibility
                dfs = pd.read_html(StringIO(str(html_table)))
                for df in dfs:
                    if df.columns[0]:  # Ensure it's not empty
                            column_name = df.columns[0]  # Get the first column name dynamically
                            if column_name:  # Check the column name exists
                                data = df[column_name].dropna()  # Drop any NaN rows
                                
                                parsed_data = []
                                pattern = r"^(\d+)?([A-Z]{2,3})([A-Z][a-z].+)$"
                                
                                for entry in data:
                                    match = re.match(pattern, str(entry))  # Ensure entry is a string
                                    if match:
                                        rank = match.group(1) if match.group(1) else "N/A"
                                        abbreviation = match.group(2)
                                        team_name = match.group(3).strip()
                                        parsed_data.append({"Rank": rank, "Abbreviation": abbreviation, "Team": team_name})

                                # Convert to a clean DataFrame
                                parsed_df = pd.DataFrame(parsed_data)
                                print(parsed_df.to_string(index=False))


                # Ensure team abbreviation and names are split correctly
                ''' df.columns = ['Standing', 'Team']  # Update column names if necessary

                # Format the "Team" column to add spaces between abbreviations and names
                def format_team(row):
                    team = row['Team']
                    if team[:3].isupper():  # Assumes abbreviation is the first 3 characters
                        return f"{row['Standing']:>2} {team[:3]} {team[3:]}"
                    return f"{row['Standing']:>2} {team}"  # Default fallback

                # Apply formatting to display standings with space
                df['Formatted'] = df.apply(format_team, axis=1)
                # Extract the formatted column for tabulated display
                formatted_data = [[team] for team in df['Formatted']]

                # Display with tabulate
                print(tabulate(formatted_data, headers=['Western Conference'], tablefmt='pretty', showindex=False))  '''
            else:
                print("No <table> found inside the div.")
