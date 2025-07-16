// broadcast-server.js
// Simple Express.js server to handle BSV transaction broadcasts
// This bypasses CORS issues when broadcasting from the browser

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allow all origins in development
app.use(express.json({ limit: '10mb' })); // Increase limit for large transactions

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BSV Broadcast Proxy is running' });
});

// Broadcast endpoint
app.post('/api/broadcast', async (req, res) => {
  try {
    const { txHex, network = 'main' } = req.body;
    
    if (!txHex) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing transaction hex' 
      });
    }

    // Validate hex
    if (!/^[0-9a-fA-F]+$/.test(txHex)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid hex format' 
      });
    }

    console.log(`Broadcasting transaction to ${network}net...`);
    console.log(`Transaction size: ${txHex.length / 2} bytes`);

    // Determine network
    const networkParam = network === 'testnet' || network === 'test' ? 'test' : 'main';
    
    // Try multiple broadcast endpoints
    const endpoints = [
      {
        name: 'WhatsOnChain',
        url: `https://api.whatsonchain.com/v1/bsv/${networkParam}/tx/raw`,
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: { txhex: txHex },
        extractTxid: (response) => {
          if (typeof response.data === 'string') {
            return response.data.trim();
          } else if (response.data.txid) {
            return response.data.txid;
          }
          return null;
        }
      }
    ];

    // Add testnet-specific endpoints
    if (networkParam === 'test') {
      endpoints.push({
        name: 'BSV Testnet Node',
        url: 'https://api.bitcoinsv.io/v1/txs/send',
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        data: { rawtx: txHex },
        extractTxid: (response) => response.data.txid
      });
    }

    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying ${endpoint.name}...`);
        
        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          headers: endpoint.headers,
          data: endpoint.data,
          timeout: 30000 // 30 second timeout
        });

        if (response.status === 200 || response.status === 201) {
          const txid = endpoint.extractTxid(response);
          
          if (txid && txid.length === 64) {
            console.log(`✅ Successfully broadcast via ${endpoint.name}: ${txid}`);
            
            return res.json({
              success: true,
              txid: txid,
              endpoint: endpoint.name,
              network: networkParam
            });
          }
        }
      } catch (error) {
        console.error(`❌ ${endpoint.name} failed:`, error.message);
        
        // Log more details for debugging
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          
          // Check for specific error messages
          if (error.response.data) {
            const errorData = error.response.data;
            if (typeof errorData === 'string') {
              if (errorData.includes('txn-already-known') || errorData.includes('already in block chain')) {
                console.log('Transaction already broadcast');
                // Extract txid from the transaction hex
                const txidMatch = txHex.match(/^[0-9a-f]{64}/i);
                if (txidMatch) {
                  return res.json({
                    success: true,
                    txid: txidMatch[0],
                    endpoint: endpoint.name,
                    network: networkParam,
                    note: 'Transaction already in blockchain'
                  });
                }
              }
              if (errorData.includes('Missing inputs') || errorData.includes('bad-txns-inputs-missingorspent')) {
                console.error('Transaction has missing or already spent inputs');
                return res.status(400).json({
                  success: false,
                  error: 'Transaction inputs are missing or already spent. Please refresh your wallet and try again.'
                });
              }
            }
          }
        }
      }
    }

    // If all endpoints failed
    console.error('All broadcast attempts failed');
    
    res.status(503).json({
      success: false,
      error: 'Failed to broadcast transaction to any endpoint',
      suggestion: 'Try again later or broadcast manually at https://whatsonchain.com/broadcast'
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get transaction details (useful for verification)
app.get('/api/tx/:txid', async (req, res) => {
  try {
    const { txid } = req.params;
    const { network = 'main' } = req.query;
    
    const networkParam = network === 'testnet' || network === 'test' ? 'test' : 'main';
    
    const response = await axios.get(
      `https://api.whatsonchain.com/v1/bsv/${networkParam}/tx/${txid}`
    );
    
    res.json({
      success: true,
      tx: response.data
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Transaction not found'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BSV Broadcast Proxy Server running on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/broadcast`);
  console.log(`   GET  http://localhost:${PORT}/api/tx/:txid`);
  console.log(`   GET  http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

// --- INSTRUCTIONS TO RUN ---
// 1. Save this file as broadcast-server.js
// 2. Create package.json with:
/*
{
  "name": "bsv-broadcast-proxy",
  "version": "1.0.0",
  "description": "BSV Transaction Broadcast Proxy",
  "main": "broadcast-server.js",
  "scripts": {
    "start": "node broadcast-server.js",
    "dev": "nodemon broadcast-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/
// 3. Run: npm install
// 4. Run: npm start (or npm run dev for auto-reload)