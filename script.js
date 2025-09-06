// Global variables
let productionData = [];
let currentProduction = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});

// Load data from JSON file
async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        productionData = data.productions;
        updatePrinterStatus('Data loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        updatePrinterStatus('Error loading data: ' + error.message, 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    const productionInput = document.getElementById('productionNumber');
    const searchBtn = document.getElementById('searchBtn');

    // Enter key support
    productionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProductionNumber();
        }
    });

    // Auto-focus on input
    productionInput.focus();
}

// Search for production number
function searchProductionNumber() {
    const productionNumber = document.getElementById('productionNumber').value.trim();
    
    if (!productionNumber) {
        updatePrinterStatus('Please enter a production number', 'error');
        return;
    }

    // Find production in data
    currentProduction = productionData.find(prod => 
        prod.productionNumber.toLowerCase() === productionNumber.toLowerCase()
    );

    if (currentProduction) {
        displaySerialNumbers(currentProduction);
        updatePrinterStatus('Production found: ' + currentProduction.description, 'success');
    } else {
        hideResults();
        updatePrinterStatus('No production found for: ' + productionNumber, 'error');
    }
}

// Display serial numbers for the found production
function displaySerialNumbers(production) {
    const resultsSection = document.getElementById('resultsSection');
    const noResults = document.getElementById('noResults');
    const currentProductionSpan = document.getElementById('currentProduction');
    const serialList = document.getElementById('serialList');

    // Update current production display
    currentProductionSpan.textContent = production.productionNumber;

    // Clear previous results
    serialList.innerHTML = '';

    // Create serial number items
    production.serialNumbers.forEach((item, index) => {
        const serialItem = createSerialItem(item, index);
        serialList.appendChild(serialItem);
    });

    // Show results
    resultsSection.style.display = 'block';
    noResults.style.display = 'none';
}

// Create a serial number item element
function createSerialItem(item, index) {
    const serialItem = document.createElement('div');
    serialItem.className = 'serial-item';
    serialItem.innerHTML = `
        <div class="serial-info">
            <div class="serial-number">Serial: ${item.serialNumber}</div>
            <div class="tag-code">${item.tagCode}</div>
        </div>
        <div class="button-group">
            <button class="show-zpl-button" data-serial="${item.serialNumber}" data-tagcode="${encodeURIComponent(item.tagCode)}">
                <span class="zpl-icon">📄</span>
                Show ZPL
            </button>
            <button class="print-button" data-serial="${item.serialNumber}" data-tagcode="${encodeURIComponent(item.tagCode)}">
                <span class="print-icon">🖨️</span>
                Print Tag Code
            </button>
        </div>
    `;
    
    // Add event listeners
    const showZplBtn = serialItem.querySelector('.show-zpl-button');
    const printBtn = serialItem.querySelector('.print-button');
    
    if (showZplBtn) {
        showZplBtn.addEventListener('click', function() {
            const serialNumber = this.getAttribute('data-serial');
            const tagCode = decodeURIComponent(this.getAttribute('data-tagcode'));
            showZPLCode(serialNumber, tagCode);
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            const serialNumber = this.getAttribute('data-serial');
            const tagCode = decodeURIComponent(this.getAttribute('data-tagcode'));
            printTagCode(serialNumber, tagCode);
        });
    }
    
    return serialItem;
}

// Hide results
function hideResults() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('noResults').style.display = 'block';
}

// Print tag code to Zebra printer
async function printTagCode(serialNumber, tagCode) {
    const button = event.target.closest('.print-button');
    const originalContent = button.innerHTML;
    
    try {
        // Show loading state
        button.disabled = true;
        button.innerHTML = '<div class="spinner"></div> Printing...';
        updatePrinterStatus('Printing tag code for: ' + serialNumber, 'printing');

        // Create ZPL content
        const zplContent = tagCode;
        
        // Method 1: Try to print using WebUSB (if supported)
        if (navigator.usb) {
            await printViaWebUSB(zplContent);
        } else {
            // Method 2: Fallback to file download
            await printViaFileDownload(zplContent, serialNumber);
        }

        updatePrinterStatus('Tag code printed successfully for: ' + serialNumber, 'success');
        
    } catch (error) {
        console.error('Print error:', error);
        updatePrinterStatus('Print failed: ' + error.message, 'error');
        
        // Fallback to file download
        try {
            await printViaFileDownload(tagCode, serialNumber);
            updatePrinterStatus('ZPL file downloaded for: ' + serialNumber, 'success');
        } catch (fallbackError) {
            updatePrinterStatus('Print failed completely: ' + fallbackError.message, 'error');
        }
    } finally {
        // Restore button state
        button.disabled = false;
        button.innerHTML = originalContent;
    }
}

// Print via WebUSB (modern browsers)
async function printViaWebUSB(zplContent) {
    try {
        // Request access to USB device
        const device = await navigator.usb.requestDevice({
            filters: [
                { classCode: 7 }, // Printer class
                { vendorId: 0x05e0 }, // Zebra Technologies
                { vendorId: 0x0a5f }  // Zebra Technologies (alternative)
            ]
        });

        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);

        // Convert ZPL to bytes
        const encoder = new TextEncoder();
        const data = encoder.encode(zplContent);

        // Send data to printer
        await device.transferOut(1, data);
        
        await device.close();
        
    } catch (error) {
        throw new Error('WebUSB printing failed: ' + error.message);
    }
}

// Print via file download (fallback method)
async function printViaFileDownload(zplContent, serialNumber) {
    const blob = new Blob([zplContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tagcode_${serialNumber}_${Date.now()}.zpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

// Alternative printing method using raw socket (requires server)
async function printViaSocket(zplContent, printerIP = '192.168.1.100', printerPort = 9100) {
    try {
        // This would require a backend server to handle raw socket connections
        const response = await fetch('/api/print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                zpl: zplContent,
                printerIP: printerIP,
                printerPort: printerPort
            })
        });

        if (!response.ok) {
            throw new Error('Server printing failed');
        }
    } catch (error) {
        throw new Error('Socket printing failed: ' + error.message);
    }
}

// Update printer status
function updatePrinterStatus(message, type = 'info') {
    const statusText = document.getElementById('statusText');
    statusText.textContent = message;
    statusText.className = `status-${type}`;
}

// Utility function to format ZPL for display
function formatZPLForDisplay(zpl) {
    return zpl
        .replace(/\^XA/g, '^XA\n')
        .replace(/\^XZ/g, '\n^XZ')
        .replace(/\^FO/g, '\n^FO')
        .replace(/\^ADN/g, '\n^ADN')
        .replace(/\^FD/g, '\n^FD')
        .replace(/\^FS/g, '\n^FS')
        .trim();
}

// Clear search results
function clearResults() {
    document.getElementById('productionNumber').value = '';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('productionNumber').focus();
    updatePrinterStatus('Ready');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl + L to clear results
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        clearResults();
    }
    
    // Escape to clear input or close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('zplModal');
        if (modal && modal.style.display === 'flex') {
            closeZPLModal();
        } else {
            document.getElementById('productionNumber').value = '';
            document.getElementById('productionNumber').focus();
        }
    }
});

// Auto-refresh data every 5 minutes
setInterval(loadData, 300000);

// Show ZPL code in a modal
function showZPLCode(serialNumber, tagCode) {
    try {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('zplModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create new modal
        const modal = createZPLModal();
        document.body.appendChild(modal);
        
        // Wait a moment for the DOM to update
        setTimeout(() => {
            updateModalContent(modal, serialNumber, tagCode);
        }, 10);
        
    } catch (error) {
        console.error('Error in showZPLCode:', error);
        // Fallback to alert
        alert('ZPL Code for ' + serialNumber + ':\n\n' + formatZPLForDisplay(tagCode));
    }
}

// Helper function to update modal content
function updateModalContent(modal, serialNumber, tagCode) {
    // Update modal content
    const serialElement = document.getElementById('zplSerialNumber');
    const contentElement = document.getElementById('zplContent');
    const previewElement = document.getElementById('zplPreview');
    
    if (serialElement) {
        serialElement.textContent = serialNumber;
    } else {
        // Fallback to alert
        alert('ZPL Code for ' + serialNumber + ':\n\n' + formatZPLForDisplay(tagCode));
        return;
    }
    
    if (contentElement) {
        contentElement.textContent = formatZPLForDisplay(tagCode);
    } else {
        // Fallback to alert
        alert('ZPL Code for ' + serialNumber + ':\n\n' + formatZPLForDisplay(tagCode));
        return;
    }
    
    // Update preview
    if (previewElement) {
        previewElement.innerHTML = renderZPLPreview(tagCode);
    }
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Create ZPL modal
function createZPLModal() {
    const modal = document.createElement('div');
    modal.id = 'zplModal';
    modal.className = 'zpl-modal';
    modal.innerHTML = `
        <div class="zpl-modal-content">
            <div class="zpl-modal-header">
                <h3>ZPL Code for Serial: <span id="zplSerialNumber"></span></h3>
                <button class="zpl-close-btn">&times;</button>
            </div>
            <div class="zpl-modal-tabs">
                <button class="zpl-tab-btn active" data-tab="preview">Preview</button>
                <button class="zpl-tab-btn" data-tab="code">Raw Code</button>
            </div>
            <div class="zpl-modal-body">
                <div id="zplPreview" class="zpl-preview-container"></div>
                <pre id="zplContent" class="zpl-code-display" style="display: none;"></pre>
            </div>
            <div class="zpl-modal-footer">
                <button class="zpl-copy-btn">Copy ZPL</button>
                <button class="zpl-close-btn-secondary">Close</button>
            </div>
        </div>
    `;
    
    // Add event listeners for modal buttons
    const closeBtn = modal.querySelector('.zpl-close-btn');
    const closeBtnSecondary = modal.querySelector('.zpl-close-btn-secondary');
    const copyBtn = modal.querySelector('.zpl-copy-btn');
    const tabBtns = modal.querySelectorAll('.zpl-tab-btn');
    
    if (closeBtn) closeBtn.addEventListener('click', closeZPLModal);
    if (closeBtnSecondary) closeBtnSecondary.addEventListener('click', closeZPLModal);
    if (copyBtn) copyBtn.addEventListener('click', copyZPLCode);
    
    // Add tab switching functionality
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchZPLTab(tab);
        });
    });
    
    return modal;
}

// Close ZPL modal
function closeZPLModal() {
    const modal = document.getElementById('zplModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Copy ZPL code to clipboard
async function copyZPLCode() {
    const zplContent = document.getElementById('zplContent').textContent;
    try {
        await navigator.clipboard.writeText(zplContent);
        updatePrinterStatus('ZPL code copied to clipboard', 'success');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = zplContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        updatePrinterStatus('ZPL code copied to clipboard', 'success');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('zplModal');
    if (e.target === modal) {
        closeZPLModal();
    }
});

// Switch between preview and code tabs
function switchZPLTab(tab) {
    const previewContainer = document.getElementById('zplPreview');
    const codeContainer = document.getElementById('zplContent');
    const tabBtns = document.querySelectorAll('.zpl-tab-btn');
    
    // Update tab buttons
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        }
    });
    
    // Show/hide containers
    if (tab === 'preview') {
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }
        if (codeContainer) {
            codeContainer.style.display = 'none';
        }
    } else {
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        if (codeContainer) {
            codeContainer.style.display = 'block';
        }
    }
}

// Render ZPL preview
function renderZPLPreview(zplCode) {
    try {
        // Parse ZPL commands
        const elements = parseZPL(zplCode);
        
        // Create preview container
        let previewHTML = '<div class="zpl-preview-label">';
        
        // Render each element
        elements.forEach(element => {
            if (element.type === 'text') {
                previewHTML += `<div class="zpl-text-element" style="
                    position: absolute;
                    left: ${element.x}px;
                    top: ${element.y}px;
                    font-family: ${element.fontFamily};
                    font-size: ${element.fontSize}px;
                    font-weight: ${element.fontWeight};
                    color: #000;
                    white-space: nowrap;
                ">${element.text}</div>`;
            } else if (element.type === 'box') {
                previewHTML += `<div class="zpl-box-element" style="
                    position: absolute;
                    left: ${element.x}px;
                    top: ${element.y}px;
                    width: ${element.width}px;
                    height: ${element.height}px;
                    border: 1px solid #000;
                    background: transparent;
                "></div>`;
            }
        });
        
        previewHTML += '</div>';
        return previewHTML;
        
    } catch (error) {
        console.error('Error rendering ZPL preview:', error);
        return '<div class="zpl-preview-error">Unable to render preview. Please check the Raw Code tab.</div>';
    }
}

// Parse ZPL code into renderable elements
function parseZPL(zplCode) {
    const elements = [];
    const lines = zplCode.split('\n');
    
    // Default label dimensions (4" x 2" label)
    const labelWidth = 400; // pixels
    const labelHeight = 200; // pixels
    
    lines.forEach(line => {
        line = line.trim();
        
        // Parse ^FO (Field Origin) commands
        const foMatch = line.match(/\^FO(\d+),(\d+)/);
        if (foMatch) {
            const x = parseInt(foMatch[1]) * 2; // Convert dots to pixels (roughly)
            const y = parseInt(foMatch[2]) * 2;
            
            // Look for text content in ^FD commands
            const fdMatch = line.match(/\^FD(.+?)\^FS/);
            if (fdMatch) {
                const text = fdMatch[1];
                
                // Parse font information from ^ADN commands
                const adnMatch = line.match(/\^ADN,(\d+),(\d+)/);
                let fontSize = 12;
                let fontWeight = 'normal';
                
                if (adnMatch) {
                    fontSize = parseInt(adnMatch[1]) * 0.5; // Convert to pixels
                    if (parseInt(adnMatch[2]) > 20) {
                        fontWeight = 'bold';
                    }
                }
                
                elements.push({
                    type: 'text',
                    x: x,
                    y: y,
                    text: text,
                    fontSize: fontSize,
                    fontWeight: fontWeight,
                    fontFamily: 'Arial, sans-serif'
                });
            }
        }
        
        // Parse ^GB (Graphic Box) commands
        const gbMatch = line.match(/\^GB(\d+),(\d+),(\d+)/);
        if (gbMatch) {
            const width = parseInt(gbMatch[1]) * 2;
            const height = parseInt(gbMatch[2]) * 2;
            const thickness = parseInt(gbMatch[3]);
            
            // Find the position from previous ^FO command
            const lastElement = elements[elements.length - 1];
            if (lastElement && lastElement.type === 'text') {
                elements.push({
                    type: 'box',
                    x: lastElement.x,
                    y: lastElement.y,
                    width: width,
                    height: height,
                    thickness: thickness
                });
            }
        }
    });
    
    return elements;
}

// Test function
function testZPLFunction() {
    showZPLCode('TEST123', '^XA^FO50,50^ADN,36,20^FDTest Label^FS^FO50,100^ADN,18,10^FDProd: TEST123^FS^XZ');
}

// Export functions for testing
window.ZebraPrinterApp = {
    searchProductionNumber,
    printTagCode,
    clearResults,
    loadData,
    showZPLCode,
    testZPLFunction
};
