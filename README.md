# 🌟 My Web Apps Collection

This is a simple web project to display and run small web applications (like games, tools, etc).  
Each app is listed dynamically from JSON data and displayed as a clean, card-style main page.

## 📝 How it works

- `index.html` fetches data from `./public/data/app.json`.
- For each app:
  - Displays title
  - Displays description
  - Loads the icon from: `directory/public/images/icon.png`
- Data is managed in `app.json`, so you can easily add or remove apps.
