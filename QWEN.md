# Reporte Vehiculos GDR

## Project Overview

**Reporte Vehiculos GDR** is a web-based vehicle inspection reporting system developed for the Department of Management of Relay Deposits (Departamento de Gestión de Depósitos de Relaves) in Ecuador. The application is designed to facilitate daily vehicle inspections, allowing inspectors to record vehicle condition, system status, and generate professional reports with photographic evidence.

### Key Features

- **Vehicle Inspection Form**: Complete form for recording vehicle details, system evaluations, and inspector notes
- **Multi-language Support**: Bilingual interface with Spanish and Chinese text
- **Photographic Evidence**: Built-in image upload and preview functionality
- **Report Generation**: Automatic A4 report generation with professional formatting
- **Draft Saving**: Automatic saving of form data to localStorage
- **Chatbot Assistant**: Built-in help system for form completion guidance
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Mode Compatibility**: Designed with print functionality that works in both modes

## File Structure

- `index.html` - Main application structure and UI
- `app.js` - Application logic, form handling, and report generation
- `styles.css` - Styling and responsive design, including print-specific styles
- `.gitattributes` - Git file handling configuration
- `.nojekyll` - GitHub Pages configuration file
- `ECUACORRIENTE.png` - Left company logo
- `LOGO GDR.jpeg` - Right company logo

## Development Conventions

### Code Style
- JavaScript follows modern ES6+ practices
- CSS uses responsive design with mobile-first approach
- Uses Tailwind CSS CDN for additional styling utilities
- Naming conventions follow camelCase for JavaScript and kebab-case for CSS

### Form Elements
- Vehicle codes are pre-mapped to known plates (ECO04-ECO62, etc.)
- All form fields are validated before report generation
- Critical system issues automatically flag the vehicle as non-operational

### System Evaluations
- 17 different vehicle systems are evaluated: Motor, Transmission, Steering, Brakes, Suspension, Power Windows, Tires, Electrical System, Lights, Reverse Alarm, Refrigerant, Hydraulic, Bodywork, Safety Equipment, Fuel System, and Cleanliness
- Three status levels: OK, Attention (Atención), Critical (Crítico)
- Photo evidence required for report generation (minimum 2 photos)

## Building and Running

This is a static HTML/JavaScript/CSS application that requires no build step. Simply open `index.html` in any modern web browser or host it on any web server.

### Direct Usage
1. Open `index.html` in your browser
2. Fill out the vehicle inspection form
3. Upload required photos
4. Click "Generar informe" to generate the report
5. Use your browser's print function (Ctrl+P/Cmd+P) to save as PDF

### Hosting on GitHub Pages
The repository includes `.nojekyll` which enables GitHub Pages deployment without Jekyll processing.

## Technologies Used

- HTML5
- CSS3 (with responsive design and print media queries)
- Vanilla JavaScript (ES6+)
- Tailwind CSS (via CDN)
- LocalStorage API for draft persistence
- File API for image handling
- Canvas API for image resizing

## Special Features

### Print Optimization
- Dedicated print styles ensure proper A4 formatting
- Automatic dark-to-light conversion for print
- Mobile-optimized print styles
- Safari-specific print optimization

### Image Handling
- Automatic image resizing to 1400px width
- JPEG conversion at 85% quality
- Preview functionality before report generation

### Data Persistence
- Automatic saving of form data to browser's localStorage
- Draft restoration on page reload
- Clean form reset functionality

### Chatbot Integration
- Built-in help system with topic-specific guidance
- Interactive Q&A for form completion
- Sections for data entry, system evaluation, photos, and vehicle status

## Known Vehicle Codes
The system includes a mapping of vehicle codes to known plates:
- ECO04 → PCX 9910
- ECO05 → PCX 9915
- ECO06 → PCX 9919
- ECO23 → PDI 5797
- ECO26 → PDI 5814
- ECO36 → PDI 5771
- ECO62 → ZBA 1564
- GE-16 → Sin placa
- BZ-01 → Sin placa

## Report Generation

The system automatically generates a report code in the format: `YYMM-VEHCOD-RDV-0DAY-V0`
- YY: Two-digit year
- MM: Two-digit month
- VEHCOD: Vehicle code from the form
- RDV: Report type identifier
- 0DAY: Zero-padded day with prefix
- V0: Version indicator

The report includes vehicle details, system evaluations, general observations, and the required photographic evidence.