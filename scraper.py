import requests
from bs4 import BeautifulSoup

url = "https://www.espn.com/nba/standings"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"}
response = requests.get(url, headers=headers)

if response.status_code == 200:
    soup = BeautifulSoup(response.text, 'lxml')
    tables = soup.find_all('div', {'class': 'ResponsiveTable ResponsiveTable--fixed-left'})

    for table in tables:
        name_conference = table.find('div', {'class': 'Table__Title'}).text.strip()
        print(f"\n{name_conference}:")

        headers = table.find_all('th', {'class': 'tar subHeader__item--content Table__TH'})
        header_texts = ["Standing", "Name"]

        for header in headers:
            data = header.find(['a', 'span'])
            if data and data.text:
                header_texts.append(data.text.strip())

        column_widths = [10, 35] + [6] * (len(header_texts) - 2)  

        for text, width in zip(header_texts, column_widths):
            print(text.ljust(width), end='')
        print('\n' + '-' * sum(column_widths))  

        tbodys = table.find_all('tbody', {'class': 'Table__TBODY'})
        teams = tbodys[0].find_all("tr")
        stats = tbodys[1].find_all("tr")

        for team_row, stat_row in zip(teams, stats):
            standing = team_row.find('span', {'class': 'team-position ml2 pr3'})
            team_name = team_row.select_one('span.hide-mobile a.AnchorLink')

            stat_cells = stat_row.find_all('span')

            if standing and team_name and standing.text and team_name.text:
                print(f'{standing.text:<9} {team_name.text.strip():<{column_widths[1]}}', end='')

                for cell, width in zip(stat_cells, column_widths[2:]):
                    if cell.text:
                        print(f'{cell.text.strip():>{width}}', end='')  
                print('')
        print('')

else:
    print("Failed to fetch the page. Status code:", response.status_code)