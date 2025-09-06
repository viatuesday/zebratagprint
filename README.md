# Zebra Printer Tag Code Manager

A web application for managing and printing tag codes to Zebra printers using ZPL (Zebra Programming Language).

## Features

- **Production Number Search**: Enter or scan a production number to view related serial numbers
- **Serial Number Display**: Shows all serial numbers associated with a production number
- **Tag Code Preview**: Displays the ZPL tag code for each serial number
- **Direct Printing**: Print tag codes directly to Zebra printers
- **Multiple Print Methods**: Supports WebUSB, file download, and server-based printing
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, professional interface with smooth animations

## Files

- `index.html` - Main HTML structure
- `styles.css` - CSS styling and responsive design
- `script.js` - JavaScript functionality and printing logic
- `data.json` - Sample data with production numbers, serial numbers, and tag codes
- `server.js` - Node.js server for enhanced printing support (optional)

## Quick Start

1. **Simple Setup** (File-based):
   - Open `index.html` in a web browser
   - The app will load data from `data.json`
   - Enter a production number (e.g., "PROD001", "PROD002", "TEST001")
   - Click "Print Tag Code" buttons to download ZPL files

2. **Server Setup** (Recommended for production):
   ```bash
   # Install Node.js dependencies
   npm install express cors

   # Start the server
   node server.js

   # Open browser to http://localhost:3000
   ```

## Usage

### Searching for Production Numbers
1. Enter or scan a production number in the input field
2. Press Enter or click "Search"
3. View the list of related serial numbers and their tag codes

### Printing Tag Codes
1. Click the "Print Tag Code" button next to any serial number
2. The system will attempt to print using the best available method:
   - **WebUSB**: Direct printing to connected Zebra printer (Chrome/Edge)
   - **File Download**: Downloads ZPL file for manual printing
   - **Server Printing**: Sends ZPL to printer via network (requires server)

### Sample Data
The included `data.json` contains sample data:
- **PROD001**: Widget Assembly Line 1 (3 serial numbers)
- **PROD002**: Gadget Manufacturing Line 2 (2 serial numbers)
- **PROD003**: Component Assembly Line 3 (4 serial numbers)
- **TEST001**: Test Production Line (1 serial number)

## ZPL Tag Code Format

The tag codes use standard ZPL commands:
```
^XA                    # Start format
^FO50,50^ADN,36,20^FDWidget Assembly^FS  # Title
^FO50,100^ADN,18,10^FDProd: PROD001^FS   # Production number
^FO50,130^ADN,18,10^FDSerial: SN001234^FS # Serial number
^FO50,160^ADN,18,10^FDDate: 2024-01-15^FS # Date
^XZ                    # End format
```

## Printing Methods

### 1. WebUSB (Recommended)
- Works with modern browsers (Chrome, Edge)
- Direct communication with USB-connected Zebra printers
- No additional software required

### 2. File Download (Fallback)
- Downloads ZPL files with `.zpl` extension
- Can be opened with Zebra printer software
- Works in all browsers

### 3. Server Printing (Production)
- Requires Node.js server (`server.js`)
- Sends ZPL directly to network-connected printers
- Supports multiple printer configurations

## Configuration

### Printer Settings
Edit the printer configuration in `script.js`:
```javascript
// Network printer settings
const printerIP = '192.168.1.100';
const printerPort = 9100;
```

### Data Management
Update `data.json` to add new production numbers and serial numbers:
```json
{
  "productionNumber": "PROD004",
  "description": "New Production Line",
  "serialNumbers": [
    {
      "serialNumber": "SN004001",
      "tagCode": "^XA^FO50,50^ADN,36,20^FDNew Production^FS^XZ"
    }
  ]
}
```

## Browser Compatibility

- **Chrome/Edge**: Full support including WebUSB printing
- **Firefox**: File download and server printing
- **Safari**: File download and server printing
- **Mobile**: Responsive design, file download support

## Troubleshooting

### Printing Issues
1. **WebUSB not working**: Ensure printer is connected via USB and browser supports WebUSB
2. **File download not working**: Check browser download settings
3. **Server printing fails**: Verify printer IP address and network connectivity

### Data Issues
1. **No results found**: Check production number spelling and case sensitivity
2. **Data not loading**: Ensure `data.json` is in the same directory as `index.html`

## Security Notes

- The application runs entirely in the browser
- No data is sent to external servers (except for server-based printing)
- ZPL files are generated client-side
- WebUSB requires user permission for printer access

## Customization

### Styling
Edit `styles.css` to customize the appearance:
- Colors and gradients
- Font sizes and families
- Layout and spacing
- Responsive breakpoints

### Functionality
Modify `script.js` to add features:
- Additional print methods
- Data validation
- Error handling
- Keyboard shortcuts

## License

This project is open source and available under the MIT License.
