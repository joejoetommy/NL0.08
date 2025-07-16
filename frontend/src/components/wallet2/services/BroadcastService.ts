// BroadcastService.ts
// A service to handle transaction broadcasting with multiple fallback methods

export class BroadcastService {
  private network: string;
  
  constructor(network: string = 'main') {
    this.network = network === 'testnet' ? 'test' : 'main';
  }

  // Main broadcast method with multiple fallbacks
  async broadcast(txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> {
    console.log(`Broadcasting transaction to ${this.network}net...`);
    
    // Try each method in order
    const methods = [
      () => this.broadcastViaProxy(txHex),
      () => this.broadcastViaWhatsOnChain(txHex),
      () => this.broadcastViaPublicProxy(txHex),
      () => this.broadcastViaGorillaPool(txHex),
      () => this.broadcastViaTaal(txHex),
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result.success && result.txid) {
          return result;
        }
      } catch (error) {
        console.log('Broadcast method failed:', error);
      }
    }

    // All methods failed
    return {
      success: false,
      error: 'All broadcast methods failed. Please try manual broadcast.'
    };
  }

  // Local proxy (if running)
  private async broadcastViaProxy(txHex: string): Promise<{ success: boolean; txid?: string }> {
    try {
      const response = await fetch('http://localhost:3001/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHex, network: this.network })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Broadcast via local proxy successful');
          return { success: true, txid: result.txid };
        }
      }
    } catch (error) {
      // Proxy not available
    }
    return { success: false };
  }

  // WhatsOnChain API (might work from some networks)
  private async broadcastViaWhatsOnChain(txHex: string): Promise<{ success: boolean; txid?: string }> {
    try {
      const response = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/raw`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txhex: txHex }),
          mode: 'cors'
        }
      );

      if (response.ok) {
        const txid = (await response.text()).trim();
        if (txid.length === 64) {
          console.log('✅ Broadcast via WhatsOnChain successful');
          return { success: true, txid };
        }
      }
    } catch (error) {
      console.log('WhatsOnChain broadcast failed:', error);
    }
    return { success: false };
  }

  // GorillaPool API
  private async broadcastViaGorillaPool(txHex: string): Promise<{ success: boolean; txid?: string }> {
    if (this.network !== 'main') {
      return { success: false }; // GorillaPool is mainnet only
    }

    try {
      const response = await fetch('https://api.gorillapool.io/v1/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawtx: txHex })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.txid) {
          console.log('✅ Broadcast via GorillaPool successful');
          return { success: true, txid: result.txid };
        }
      }
    } catch (error) {
      console.log('GorillaPool broadcast failed:', error);
    }
    return { success: false };
  }

  // TAAL API (requires API key but sometimes works without)
  private async broadcastViaTaal(txHex: string): Promise<{ success: boolean; txid?: string }> {
    try {
      const response = await fetch('https://api.taal.com/api/v1/broadcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ rawTx: txHex })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.txid) {
          console.log('✅ Broadcast via TAAL successful');
          return { success: true, txid: result.txid };
        }
      }
    } catch (error) {
      console.log('TAAL broadcast failed:', error);
    }
    return { success: false };
  }

  // Use public CORS proxy for WhatsOnChain
  async broadcastViaPublicProxy(txHex: string): Promise<{ success: boolean; txid?: string }> {
    const corsProxies = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/raw?url=',
      'https://cors.bridged.cc/'
    ];

    const whatsOnChainUrl = encodeURIComponent(
      `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/raw`
    );

    for (const proxy of corsProxies) {
      try {
        console.log(`Trying CORS proxy: ${proxy}`);
        
        const response = await fetch(`${proxy}${whatsOnChainUrl}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ txhex: txHex })
        });

        if (response.ok) {
          const result = await response.text();
          const txid = result.trim();
          
          if (txid.length === 64) {
            console.log('✅ Broadcast via CORS proxy successful!');
            return { success: true, txid };
          }
        }
      } catch (error) {
        console.log(`CORS proxy ${proxy} failed:`, error);
      }
    }
    
    return { success: false };
  }
}