const express = require('express');
const cors = require('cors');
const net = require('net');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Printer configuration
const PRINTER_CONFIG = {
    ip: '192.168.1.100',  // Change to your printer's IP address
    port: 9100,            // Standard ZPL port
    timeout: 5000          // Connection timeout in ms
};

// Print ZPL to network printer
async function printToPrinter(zpl, printerIP = PRINTER_CONFIG.ip, printerPort = PRINTER_CONFIG.port) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let isResolved = false;

        // Set timeout
        const timeout = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                client.destroy();
                reject(new Error('Connection timeout'));
            }
        }, PRINTER_CONFIG.timeout);

        client.connect(printerPort, printerIP, () => {
            console.log(`Connected to printer at ${printerIP}:${printerPort}`);
            
            // Send ZPL data
            client.write(zpl, 'utf8', (err) => {
                if (err) {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        reject(new Error('Failed to send data: ' + err.message));
                    }
                } else {
                    console.log('ZPL data sent successfully');
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        client.destroy();
                        resolve('Print job sent successfully');
                    }
                }
            });
        });

        client.on('error', (err) => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                reject(new Error('Connection error: ' + err.message));
            }
        });

        client.on('close', () => {
            console.log('Connection closed');
        });
    });
}

// API endpoint for printing
app.post('/api/print', async (req, res) => {
    try {
        const { zpl, printerIP, printerPort } = req.body;
        
        if (!zpl) {
            return res.status(400).json({ error: 'ZPL content is required' });
        }

        const ip = printerIP || PRINTER_CONFIG.ip;
        const port = printerPort || PRINTER_CONFIG.port;

        console.log(`Printing to ${ip}:${port}`);
        console.log('ZPL Content:', zpl);

        const result = await printToPrinter(zpl, ip, port);
        
        res.json({ 
            success: true, 
            message: result,
            printer: `${ip}:${port}`
        });

    } catch (error) {
        console.error('Print error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// API endpoint to get printer status
app.get('/api/printer/status', async (req, res) => {
    try {
        // Try to connect to printer to check status
        const testZpl = '^XA^XZ'; // Minimal ZPL command
        await printToPrinter(testZpl);
        res.json({ 
            status: 'online', 
            printer: `${PRINTER_CONFIG.ip}:${PRINTER_CONFIG.port}` 
        });
    } catch (error) {
        res.json({ 
            status: 'offline', 
            error: error.message,
            printer: `${PRINTER_CONFIG.ip}:${PRINTER_CONFIG.port}`
        });
    }
});

// API endpoint to update printer configuration
app.post('/api/printer/config', (req, res) => {
    try {
        const { ip, port } = req.body;
        
        if (ip) PRINTER_CONFIG.ip = ip;
        if (port) PRINTER_CONFIG.port = port;
        
        res.json({ 
            success: true, 
            config: PRINTER_CONFIG 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Zebra Printer Server running on http://localhost:${PORT}`);
    console.log(`Printer configured for: ${PRINTER_CONFIG.ip}:${PRINTER_CONFIG.port}`);
    console.log('Available endpoints:');
    console.log('  GET  / - Main application');
    console.log('  POST /api/print - Print ZPL to printer');
    console.log('  GET  /api/printer/status - Check printer status');
    console.log('  POST /api/printer/config - Update printer config');
    console.log('  GET  /api/health - Health check');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    process.exit(0);
});
